import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const APPLE_SHARED_SECRET = Deno.env.get("APPLE_SHARED_SECRET") || "";
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";
const APPLE_PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";

const BOOST_PRODUCT_ID = "boost_monthly";

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
    if (!body?.receipt) {
      return new Response(JSON.stringify({ error: "missing receipt" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { receipt } = body;

    const verifyResult = await verifyAppleReceipt(receipt);
    if (!verifyResult.success) {
      return new Response(JSON.stringify({ error: "receipt verification failed", detail: verifyResult.error }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const boostTx = findBoostTransaction(verifyResult.latestReceiptInfo || []);
    const expiresDate = boostTx ? parseDate(boostTx.expires_date) : null;

    if (!boostTx || !expiresDate || expiresDate.getTime() <= Date.now()) {
      return new Response(JSON.stringify({ success: true, type: "boost", active: false }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const originalTransactionId = boostTx.original_transaction_id;
    const reference = `iap_sub_${originalTransactionId}`;

    const { data: existing } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("reference", reference)
      .maybeSingle();

    if (!existing) {
      await supabase.from("wallet_transactions").insert({
        reference,
        user_id: user.id,
        amount: 0,
        type: "boost_subscription",
        description: "Abonnement Boost (App Store)",
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("boost_until")
      .eq("id", user.id)
      .maybeSingle();

    const current = profile?.boost_until ? new Date(profile.boost_until).getTime() : 0;
    const newUntil = expiresDate.getTime() > current ? expiresDate.toISOString() : profile?.boost_until;

    const { error: boostErr } = await supabase
      .from("profiles")
      .update({ boost_until: newUntil })
      .eq("id", user.id);

    if (boostErr) {
      console.error("boost update error:", boostErr);
      return new Response(JSON.stringify({ error: "failed to activate boost" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ success: true, type: "boost", active: true, until: newUntil }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (err) {
    console.error("verify-apple-receipt error:", err);
    return new Response(JSON.stringify({ error: "internal server error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});

function findBoostTransaction(latestReceiptInfo: any[]): any | null {
  let best: any | null = null;
  let bestDate = 0;
  for (const tx of latestReceiptInfo) {
    if (tx.product_id !== BOOST_PRODUCT_ID) continue;
    const d = parseDate(tx.expires_date)?.getTime() || 0;
    if (d > bestDate) {
      bestDate = d;
      best = tx;
    }
  }
  return best;
}

function parseDate(value?: string | number): Date | null {
  if (!value) return null;
  const d = new Date(typeof value === "number" ? value * 1000 : value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function verifyAppleReceipt(receiptData: string): Promise<{ success: boolean; latestReceiptInfo?: any[]; error?: string }> {
  let result = await sendToApple(receiptData, APPLE_PRODUCTION_URL);

  if (result.status === 21007) {
    result = await sendToApple(receiptData, APPLE_SANDBOX_URL);
  }

  if (result.status !== 0) {
    return { success: false, error: `Apple status: ${result.status}` };
  }

  return { success: true, latestReceiptInfo: result.latest_receipt_info || [] };
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
