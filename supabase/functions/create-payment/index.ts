import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const { mission_id, user_id, conversation_id } = await req.json();
  if (!mission_id || !user_id) return new Response(JSON.stringify({ error: "missing fields" }), { status: 400 });

  const { data: mission } = await supabase.from("missions").select("*, demandes(*)").eq("id", mission_id).maybeSingle();
  if (!mission) return new Response(JSON.stringify({ error: "mission not found" }), { status: 404 });

  const prix = mission.demandes?.prix ? parseFloat(String(mission.demandes.prix).replace(/[^0-9.]/g, "")) : 0;
  if (prix <= 0) return new Response(JSON.stringify({ error: "invalid price" }), { status: 400 });

  const convId = conversation_id || mission.conversation_id;
  const frais = 200; // Platform fee: 2€ in cents
  const montantCents = Math.round(prix * 100);

  // Get helper's connected Stripe account for destination charge
  const { data: profile } = await supabase.from("profiles").select("stripe_account_id").eq("id", mission.helper_id).maybeSingle();
  const helperAccountId = profile?.stripe_account_id;

  const sessionConfig: any = {
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
  };

  // Stripe Connect Express: auto-split to helper's connected account
  if (helperAccountId) {
    sessionConfig.payment_intent_data = {
      transfer_data: { destination: helperAccountId },
      application_fee_amount: frais, // Platform keeps 2€
    };
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);

  if (!session.url) return new Response(JSON.stringify({ error: "stripe error" }), { status: 500 });

  await supabase.from("payments").insert({
    mission_id,
    payeur_id: user_id,
    helper_id: mission.helper_id,
    stripe_session_id: session.id,
    montant: prix,
    frais: 2,
    statut: "en_attente",
  });

  return new Response(JSON.stringify({ url: session.url }), { headers: { "Content-Type": "application/json" } });
});