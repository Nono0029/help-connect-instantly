-- =====================================
-- FIX: la migration 016 a cassé toutes les notifications entre utilisateurs
-- (elle n'autorisait à insérer une notif que pour soi-même, alors que le code
-- notifie toujours l'AUTRE participant d'une conversation : messages, mission
-- acceptée/refusée/terminée, etc. ne notifiaient plus personne)
-- =====================================
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (
    conversation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = notifications.conversation_id
      AND (conversations.helper_id::text = auth.uid()::text OR conversations.demandeur_id::text = auth.uid()::text)
    )
  );

-- =====================================
-- Paiement des prestataires par virement bancaire manuel (remplace Stripe Connect)
-- =====================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_holder_name TEXT;

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL NOT NULL,
  iban TEXT NOT NULL,
  bank_holder_name TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "withdrawal_requests_select" ON withdrawal_requests;
CREATE POLICY "withdrawal_requests_select" ON withdrawal_requests
  FOR SELECT USING (user_id::text = auth.uid()::text);
