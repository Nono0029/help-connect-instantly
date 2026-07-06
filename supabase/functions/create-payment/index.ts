import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ALLOWED_ORIGINS = ["https://askoo.fr", "https://help-connect-instantly.vercel.app"];

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

    const { mission_id, conversation_id } = body;
    if (!mission_id) return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { data: mission } = await supabase.from("missions").select("*, demandes(*)").eq("id", mission_id).maybeSingle();
    if (!mission) return new Response(JSON.stringify({ error: "mission not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    if (mission.demandeur_id !== user.id) {
      return new Response(JSON.stringify({ error: "only the requester can initiate payment" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Prevent duplicate payments: check for existing en_attente payment
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, stripe_session_id")
      .eq("mission_id", mission_id)
      .eq("statut", "en_attente")
      .maybeSingle();

    if (existingPayment) {
      return new Response(JSON.stringify({ error: "payment already in progress" }), { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const prix = mission.demandes?.prix ? parseFloat(String(mission.demandes.prix).replace(/[^0-9.]/g, "")) : 0;
    if (prix <= 0) return new Response(JSON.stringify({ error: "invalid price" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    // Lookup conversation from conversations table (conversations has demande_id, not mission_id)
    let convId = conversation_id;
    if (!convId) {
      const { data: conv } = await supabase.from("conversations").select("id").eq("demande_id", mission.demande_id).maybeSingle();
      convId = conv?.id;
    }

    const frais = 200;
    const montantCents = Math.round(prix * 100) + frais;

    const origin = req.headers.get("origin") || "https://help-connect-instantly.vercel.app";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: mission.demandes?.titre || "Mission" },
          unit_amount: montantCents,
        },
        quantity: 1,
      }],
      metadata: {
        mission_id: mission_id.toString(),
        helper_id: mission.helper_id,
        payeur_id: user.id,
        conversation_id: convId?.toString() || "",
      },
      success_url: `${origin}/chat/${convId}?payment=success`,
      cancel_url: `${origin}/chat/${convId}?payment=cancel`,
    });

    if (!session.url) return new Response(JSON.stringify({ error: "stripe error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });

    await supabase.from("payments").insert({
      mission_id,
      payeur_id: user.id,
      helper_id: mission.helper_id,
      stripe_session_id: session.id,
      montant: prix,
      frais: 2,
      statut: "en_attente",
    });

    return new Response(JSON.stringify({ url: session.url }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err) {
    console.error("create-payment error:", err);
    return new Response(JSON.stringify({ error: "internal server error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
