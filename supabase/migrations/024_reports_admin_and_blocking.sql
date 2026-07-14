-- =====================================
-- Reports (signals) admin review + auto-blocking after 5 confirmed reports
-- =====================================

-- 1. Who is being reported, and account status
ALTER TABLE signals ADD COLUMN IF NOT EXISTS reported_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

-- Backfill reported_id for existing signals from their mission (the other participant)
UPDATE signals s
SET reported_id = CASE
  WHEN m.reporter_helper THEN m.demandeur_id
  ELSE m.helper_id
END
FROM (
  SELECT missions.id, missions.helper_id, missions.demandeur_id,
         (signals.reporter_id = missions.helper_id) AS reporter_helper,
         signals.id AS signal_id
  FROM missions
  JOIN signals ON signals.mission_id = missions.id
) m
WHERE s.id = m.signal_id AND s.reported_id IS NULL;

-- 2. Admins can see and update every report; reporters keep seeing only their own
DROP POLICY IF EXISTS "signals_select" ON signals;
CREATE POLICY "signals_select" ON signals FOR SELECT USING (
  reporter_id = auth.uid()::text
  OR reported_id = auth.uid()::text
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

DROP POLICY IF EXISTS "signals_update_admin" ON signals;
CREATE POLICY "signals_update_admin" ON signals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- 3. Auto-block a user once they reach 5 CONFIRMED reports against them
CREATE OR REPLACE FUNCTION handle_signal_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  confirmed_count INT;
BEGIN
  IF NEW.statut = 'confirme' AND (OLD.statut IS DISTINCT FROM 'confirme') AND NEW.reported_id IS NOT NULL THEN
    SELECT COUNT(*) INTO confirmed_count
    FROM signals
    WHERE reported_id = NEW.reported_id AND statut = 'confirme';

    IF confirmed_count >= 5 THEN
      UPDATE profiles SET blocked = true, blocked_at = now() WHERE id::text = NEW.reported_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_signal_confirmed ON signals;
CREATE TRIGGER on_signal_confirmed
  AFTER UPDATE ON signals
  FOR EACH ROW
  EXECUTE FUNCTION handle_signal_confirmed();

-- 4. Admins can read/update every profile (needed to unblock users, grant admin, etc.)
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);

-- =====================================
-- IMPORTANT (manual step): grant yourself admin access by running, in the
-- SQL editor, with your own account's UUID:
--   UPDATE profiles SET is_admin = true WHERE id = '<your-user-id>';
-- =====================================
