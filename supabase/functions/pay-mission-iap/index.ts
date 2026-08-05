import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const APPLE_SHARED_SECRET = Deno.env.get("APPLE_SHARED_SECRET") || "";
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";
const APPLE_PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";

const MISSION_PRODUCT_AMOUNTS: Record<string, number> = {
  "mission_5": 5,
  "mission_10": 10,
  "mission_15": 15,
  "mission_20": 20,
  "mission_25": 25,
  "mission_30": 30,
  "mission_40": 40,
  "mission_50": 50,
};

const ALLOWED_ORIGINS = ["https://askoo.fr", "https://www.askoo.fr", "https://help-connect-instantly.vercel.app"];

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = origin || "*";

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

    const body = await req.json().catch(() => null);
    if (!body?.mission_id || !body?.receipt || !body?.product_id) {
      return new Response(JSON.stringify({ error: "missing mission_id, receipt, or product_id" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { mission_id, receipt, product_id } = body;

    const productAmount = MISSION_PRODUCT_AMOUNTS[product_id];
    if (!productAmount) {
      return new Response(JSON.stringify({ error: "unknown product" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const verifyResult = await verifyAppleReceipt(receipt);
    if (!verifyResult.success) {
      return new Response(JSON.stringify({ error: "receipt verification failed", detail: verifyResult.error }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: existing } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("reference", `iap_mission_${verifyResult.transactionId}`)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, duplicate: true }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: mission } = await supabase
      .from("missions")
      .select("*, demandes!inner(*)")
      .eq("id", mission_id)
      .maybeSingle();

    if (!mission) {
      return new Response(JSON.stringify({ error: "mission not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    if (mission.demandeur_id !== user.id) {
      return new Response(JSON.stringify({ error: "only requester can pay" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: paidPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("mission_id", mission_id)
      .in("statut", ["payé", "termine"])
      .limit(1)
      .maybeSingle();

    if (paidPayment) {
      return new Response(JSON.stringify({ error: "already paid" }), { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const prix = parseFloat(String(mission.demandes?.prix || "0").replace(",", "."));
    if (prix <= 0) {
      return new Response(JSON.stringify({ error: "free mission" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const createdAt = mission.demandes?.created_at;
    const urgentActive = mission.demandes?.urgent === true
      && !!createdAt
      && (Date.now() - new Date(createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000;

    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("boost_until, referred_by, referral_fee_used")
      .eq("id", user.id)
      .maybeSingle();

    const isBoosted = !!requesterProfile?.boost_until
      && new Date(requesterProfile.boost_until).getTime() > Date.now();

    const referralExempt = !!requesterProfile?.referred_by && !requesterProfile?.referral_fee_used;

    const urgentFee = urgentActive && !isBoosted ? 1 : 0;
    const totalFees = referralExempt ? 0 : 2 + urgentFee;
    const totalCost = prix + totalFees;

    if (productAmount < totalCost) {
      return new Response(
        JSON.stringify({
          error: "insufficient_product",
          required: totalCost,
          productCovers: productAmount,
          message: `Ce produit couvre ${productAmount}€ mais la mission coûte ${totalCost.toFixed(2)}€`,
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const helperPays = prix;
    const platformKeeps = totalFees;

    const { error: creditHelperError } = await supabase.rpc("credit_wallet", {
      p_user_id: mission.helper_id,
      p_amount: helperPays,
      p_reference: `iap_mission_${verifyResult.transactionId}`,
      p_description: `Paiement mission #${mission_id} (via Apple Pay)`,
    });

    if (creditHelperError) {
      console.error("credit helper error:", creditHelperError);
      return new Response(JSON.stringify({ error: "failed to credit helper" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { error: insertError } = await supabase.from("payments").insert({
      mission_id,
      payeur_id: user.id,
      helper_id: mission.helper_id,
      montant: prix,
      frais: totalFees,
      statut: "payé",
    });

    if (insertError) {
      console.error("payment insert error:", insertError);
      await supabase.rpc("credit_wallet", {
        p_user_id: mission.helper_id,
        p_amount: -helperPays,
        p_reference: `iap_mission_${verifyResult.transactionId}_reversal`,
        p_description: "Annulation paiement mission",
      });
      return new Response(JSON.stringify({ error: "payment record failed" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    await supabase.from("missions").update({ statut: "en_cours" }).eq("id", mission_id);

    if (referralExempt) {
      await supabase
        .from("profiles")
        .update({ referral_fee_used: true })
        .eq("id", user.id)
        .eq("referral_fee_used", false);
    }

    if (mission.helper_id) {
      await supabase.from("notifications").insert({
        user_id: mission.helper_id,
        message: "💰 Paiement reçu via Apple Pay ! L'argent est sécurisé. Confirme la mission une fois terminée.",
        conversation_id: mission.conversation_id || null,
        lu: false,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      totalPaid: totalCost,
      helperReceives: helperPays,
      platformKeeps,
      message: `Paiement de ${totalCost.toFixed(2)}€ effectué via Apple Pay.`,
    }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (err) {
    console.error("pay-mission-iap error:", err);
    return new Response(JSON.stringify({ error: "internal server error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});

async function verifyAppleReceipt(receiptData: string): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  let result = await sendToApple(receiptData, APPLE_PRODUCTION_URL);

  if (result.status === 21007) {
    result = await sendToApple(receiptData, APPLE_SANDBOX_URL);
  }

  if (result.status !== 0) {
    return { success: false, error: `Apple status: ${result.status}` };
  }

  const latestReceipt = result.receipt?.in_app?.[result.receipt.in_app.length - 1];
  if (!latestReceipt) {
    return { success: false, error: "no transactions in receipt" };
  }

  return { success: true, transactionId: latestReceipt.transaction_id };
}

async function sendToApple(receiptData: string, url: string): Promise<any> {
  const payload: Record<string, unknown> = {
    "receipt-data": receiptData,
  };
  if (APPLE_SHARED_SECRET) {
    payload["password"] = APPLE_SHARED_SECRET;
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return resp.json();
}
