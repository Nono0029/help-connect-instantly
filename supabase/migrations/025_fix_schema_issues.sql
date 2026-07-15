-- 025_fix_schema_issues.sql
-- Fix broken index on notifications (column is 'lu', not 'read')
DROP INDEX IF EXISTS idx_notifications_read;
CREATE INDEX IF NOT EXISTS idx_notifications_lu ON notifications(lu);

-- Add notif_prefs column to profiles (was used in code but never created)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_prefs jsonb DEFAULT '{"push":true,"email":false}'::jsonb;

-- Fix notification insert policy: also validate user_id matches a conversation participant
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (
    conversation_id IS NOT NULL
    AND user_id IN (
      SELECT conversations.helper_id::text FROM conversations WHERE conversations.id = notifications.conversation_id
      UNION
      SELECT conversations.demandeur_id::text FROM conversations WHERE conversations.id = notifications.conversation_id
    )
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = notifications.conversation_id
      AND (conversations.helper_id::text = auth.uid()::text OR conversations.demandeur_id::text = auth.uid()::text)
    )
  );
