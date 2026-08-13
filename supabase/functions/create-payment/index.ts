import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ALLOWED_ORIGINS = ["https://askoo.fr", "https://www.askoo.fr", "https://help-connect-instantly.vercel.app"];

const parseEuroAmount = (value: unknown) => {
  const parsed = parseFloat(String(value || "").replace(/[^0-9.,]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = origin || "*";

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

    const { mission_id, conversation_id } = body;
    if (!mission_id) return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { data: mission } = await supabase.from("missions").select("*, demandes(*)").eq("id", mission_id).maybeSingle();
    if (!mission) return new Response(JSON.stringify({ error: "mission not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    if (mission.demandeur_id !== user.id) {
      return new Response(JSON.stringify({ error: "only the requester can initiate payment" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: paidPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("mission_id", mission_id)
      .in("statut", ["payé", "termine"])
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paidPayment) {
      return new Response(JSON.stringify({ error: "payment already completed" }), { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const prix = parseEuroAmount(mission.demandes?.prix);

    if (prix <= 0) {
      return new Response(
        JSON.stringify({ error: "free mission — no payment needed" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const createdAt = mission.demandes?.created_at;
    const urgentFlag = mission.demandes?.urgent === true || mission.demandes?.urgent === "true";
    const urgentActive = urgentFlag
      && !!createdAt
      && (Date.now() - new Date(createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000;

    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("boost_until, referred_by, referral_fee_used")
      .eq("id", user.id)
      .maybeSingle();
    const requesterBoosted = !!requesterProfile?.boost_until
      && new Date(requesterProfile.boost_until).getTime() > Date.now();

    const referralExempt = !!requesterProfile?.referred_by && !requesterProfile?.referral_fee_used;

    const isUrgentBillable = urgentActive && !requesterBoosted;
    const totalFees = referralExempt ? 0 : (isUrgentBillable ? 3 : 2);
    const totalCents = Math.round((prix + totalFees) * 100);

    let convId = conversation_id;
    if (!convId) {
      const { data: conv } = await supabase.from("conversations").select("id").eq("demande_id", mission.demande_id).maybeSingle();
      convId = conv?.id;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: {
        mission_id: mission_id.toString(),
        helper_id: mission.helper_id || "",
        payeur_id: user.id,
        conversation_id: convId?.toString() || "",
      },
    });

    const { error: insertErr } = await supabase.from("payments").insert({
      mission_id,
      payeur_id: user.id,
      helper_id: mission.helper_id,
      stripe_payment_intent: paymentIntent.id,
      montant: prix,
      frais: totalFees,
      statut: "en_attente",
    });
    if (insertErr) {
      console.error("payments insert error:", insertErr);
      return new Response(JSON.stringify({ error: `db insert failed: ${insertErr.message}` }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      amount: totalCents / 100,
    }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (err: any) {
    console.error("create-payment error:", err?.message || err);
    console.error("create-payment stack:", err?.stack);
    const detail = err?.message || String(err);
    return new Response(JSON.stringify({ error: `internal server error: ${detail}` }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
