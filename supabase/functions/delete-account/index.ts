import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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

    const uid = user.id;

    const conversations = await supabase.from("conversations").select("id").or(`demandeur_id.eq.${uid},helper_id.eq.${uid}`);
    const conversationIds = (conversations.data || []).map((c: { id: number }) => c.id);

    await supabase.from("messages").delete().or(`sender_id.eq.${uid},conversation_id.in.(${conversationIds.join(",") || "0"})`);
    await supabase.from("notifications").delete().or(`user_id.eq.${uid},conversation_id.in.(${conversationIds.join(",") || "0"})`);
    await supabase.from("signals").delete().or(`reporter_id.eq.${uid},reported_id.eq.${uid}`);
    await supabase.from("avis").delete().or(`auteur_id.eq.${uid},cible_id.eq.${uid}`);
    await supabase.from("payments").delete().or(`payeur_id.eq.${uid},helper_id.eq.${uid}`);
    await supabase.from("missions").delete().or(`demandeur_id.eq.${uid},helper_id.eq.${uid}`);
    await supabase.from("conversations").delete().or(`demandeur_id.eq.${uid},helper_id.eq.${uid}`);
    await supabase.from("demandes").delete().eq("user_id", uid);
    await supabase.from("wallet_transactions").delete().eq("user_id", uid);
    await supabase.from("wallets").delete().eq("user_id", uid);
    await supabase.from("withdrawal_requests").delete().eq("user_id", uid);
    await supabase.from("profiles").delete().eq("id", uid);

    const storageBuckets = ["avatars", "demande-photos", "chat-photos"];
    for (const bucket of storageBuckets) {
      const { data: files } = await supabase.storage.from(bucket).list(`${uid}`, { limit: 1000 });
      if (files?.length) {
        await supabase.storage.from(bucket).remove(files.map((f) => `${uid}/${f.name}`));
      }
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(uid);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || "internal error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
