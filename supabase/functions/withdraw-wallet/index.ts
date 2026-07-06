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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "missing authorization" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  const { amount } = await req.json();
  if (!amount || amount <= 0) return new Response(JSON.stringify({ error: "invalid params" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  const user_id = user.id;

  const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user_id).maybeSingle();
  if (!wallet || Number(wallet.balance) < amount) return new Response(JSON.stringify({ error: "solde insuffisant" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  const { data: profile } = await supabase.from("profiles").select("stripe_account_id").eq("id", user_id).maybeSingle();
  const stripeAccountId = profile?.stripe_account_id;
  if (!stripeAccountId) return new Response(JSON.stringify({ error: "no_stripe_account", message: "Configure ton compte Stripe dans Paramètres > Paiements" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  const montantCents = Math.round(amount * 100);
  const transfer = await stripe.transfers.create({
    amount: montantCents,
    currency: "eur",
    destination: stripeAccountId,
    transfer_group: `withdraw_${user_id}`,
  });

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
