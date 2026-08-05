-- ============================================================
-- AMÉLIORATION INSCRIPTION + PARRAINAGE
--
-- 1. Colonnes de parrainage manquantes : ref_code, referred_by,
--    referral_fee_used (utilisées par le code client et les edge
--    functions mais jamais créées par une migration) + email_verifie
--    (lue par AuthContext).
--
-- 2. FAILLE SÉCURITÉ corrigée : la policy "profiles_update" autorise
--    chaque utilisateur à modifier SA PROPRE ligne de profile sans
--    restriction de colonne. Sans protection, n'importe qui pouvait
--    s'écrire referred_by = (n'importe qui) pour bénéficier de la
--    première demande SANS frais. Ces 3 colonnes sont désormais figées
--    côté client (même mécanisme que boost_until dans 027) : seul un
--    appel backend de confiance (edge function apply-referral via
--    service_role, auth.uid() NULL) peut les écrire.
--
-- 3. ref_code généré automatiquement à la création de chaque profil
--    (jamais vide : la page Invitation partageait un code vide).
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ref_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_fee_used BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verifie BOOLEAN DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_ref_code_unique
  ON profiles (ref_code)
  WHERE ref_code IS NOT NULL;

-- Génération automatique du code de parrainage (6 caractères, uppercase)
CREATE OR REPLACE FUNCTION generate_profile_ref_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
BEGIN
  IF NEW.ref_code IS NOT NULL AND NEW.ref_code <> '' THEN
    RETURN NEW;
  END IF;

  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE ref_code = new_code);
  END LOOP;

  NEW.ref_code := new_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS generate_profile_ref_code_trigger ON profiles;
CREATE TRIGGER generate_profile_ref_code_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_profile_ref_code();

-- Étend la protection de 027 aux colonnes de parrainage :
-- seuls le backend (service_role, edge functions) ou un admin peuvent les écrire.
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

  -- Tout le monde d'autre : ces colonnes restent figées à leur valeur
  -- précédente, quoi que la requête ait essayé d'y mettre. Le reste de
  -- la mise à jour (pseudo, avatar, iban, bio...) s'applique normalement.
  NEW.is_admin := OLD.is_admin;
  NEW.blocked := OLD.blocked;
  NEW.blocked_at := OLD.blocked_at;
  NEW.boost_until := OLD.boost_until;
  NEW.ref_code := OLD.ref_code;
  NEW.referred_by := OLD.referred_by;
  NEW.referral_fee_used := OLD.referral_fee_used;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns_trigger ON profiles;
CREATE TRIGGER protect_profile_privileged_columns_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_privileged_columns();

-- Rattrapage : les profils existants n'ont pas encore de code de
-- parrainage. Le trigger de génération s'exécute aussi sur UPDATE,
-- donc un UPDATE no-op suffit à tous les remplir.
UPDATE profiles SET ref_code = ref_code WHERE ref_code IS NULL;
