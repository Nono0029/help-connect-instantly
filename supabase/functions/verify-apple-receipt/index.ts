import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const APPLE_SHARED_SECRET = Deno.env.get("APPLE_SHARED_SECRET") || "";
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";
const APPLE_PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";

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
    if (!body?.receipt) {
      return new Response(JSON.stringify({ error: "missing receipt" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { receipt, productId } = body;

    const verifyResult = await verifyAppleReceipt(receipt);
    if (!verifyResult.success) {
      return new Response(JSON.stringify({ error: "receipt verification failed", detail: verifyResult.error }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: existing } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("reference", `iap_${verifyResult.transactionId}`)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, duplicate: true }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const isBoost = productId === "boost_monthly";

    if (isBoost) {
      const now = new Date();
      const until = new Date(now);
      until.setMonth(until.getMonth() + 1);

      const { error: boostErr } = await supabase
        .from("profiles")
        .update({ boost_until: until.toISOString() })
        .eq("id", user.id);

      if (boostErr) {
        console.error("boost update error:", boostErr);
        return new Response(JSON.stringify({ error: "failed to activate boost" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      return new Response(JSON.stringify({ success: true, type: "boost", until: until.toISOString() }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ error: "unknown product — mission payments use pay-mission-iap" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (err) {
    console.error("verify-apple-receipt error:", err);
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
