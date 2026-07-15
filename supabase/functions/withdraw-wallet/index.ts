import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

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

    const body = await req.json().catch(() => null);
    if (!body) return new Response(JSON.stringify({ error: "invalid JSON body" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { amount } = body;
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return new Response(JSON.stringify({ error: "invalid amount" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const user_id = user.id;

    // Coordonnées bancaires requises (plus de Stripe Connect : virement manuel)
    const { data: profile } = await supabase.from("profiles").select("iban, bank_holder_name").eq("id", user_id).maybeSingle();
    if (!profile?.iban || !profile?.bank_holder_name) {
      return new Response(JSON.stringify({ error: "no_bank_details", message: "Renseigne ton IBAN dans Paramètres > Paiements" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user_id).maybeSingle();
    if (!wallet || Number(wallet.balance) < amount) {
      return new Response(JSON.stringify({ error: "solde insuffisant" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Déduction atomique : on vérifie que le solde n'a pas changé entre la lecture et l'update
    const currentBalance = Number(wallet.balance);
    const { data: updatedWallet, error: deductError } = await supabase
      .from("wallets")
      .update({ balance: currentBalance - amount, updated_at: new Date().toISOString() })
      .eq("user_id", user_id)
      .eq("balance", currentBalance)
      .select("balance")
      .maybeSingle();

    if (deductError || !updatedWallet) {
      return new Response(JSON.stringify({ error: "Solde modifié entre-temps, réessayez" }), { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Crée la demande de retrait à traiter manuellement (virement bancaire hors app)
    const { data: withdrawalRequest, error: reqError } = await supabase
      .from("withdrawal_requests")
      .insert({
        user_id,
        amount,
        iban: profile.iban,
        bank_holder_name: profile.bank_holder_name,
        statut: "en_attente",
      })
      .select("id")
      .maybeSingle();

    if (reqError) {
      // Remboursement atomique : on crédite le wallet au lieu de restaurer un snapshot périmé
      await supabase.rpc("credit_wallet", {
        p_user_id: user_id,
        p_amount: amount,
        p_reference: `withdrawal_refund_${Date.now()}`,
        p_description: "Remboursement suite à un échec de création de retrait",
      });
      console.error("withdrawal_requests insert failed:", reqError);
      return new Response(JSON.stringify({ error: "Erreur lors de la création de la demande de retrait" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Log de la transaction (si ça échoue, on log mais on ne bloque pas)
    const { error: txError } = await supabase.from("wallet_transactions").insert({
      user_id,
      type: "withdrawal",
      amount: -amount,
      reference: withdrawalRequest?.id ? `withdrawal_${withdrawalRequest.id}` : null,
      description: "Retrait vers compte bancaire (virement manuel)",
    });

    if (txError) {
      console.error("CRITICAL: withdrawal created but wallet_transactions insert failed:", txError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Demande de retrait enregistrée, le virement sera envoyé sous quelques jours." }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    console.error("withdraw-wallet error:", err);
    const message = err instanceof Error ? err.message : "internal server error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
