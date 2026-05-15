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

  const { mission_id, user_id, conversation_id } = await req.json();
  if (!mission_id || !user_id) return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  const { data: mission } = await supabase.from("missions").select("*, demandes(*)").eq("id", mission_id).maybeSingle();
  if (!mission) return new Response(JSON.stringify({ error: "mission not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

  const prix = mission.demandes?.prix ? parseFloat(String(mission.demandes.prix).replace(/[^0-9.]/g, "")) : 0;
  if (prix <= 0) return new Response(JSON.stringify({ error: "invalid price" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  const convId = conversation_id || mission.conversation_id;
  const frais = 200;
  const montantCents = Math.round(prix * 100) + frais;

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
      payeur_id: user_id,
      conversation_id: convId?.toString() || "",
    },
    success_url: `${req.headers.get("origin")}/chat/${convId}?payment=success`,
    cancel_url: `${req.headers.get("origin")}/chat/${convId}?payment=cancel`,
  });

  if (!session.url) return new Response(JSON.stringify({ error: "stripe error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });

  await supabase.from("payments").insert({
    mission_id,
    payeur_id: user_id,
    helper_id: mission.helper_id,
    stripe_session_id: session.id,
    montant: prix,
    frais: 2,
    statut: "en_attente",
  });

  return new Response(JSON.stringify({ url: session.url }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
});
