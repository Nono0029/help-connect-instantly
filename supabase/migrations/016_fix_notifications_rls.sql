-- =====================================
-- FIX notifications RLS: allow users to insert their own notifications
-- =====================================

-- Drop the existing notifications_insert policy (if any)
DROP POLICY IF EXISTS "notifications_insert" ON notifications;

-- Create a new policy that allows authenticated users to insert notifications ONLY for themselves
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Keep the SELECT policy as-is (users can only read their own notifications)
-- The existing notifications_select policy from 008_rls_fix.sql already handles this:
-- FOR SELECT USING (user_id::text = auth.uid()::text)