-- Add pro-related columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_status text DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS competences text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tarif_horaire numeric;
