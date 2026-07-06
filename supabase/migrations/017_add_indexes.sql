-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_demandes_user_id ON demandes(user_id);
CREATE INDEX IF NOT EXISTS idx_demandes_created_at ON demandes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_conversations_helper ON conversations(helper_id);
CREATE INDEX IF NOT EXISTS idx_conversations_demandeur ON conversations(demandeur_id);
CREATE INDEX IF NOT EXISTS idx_conversations_demande_id ON conversations(demande_id);
CREATE INDEX IF NOT EXISTS idx_missions_demande ON missions(demande_id);
CREATE INDEX IF NOT EXISTS idx_missions_statut ON missions(statut);
