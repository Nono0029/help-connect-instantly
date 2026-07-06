-- Add boost_until column to profiles for the boost feature
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS boost_until timestamptz;
