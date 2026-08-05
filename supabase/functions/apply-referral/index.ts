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
    if (!body) return new Response(JSON.stringify({ error: "invalid JSON body" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const code = String(body.code || "").trim().toUpperCase();
    if (!code) return new Response(JSON.stringify({ error: "missing code" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("ref_code, referred_by")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "profile not found" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    if (profile.referred_by) {
      return new Response(JSON.stringify({ error: "already referred" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: referrer, error: referrerError } = await supabase
      .from("profiles")
      .select("id")
      .eq("ref_code", code)
      .maybeSingle();
    if (referrerError || !referrer) {
      return new Response(JSON.stringify({ error: "invalid code" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    if (referrer.id === user.id) {
      return new Response(JSON.stringify({ error: "self referral" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ referred_by: referrer.id })
      .eq("id", user.id)
      .is("referred_by", null);
    if (updateError) {
      return new Response(JSON.stringify({ error: "update failed" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || "internal error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
