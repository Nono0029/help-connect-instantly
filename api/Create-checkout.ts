import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

  const { conversationId, montant, demandeTitle } = req.body;

  if (!conversationId || !montant) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: demandeTitle || "Aide demandée",
              description: "Paiement via Demandé",
            },
            unit_amount: Math.round(montant * 100), // en centimes
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // Commission 11% pour la plateforme
      payment_intent_data: {
        application_fee_amount: Math.round(montant * 100 * 0.11),
      },
      success_url: `${process.env.NEXT_PUBLIC_URL}/chat/${conversationId}?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/chat/${conversationId}?cancelled=true`,
      metadata: {
        conversationId: String(conversationId),
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
