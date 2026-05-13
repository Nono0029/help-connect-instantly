import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const missionId = session.metadata?.mission_id;
    const helperId = session.metadata?.helper_id;
    const conversationId = session.metadata?.conversation_id;

    if (missionId) {
      await supabase.from("payments").update({ statut: "payé", stripe_payment_intent: session.payment_intent as string }).eq("stripe_session_id", session.id);
      await supabase.from("missions").update({ statut: "en_cours" }).eq("id", parseInt(missionId));

      if (conversationId) {
        await supabase.from("conversations").update({ statut: "en_cours" }).eq("id", parseInt(conversationId));

        if (helperId) {
          await supabase.from("notifications").insert({
            user_id: helperId,
            message: "💰 Paiement reçu ! La mission peut commencer.",
            conversation_id: parseInt(conversationId),
            lu: false,
          });
        }
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    await supabase.from("payments").update({ statut: "expiré" }).eq("stripe_session_id", session.id);
  }

  return new Response("ok", { status: 200 });
});