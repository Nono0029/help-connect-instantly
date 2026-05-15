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

  const { mission_id } = await req.json();
  if (!mission_id) return new Response(JSON.stringify({ error: "missing mission_id" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("mission_id", mission_id)
    .eq("statut", "pay\u00e9")
    .maybeSingle();

  if (!payment) return new Response(JSON.stringify({ error: "no payment found or already released" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  const { data: mission } = await supabase
    .from("missions")
    .select("*, profiles!inner(stripe_account_id)")
    .eq("id", mission_id)
    .maybeSingle();

  const helperAccountId = (mission as any)?.profiles?.stripe_account_id;
  if (!helperAccountId) {
    return new Response(JSON.stringify({ error: "helper has no Stripe account" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  const montantCents = Math.round(Number(payment.montant) * 100);

  // Create a Stripe transfer from platform to helper's connected account
  const transfer = await stripe.transfers.create({
    amount: montantCents,
    currency: "eur",
    destination: helperAccountId,
    transfer_group: `mission_${mission_id}`,
  });

  // Update payment: released
  await supabase
    .from("payments")
    .update({
      statut: "termine",
      released_at: new Date().toISOString(),
      stripe_payment_intent: payment.stripe_payment_intent,
    })
    .eq("id", payment.id);

  return new Response(JSON.stringify({ success: true, transfer_id: transfer.id }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
});
