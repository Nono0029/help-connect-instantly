-- Fix: gratuit column was text but code uses boolean

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demandes' AND column_name='gratuit' AND data_type='text') THEN
    -- First convert existing text values to proper booleans
    UPDATE demandes SET gratuit = 'false' WHERE gratuit IS NULL OR gratuit = '';
    UPDATE demandes SET gratuit = 'true' WHERE gratuit = 'true';

    -- Then alter the column type
    ALTER TABLE demandes ALTER COLUMN gratuit TYPE boolean USING (gratuit::boolean);
    ALTER TABLE demandes ALTER COLUMN gratuit SET DEFAULT false;
    ALTER TABLE demandes ALTER COLUMN gratuit SET NOT NULL;
  END IF;
END $$;
