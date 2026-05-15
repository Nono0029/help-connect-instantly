import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

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

  const { mission_id } = await req.json();
  if (!mission_id) return new Response(JSON.stringify({ error: "missing mission_id" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("mission_id", mission_id)
    .eq("statut", "pay\u00e9")
    .maybeSingle();

  if (!payment) return new Response(JSON.stringify({ error: "no payment found or already released" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  // Créditer le wallet du helper
  const montant = Number(payment.montant);
  const { error: creditError } = await supabase.rpc("credit_wallet", {
    p_user_id: payment.helper_id,
    p_amount: montant,
    p_reference: `mission_${mission_id}`,
    p_description: `Paiement mission #${mission_id}`,
  });

  if (creditError) {
    console.error("credit_wallet error:", creditError);
    return new Response(JSON.stringify({ error: "failed to credit wallet" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  // Update payment: released
  await supabase
    .from("payments")
    .update({ statut: "termine", released_at: new Date().toISOString() })
    .eq("id", payment.id);

  return new Response(JSON.stringify({ success: true, credited: montant }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
});
