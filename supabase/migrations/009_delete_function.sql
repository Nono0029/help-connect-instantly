-- Fonction pour supprimer une demande + toutes ses dépendances
-- SECURITY DEFINER = s'exécute avec les droits du propriétaire (bypass RLS)
CREATE OR REPLACE FUNCTION delete_demande(demande_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv RECORD;
  mis RECORD;
BEGIN
  -- Vérifier que l'utilisateur est bien le propriétaire
  IF NOT EXISTS (SELECT 1 FROM demandes WHERE id = demande_id AND user_id::text = auth.uid()::text) THEN
    RAISE EXCEPTION 'Vous n''êtes pas le propriétaire de cette demande';
  END IF;

  -- Parcourir les conversations liées
  FOR conv IN SELECT id FROM conversations WHERE demande_id = delete_demande.demande_id LOOP
    DELETE FROM messages WHERE conversation_id = conv.id;
    DELETE FROM notifications WHERE conversation_id = conv.id;
  END LOOP;

  -- Supprimer les missions et paiements
  FOR mis IN SELECT id FROM missions WHERE demande_id = delete_demande.demande_id LOOP
    DELETE FROM payments WHERE mission_id = mis.id;
    DELETE FROM avis WHERE mission_id = mis.id;
  END LOOP;

  DELETE FROM missions WHERE demande_id = delete_demande.demande_id;
  DELETE FROM conversations WHERE demande_id = delete_demande.demande_id;
  DELETE FROM demandes WHERE id = delete_demande.demande_id;

  RETURN TRUE;
END;
$$;
