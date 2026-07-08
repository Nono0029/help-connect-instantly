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

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing signature", { status: 400, headers: corsHeaders });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch {
    return new Response("Invalid signature", { status: 400, headers: corsHeaders });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const missionId = session.metadata?.mission_id;
      const helperId = session.metadata?.helper_id;
      const conversationId = session.metadata?.conversation_id;
      const userId = session.metadata?.user_id;
      const paymentType = session.metadata?.type;

      // Handle boost payment
      if (paymentType === "boost" && userId) {
        const now = new Date();
        const until = new Date(now);
        until.setMonth(until.getMonth() + 1);
        await supabase.from("profiles").upsert({ id: userId, boost_until: until.toISOString() });
      }

      // Handle mission payment
      if (missionId) {
        await supabase.from("payments").update({ statut: "pay\u00e9", stripe_payment_intent: session.payment_intent as string }).eq("stripe_session_id", session.id);
        await supabase.from("missions").update({ statut: "en_cours" }).eq("id", parseInt(missionId));

        if (conversationId) {
          await supabase.from("conversations").update({ statut: "en_cours" }).eq("id", parseInt(conversationId));

          // Idempotency: check if notification already exists before inserting
          if (helperId) {
            const { data: existing } = await supabase
              .from("notifications")
              .select("id")
              .eq("user_id", helperId)
              .eq("conversation_id", parseInt(conversationId))
              .eq("message", "\uD83D\uDCB0 Paiement re\u00e7u ! L'argent est s\u00e9curis\u00e9 sur Stripe jusqu'\u00e0 la fin de la mission.")
              .maybeSingle();

            if (!existing) {
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
  } catch (err) {
    console.error("Webhook processing error:", err);
    // Still return 200 to prevent Stripe from retrying indefinitely
  }

  return new Response("ok", { status: 200 });
});
