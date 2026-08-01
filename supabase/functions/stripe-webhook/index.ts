import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  let processingError = false;

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const missionId = pi.metadata?.mission_id;
      const helperId = pi.metadata?.helper_id;
      const conversationId = pi.metadata?.conversation_id;

      if (missionId) {
        const parsedMissionId = parseInt(missionId, 10);
        if (isNaN(parsedMissionId)) {
          console.error("Invalid mission_id in metadata:", missionId);
          return new Response("ok", { status: 200 });
        }

        const { data: payment } = await supabase
          .from("payments")
          .select("id, statut")
          .eq("mission_id", parsedMissionId)
          .eq("statut", "en_attente")
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!payment) {
          console.warn("No pending payment found for mission:", parsedMissionId);
          return new Response("ok", { status: 200 });
        }

        await supabase.from("payments").update({ statut: "payé", stripe_payment_intent: pi.id }).eq("id", payment.id);
        await supabase.from("missions").update({ statut: "en_cours" }).eq("id", parsedMissionId);

        if (conversationId) {
          const parsedConvId = parseInt(conversationId, 10);
          if (!isNaN(parsedConvId)) {
            await supabase.from("conversations").update({ statut: "en_cours" }).eq("id", parsedConvId);
          }

          if (helperId && !isNaN(parsedConvId)) {
            const { data: existing } = await supabase
              .from("notifications")
              .select("id")
              .eq("user_id", helperId)
              .eq("conversation_id", parsedConvId)
              .eq("message", "\uD83D\uDCB0 Paiement re\u00e7u via Apple Pay ! L'argent est s\u00e9curis\u00e9 jusqu'\u00e0 la fin de la mission.")
              .maybeSingle();

            if (!existing) {
              await supabase.from("notifications").insert({
                user_id: helperId,
                message: "\uD83D\uDCB0 Paiement re\u00e7u via Apple Pay ! L'argent est s\u00e9curis\u00e9 jusqu'\u00e0 la fin de la mission.",
                conversation_id: parsedConvId,
                lu: false,
              });
            }
          }
        }
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const missionId = pi.metadata?.mission_id;

      if (missionId) {
        const parsedMissionId = parseInt(missionId, 10);
        if (!isNaN(parsedMissionId)) {
          await supabase.from("payments").update({ statut: "expiré" }).eq("mission_id", parsedMissionId).eq("statut", "en_attente");
        }
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntent = charge.payment_intent as string;

      if (paymentIntent) {
        await supabase
          .from("payments")
          .update({ statut: "remboursé", refunded_at: new Date().toISOString() })
          .eq("stripe_payment_intent", paymentIntent);
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    processingError = true;
  }

  if (processingError) {
    return new Response("processing error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
