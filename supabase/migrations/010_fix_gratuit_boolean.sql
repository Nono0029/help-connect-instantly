-- Fix: gratuit column was text but code uses boolean
-- PostgreSQL stores boolean false as string "false" in text column,
-- which is truthy in JS, so "Gratuit" always shows

-- First convert existing text values to proper booleans
UPDATE demandes SET gratuit = 'false' WHERE gratuit IS NULL OR gratuit = '';
UPDATE demandes SET gratuit = 'true' WHERE gratuit = 'true';

-- Then alter the column type
ALTER TABLE demandes ALTER COLUMN gratuit TYPE boolean USING (gratuit::boolean);
ALTER TABLE demandes ALTER COLUMN gratuit SET DEFAULT false;
ALTER TABLE demandes ALTER COLUMN gratuit SET NOT NULL;
