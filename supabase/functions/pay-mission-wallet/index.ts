import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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
    if (!body?.mission_id) {
      return new Response(JSON.stringify({ error: "missing mission_id" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { mission_id } = body;

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

    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const balance = wallet?.balance || 0;
    if (balance < totalCost) {
      return new Response(
        JSON.stringify({
          error: "insufficient_balance",
          required: totalCost,
          current: balance,
          message: `Solde insuffisant. Il te faut ${totalCost.toFixed(2)}€ (prix ${prix}€ + frais ${totalFees}€). Ton solde: ${balance.toFixed(2)}€`,
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { error: debitError } = await supabase.rpc("credit_wallet", {
      p_user_id: user.id,
      p_amount: -totalCost,
      p_reference: `mission_payment_${mission_id}`,
      p_description: `Paiement mission #${mission_id} (${totalCost.toFixed(2)}€)`,
    });

    if (debitError) {
      console.error("debit error:", debitError);
      return new Response(JSON.stringify({ error: "payment failed" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
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
        p_user_id: user.id,
        p_amount: totalCost,
        p_reference: `mission_payment_${mission_id}_reversal`,
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
        message: "💰 Paiement reçu ! L'argent est sécurisé. Confirme la mission une fois terminée.",
        conversation_id: mission.conversation_id || null,
        lu: false,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      totalPaid: totalCost,
      fees: totalFees,
      message: `Paiement de ${totalCost.toFixed(2)}€ effectué depuis ton portefeuille.`,
    }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (err) {
    console.error("pay-mission-wallet error:", err);
    return new Response(JSON.stringify({ error: "internal server error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
