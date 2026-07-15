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

    // Check if user already has an active boost
    const { data: profile } = await supabase
      .from("profiles")
      .select("boost_until")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.boost_until && new Date(profile.boost_until).getTime() > Date.now()) {
      return new Response(
        JSON.stringify({ error: "boost_already_active", message: "Tu as déjà un boost actif." }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use validated origin for Stripe redirect URLs (prevent open redirect)
    const reqOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: "🚀 Boost profil — 1 mois" },
          unit_amount: 499,
        },
        quantity: 1,
      }],
      metadata: {
        user_id: user.id,
        type: "boost",
      },
      success_url: `${reqOrigin}/boost-profile?boost=success`,
      cancel_url: `${reqOrigin}/boost-profile`,
    });

    if (!session.url) {
      return new Response(JSON.stringify({ error: "stripe error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ url: session.url }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err) {
    console.error("create-boost-payment error:", err);
    return new Response(JSON.stringify({ error: "internal server error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
