import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const { mission_id, user_id } = await req.json();
  if (!mission_id || !user_id) return new Response(JSON.stringify({ error: "missing fields" }), { status: 400 });

  const { data: mission } = await supabase.from("missions").select("*, demandes(*)").eq("id", mission_id).single();
  if (!mission) return new Response(JSON.stringify({ error: "mission not found" }), { status: 404 });

  const prix = mission.demandes?.prix ? parseFloat(mission.demandes.prix.replace(/[^0-9.]/g, "")) : 0;
  if (prix <= 0) return new Response(JSON.stringify({ error: "invalid price" }), { status: 400 });

  const frais = 200; // 2€ en centimes
  const total = Math.round(prix * 100) + frais; // en centimes

  const { data: helper } = await supabase.from("profiles").select("stripe_account_id").eq("id", mission.helper_id).single();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "eur",
        product_data: { name: mission.demandes?.titre || "Mission" },
        unit_amount: Math.round(prix * 100),
      },
      quantity: 1,
    }, {
      price_data: {
        currency: "eur",
        product_data: { name: "Frais de service" },
        unit_amount: frais,
      },
      quantity: 1,
    }],
    metadata: { mission_id: mission_id.toString(), helper_id: mission.helper_id },
    success_url: `${req.headers.get("origin")}/chat/${mission_id}?payment=success`,
    cancel_url: `${req.headers.get("origin")}/chat/${mission_id}?payment=cancel`,
  });

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