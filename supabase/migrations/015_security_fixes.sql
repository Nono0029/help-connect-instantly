-- =====================================
-- FIX SÉCURITÉ: credit_wallet + notifications
-- =====================================

-- 1. RESTRICTION credit_wallet: seul le service_role peut l'appeler
-- Les edge functions utilisent le service_role key, donc elles peuvent encore l'appeler
REVOKE EXECUTE ON FUNCTION credit_wallet(TEXT, DECIMAL, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION credit_wallet(TEXT, DECIMAL, TEXT, TEXT) FROM anon;

-- 2. FIX notifications_insert: empêcher l'injection de notifications par des utilisateurs
-- Seul le service_role (edge functions) peut insérer des notifications
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (false);
