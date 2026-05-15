import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retry-count",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const { user_id, amount } = await req.json();
  if (!user_id || !amount || amount <= 0) return new Response(JSON.stringify({ error: "invalid params" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  // Vérifier le solde du wallet
  const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user_id).maybeSingle();
  if (!wallet || Number(wallet.balance) < amount) return new Response(JSON.stringify({ error: "solde insuffisant" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  // Vérifier que le helper a un compte Stripe
  const { data: profile } = await supabase.from("profiles").select("stripe_account_id").eq("id", user_id).maybeSingle();
  const stripeAccountId = profile?.stripe_account_id;
  if (!stripeAccountId) return new Response(JSON.stringify({ error: "no_stripe_account", message: "Configure ton compte Stripe dans Paramètres > Paiements" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  // Transférer vers le compte Stripe du helper
  const montantCents = Math.round(amount * 100);
  const transfer = await stripe.transfers.create({
    amount: montantCents,
    currency: "eur",
    destination: stripeAccountId,
    transfer_group: `withdraw_${user_id}`,
  });

  // Déduire du wallet
  await supabase
    .from("wallets")
    .update({ balance: Number(wallet.balance) - amount, updated_at: new Date().toISOString() })
    .eq("user_id", user_id);

  await supabase.from("wallet_transactions").insert({
    user_id,
    type: "withdrawal",
    amount: -amount,
    reference: transfer.id,
    description: "Retrait vers compte bancaire",
  });

  return new Response(JSON.stringify({ success: true, transfer_id: transfer.id }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
});
