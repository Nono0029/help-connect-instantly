-- =====================================
-- CRITICAL SECURITY FIXES
-- =====================================

-- 1. WALLETS: currently any authenticated user can UPDATE their own wallet row
--    directly via the client (e.g. set balance to any value). Balance must
--    only ever change through the SECURITY DEFINER credit_wallet() function
--    or edge functions running with the service_role key.
DROP POLICY IF EXISTS "wallets_update" ON wallets;
-- No client-side update policy is (re)created: only service_role (edge
-- functions, SECURITY DEFINER functions) can now modify wallet balances.

-- 2. MESSAGES: messages_insert only checked sender_id = auth.uid(), without
--    verifying the sender actually belongs to the target conversation. This
--    allowed any authenticated user to insert messages into conversations
--    they are not part of.
DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id::text = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.helper_id::text = auth.uid()::text
        OR conversations.demandeur_id::text = auth.uid()::text
      )
    )
  );
