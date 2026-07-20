-- ============================================================
-- FIX: race condition permettant de créditer un wallet 2x pour
-- le même événement (ex: double-clic sur "confirmer la mission"
-- déclenchant 2 appels concurrents à release-payment, qui
-- appellent tous les deux credit_wallet avant que le premier
-- n'ait fini d'écrire). credit_wallet() n'avait aucune protection
-- d'idempotence : chaque appel incrémentait le solde, sans jamais
-- vérifier si cette référence avait déjà été créditée.
-- ============================================================

-- Chaque référence ne doit être créditée qu'une seule fois.
-- Les lignes avec reference NULL restent autorisées en plusieurs
-- exemplaires (comportement standard de UNIQUE sur NULL).
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_reference_unique
  ON wallet_transactions (reference)
  WHERE reference IS NOT NULL;

CREATE OR REPLACE FUNCTION credit_wallet(p_user_id TEXT, p_amount DECIMAL, p_reference TEXT, p_description TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fast path : cette référence a déjà été créditée, on ne refait rien.
  IF p_reference IS NOT NULL AND EXISTS (
    SELECT 1 FROM wallet_transactions WHERE reference = p_reference
  ) THEN
    RETURN TRUE;
  END IF;

  INSERT INTO wallets (user_id, balance) VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + p_amount, updated_at = now();

  INSERT INTO wallet_transactions (user_id, type, amount, reference, description)
  VALUES (p_user_id, 'credit', p_amount, p_reference, p_description);

  RETURN TRUE;
EXCEPTION
  WHEN unique_violation THEN
    -- Deux appels concurrents ont passé le "fast path" ci-dessus en même
    -- temps (vraie condition de course). Celui qui perd la course reçoit
    -- une violation de contrainte unique ici : PL/pgSQL annule automatiquement
    -- TOUT ce bloc (y compris le crédit du solde juste au-dessus) avant
    -- d'exécuter ce handler. Donc pas de double-crédit possible.
    RETURN TRUE;
END;
$$;
