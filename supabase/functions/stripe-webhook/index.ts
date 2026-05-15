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

  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch {
    return new Response("Invalid signature", { status: 400, headers: corsHeaders });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const missionId = session.metadata?.mission_id;
    const helperId = session.metadata?.helper_id;
    const conversationId = session.metadata?.conversation_id;

    if (missionId) {
      await supabase.from("payments").update({ statut: "pay\u00e9", stripe_payment_intent: session.payment_intent as string }).eq("stripe_session_id", session.id);
      await supabase.from("missions").update({ statut: "en_cours" }).eq("id", parseInt(missionId));

      if (conversationId) {
        await supabase.from("conversations").update({ statut: "en_cours" }).eq("id", parseInt(conversationId));

        if (helperId) {
          await supabase.from("notifications").insert({
            user_id: helperId,
            message: "\uD83D\uDCB0 Paiement re\u00e7u ! L'argent est s\u00e9curis\u00e9 sur Stripe jusqu'\u00e0 la fin de la mission.",
            conversation_id: parseInt(conversationId),
            lu: false,
          });
        }
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    await supabase.from("payments").update({ statut: "expir\u00e9" }).eq("stripe_session_id", session.id);
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntent = charge.payment_intent as string;

    if (paymentIntent) {
      await supabase
        .from("payments")
        .update({ statut: "rembours\u00e9", refunded_at: new Date().toISOString() })
        .eq("stripe_payment_intent", paymentIntent);
    }
  }

  return new Response("ok", { status: 200 });
});
