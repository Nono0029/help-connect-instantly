-- Fonction pour supprimer une demande + toutes ses dépendances
-- SECURITY DEFINER = s'exécute avec les droits du propriétaire (bypass RLS)
CREATE OR REPLACE FUNCTION delete_demande(target_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'utilisateur est bien le propriétaire
  IF NOT EXISTS (SELECT 1 FROM demandes WHERE id = target_id AND user_id::text = auth.uid()::text) THEN
    RAISE EXCEPTION 'Vous n''êtes pas le propriétaire de cette demande';
  END IF;

  -- Supprimer messages + notifications liés aux conversations
  DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE demande_id = target_id);
  DELETE FROM notifications WHERE conversation_id IN (SELECT id FROM conversations WHERE demande_id = target_id);

  -- Supprimer paiements + avis liés aux missions
  DELETE FROM payments WHERE mission_id IN (SELECT id FROM missions WHERE demande_id = target_id);
  DELETE FROM avis WHERE mission_id IN (SELECT id FROM missions WHERE demande_id = target_id);

  -- Supprimer missions, conversations, et la demande
  DELETE FROM missions WHERE demande_id = target_id;
  DELETE FROM conversations WHERE demande_id = target_id;
  DELETE FROM demandes WHERE id = target_id;

  RETURN TRUE;
END;
$$;
