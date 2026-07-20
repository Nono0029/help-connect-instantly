-- ============================================================
-- FAILLE CRITIQUE : la policy "profiles_update" (008_rls_fix.sql)
-- autorise chaque utilisateur à modifier N'IMPORTE QUELLE colonne
-- de SA PROPRE ligne dans `profiles`, sans restriction de colonne
-- (USING (id = auth.uid()), pas de WITH CHECK).
--
-- Quand 024_reports_admin_and_blocking.sql a ajouté les colonnes
-- is_admin / blocked / blocked_at, la policy "profiles_update_admin"
-- créée à côté ne REMPLACE PAS la policy existante "profiles_update" :
-- en RLS Postgres, plusieurs policies permissives sur la même
-- commande (UPDATE) se combinent avec OR. Résultat concret : N'IMPORTE
-- QUEL compte peut s'auto-promouvoir admin avec une seule requête :
--
--   supabase.from('profiles').update({ is_admin: true }).eq('id', monId)
--
-- ...et accéder ensuite à AdminReportsPage, débloquer n'importe quel
-- compte, etc. Le même trou permet aussi à un utilisateur bloqué de se
-- débloquer lui-même, et à quiconque de s'offrir un boost gratuit en
-- écrivant boost_until directement (au lieu de passer par Stripe).
--
-- FIX : un trigger empêche is_admin / blocked / blocked_at / boost_until
-- de changer via une requête client, sauf si l'appelant est déjà admin
-- (vérifié côté serveur, pas déclaré par le client) ou un appel backend
-- de confiance (service_role, où auth.uid() est NULL — ex: le webhook
-- Stripe qui pose boost_until). Les autres colonnes du profil restent
-- librement modifiables par leur propriétaire.
-- ============================================================

CREATE OR REPLACE FUNCTION protect_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  -- Appels backend de confiance (service_role : edge functions, webhook
  -- Stripe...) n'ont pas de contexte JWT utilisateur — toujours autorisés.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- L'appelant est-il DÉJÀ admin, vérifié depuis la base (jamais depuis
  -- la requête du client) ?
  SELECT is_admin INTO caller_is_admin FROM profiles WHERE id = auth.uid();

  IF COALESCE(caller_is_admin, false) THEN
    RETURN NEW; -- un admin peut légitimement débloquer / promouvoir quelqu'un
  END IF;

  -- Tout le monde d'autre : ces 4 colonnes restent figées à leur valeur
  -- précédente, quoi que la requête ait essayé d'y mettre. Le reste de
  -- la mise à jour (pseudo, avatar, iban, bio...) s'applique normalement.
  NEW.is_admin := OLD.is_admin;
  NEW.blocked := OLD.blocked;
  NEW.blocked_at := OLD.blocked_at;
  NEW.boost_until := OLD.boost_until;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns_trigger ON profiles;
CREATE TRIGGER protect_profile_privileged_columns_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_privileged_columns();
