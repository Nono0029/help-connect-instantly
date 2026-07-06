-- Add missing columns to profiles table
-- bio, skills, boost_until, last_seen

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS boost_until timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen timestamptz;
