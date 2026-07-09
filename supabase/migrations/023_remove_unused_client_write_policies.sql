-- =====================================
-- SECURITY: remove client-side write policies that the app never uses
-- but that RLS still allowed via direct API calls (devtools/curl).
-- =====================================

-- 1. PAYMENTS: statut/montant/frais must only ever change via the Stripe
--    webhook / edge function (service_role, bypasses RLS). The app only
--    ever SELECTs from payments — it never updates it. Allowing
--    payeur_id/helper_id to UPDATE any column let either party tamper with
--    payment status or amount directly.
DROP POLICY IF EXISTS "payments_update" ON payments;

-- 2. WALLET_TRANSACTIONS: the app only reads this table (transaction
--    history), it is written exclusively by credit_wallet() (SECURITY
--    DEFINER) and edge functions. Allowing authenticated users to INSERT
--    their own rows let anyone forge fake "credit" history entries.
DROP POLICY IF EXISTS "wallet_transactions_insert" ON wallet_transactions;
