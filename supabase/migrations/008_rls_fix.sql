-- =====================================
-- FIX RLS POLICIES pour toutes les tables
-- =====================================

-- 1. PROFILES (id est UUID)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- 2. DEMANDES (user_id est TEXT)
ALTER TABLE demandes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demandes_select" ON demandes;
DROP POLICY IF EXISTS "demandes_insert" ON demandes;
DROP POLICY IF EXISTS "demandes_update" ON demandes;
DROP POLICY IF EXISTS "demandes_delete" ON demandes;

CREATE POLICY "demandes_select" ON demandes
  FOR SELECT USING (true);

CREATE POLICY "demandes_insert" ON demandes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "demandes_update" ON demandes
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "demandes_delete" ON demandes
  FOR DELETE USING (auth.uid()::text = user_id);

-- 3. CONVERSATIONS (helper_id, demandeur_id, demande_user_id sont TEXT)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;

CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (
    auth.uid()::text = helper_id
    OR auth.uid()::text = demandeur_id
    OR auth.uid()::text = demande_user_id
  );

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (auth.uid()::text = helper_id);

CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (
    auth.uid()::text = helper_id
    OR auth.uid()::text = demandeur_id
  );

-- 4. MESSAGES (sender_id TEXT, conversation_id BIGINT)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.helper_id = auth.uid()::text
        OR conversations.demandeur_id = auth.uid()::text
        OR conversations.demande_user_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid()::text);

-- 5. MISSIONS (helper_id, demandeur_id TEXT)
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "missions_select" ON missions;
DROP POLICY IF EXISTS "missions_insert" ON missions;
DROP POLICY IF EXISTS "missions_update" ON missions;

CREATE POLICY "missions_select" ON missions
  FOR SELECT USING (
    helper_id = auth.uid()::text
    OR demandeur_id = auth.uid()::text
  );

CREATE POLICY "missions_insert" ON missions
  FOR INSERT WITH CHECK (
    helper_id = auth.uid()::text
    OR demandeur_id = auth.uid()::text
  );

CREATE POLICY "missions_update" ON missions
  FOR UPDATE USING (
    helper_id = auth.uid()::text
    OR demandeur_id = auth.uid()::text
  );

-- 6. NOTIFICATIONS (user_id TEXT)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;

CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (user_id = auth.uid()::text);

-- 7. AVIS (auteur_id, cible_id TEXT)
ALTER TABLE avis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avis_select" ON avis;
DROP POLICY IF EXISTS "avis_insert" ON avis;

CREATE POLICY "avis_select" ON avis
  FOR SELECT USING (true);

CREATE POLICY "avis_insert" ON avis
  FOR INSERT WITH CHECK (auteur_id = auth.uid()::text);

-- 8. Colonnes manquantes
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS demande_user_id TEXT;
