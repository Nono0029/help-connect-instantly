import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const { user_id } = await req.json();
  if (!user_id) return new Response(JSON.stringify({ error: "missing user_id" }), { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("stripe_account_id").eq("id", user_id).single();

  let accountId = profile?.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      email: (await supabase.auth.admin.getUserById(user_id)).data.user?.email,
      capabilities: { transfers: { requested: true } },
    });
    accountId = account.id;
    await supabase.from("profiles").update({ stripe_account_id: accountId }).eq("id", user_id);
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${req.headers.get("origin")}/payment-setup`,
    return_url: `${req.headers.get("origin")}/payment-setup?success=true`,
    type: "account_onboarding",
  });

  return new Response(JSON.stringify({ url: accountLink.url }), { headers: { "Content-Type": "application/json" } });
});