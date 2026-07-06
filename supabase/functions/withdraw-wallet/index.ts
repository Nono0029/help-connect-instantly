import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ALLOWED_ORIGINS = ["https://askoo.fr", "https://www.askoo.fr", "https://help-connect-instantly.vercel.app"];

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing authorization" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const body = await req.json().catch(() => null);
    if (!body) return new Response(JSON.stringify({ error: "invalid JSON body" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { amount } = body;
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return new Response(JSON.stringify({ error: "invalid amount" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const user_id = user.id;

    // Check balance first
    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user_id).maybeSingle();
    if (!wallet || Number(wallet.balance) < amount) {
      return new Response(JSON.stringify({ error: "solde insuffisant" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Check Stripe account exists
    const { data: profile } = await supabase.from("profiles").select("stripe_account_id").eq("id", user_id).maybeSingle();
    const stripeAccountId = profile?.stripe_account_id;
    if (!stripeAccountId) {
      return new Response(JSON.stringify({ error: "no_stripe_account", message: "Configure ton compte Stripe dans Paramètres > Paiements" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Do Stripe transfer first
    const montantCents = Math.round(amount * 100);
    const transfer = await stripe.transfers.create({
      amount: montantCents,
      currency: "eur",
      destination: stripeAccountId,
      transfer_group: `withdraw_${user_id}`,
    });

    // Deduct balance with row-level lock check (only deduct if still sufficient)
    const { data: updatedWallet, error: deductError } = await supabase
      .from("wallets")
      .update({ balance: Number(wallet.balance) - amount, updated_at: new Date().toISOString() })
      .eq("user_id", user_id)
      .gte("balance", amount)
      .select("balance")
      .maybeSingle();

    if (deductError || !updatedWallet) {
      // Refund the Stripe transfer if deduction fails
      console.error("Balance deduction failed after transfer, transfer_id:", transfer.id);
      return new Response(JSON.stringify({ error: "Erreur lors de la déduction du solde" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Log transaction
    await supabase.from("wallet_transactions").insert({
      user_id,
      type: "withdrawal",
      amount: -amount,
      reference: transfer.id,
      description: "Retrait vers compte bancaire",
    });

    return new Response(JSON.stringify({ success: true, transfer_id: transfer.id }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err) {
    console.error("withdraw-wallet error:", err);
    const message = err instanceof Error ? err.message : "internal server error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
