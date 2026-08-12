// ============================================================
// notify-user — envoie une notification push APNs à un
// utilisateur d'Askoo, après avoir vérifié qu'il n'est pas
// bloqué par le destinataire (et réciproquement).
//
// Secrets requis (Settings > Edge Functions > Secrets) :
//   APNS_TEAM_ID   = "W9Y56L27YU"           (Apple Developer Team ID)
//   APNS_KEY_ID    = <ID de la clé APNs>    (ex: ABC123DEF4)
//   APNS_TOPIC     = "com.askoo.app"
//   APNS_PRIVATE_KEY = <contenu complet du .p8, avec -----BEGIN/END----->
//   SUPABASE_SERVICE_ROLE_KEY = déjà fourni par Supabase
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const apnsHost = Deno.env.get("APNS_HOST") || "https://api.push.apple.com";

function base64url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlEncodeJson(obj: unknown): string {
  return base64url(new TextEncoder().encode(JSON.stringify(obj)));
}

function pemToKeyData(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [A-Z ]+-----/, "")
    .replace(/-----END [A-Z ]+-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function signApnsJwt(): Promise<string> {
  const header = base64urlEncodeJson({ alg: "ES256", kid: Deno.env.get("APNS_KEY_ID") });
  const now = Math.floor(Date.now() / 1000);
  const payload = base64urlEncodeJson({
    iss: Deno.env.get("APNS_TEAM_ID"),
    iat: now,
    exp: now + 3600,
  });
  const signingInput = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToKeyData(Deno.env.get("APNS_PRIVATE_KEY")!),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // ECDSA P-256 : le signataire renvoie (r,s) en 64 octets bruts,
  // APNs attend une signature JWS ES256 (r|s concaténés).
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64url(signature)}`;
}

async function sendToApns(token: string, title: string, body: string): Promise<boolean> {
  const jwt = await signApnsJwt();
  const payload = {
    aps: {
      alert: { title, body },
      sound: "default",
      "mutable-content": 1,
    },
  };

  const res = await fetch(`${apnsHost}/3/device/${token}`, {
    method: "POST",
    headers: {
      Authorization: `bearer ${jwt}`,
      "apns-topic": Deno.env.get("APNS_TOPIC") || "com.askoo.app",
      "apns-push-type": "alert",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok && res.status !== 410 && res.status !== 400) {
    console.error("APNs error", res.status, await res.text());
    return false;
  }

  // 410 Gone / 400 BadDeviceToken : supprimer le token invalide
  if (res.status === 410 || res.status === 400) {
    await supabaseAdmin.from("push_tokens").delete().eq("token", token);
    return false;
  }
  return true;
}

const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req) => {
  // 1. Seuls des utilisateurs authentifiés peuvent envoyer
  const authHeader = req.headers.get("Authorization");
  const callerToken = authHeader?.replace(/^Bearer /, "");
  if (!callerToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "", {
    global: { headers: { Authorization: authHeader! } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await callerClient.auth.getUser(callerToken);
  const callerId = userData?.user?.id?.toString();
  if (!callerId) return new Response("Unauthorized", { status: 401 });

  // 2. Body : { user_id, title, message }
  const { user_id: targetId, title, message } = await req.json().catch(() => ({}));
  if (!targetId || !message) {
    return new Response(JSON.stringify({ error: "user_id et message requis" }), { status: 400 });
  }

  // 3. Blocage : ni le destinateur ni le destinataire ne doivent être bloqués
  const inDb = async (table: string, a: string, b: string) => {
    const { data } = await supabaseAdmin.from(table).select("user_id").eq("user_id", a).eq("blocked_id", b).maybeSingle();
    return !!data;
  };
  if ((await inDb("user_blocks", callerId, targetId)) || (await inDb("user_blocks", targetId, callerId))) {
    return new Response(JSON.stringify({ ok: true, blocked: true, sent: 0 }), { status: 200 });
  }

  // 4. Tokens du destinataire (plateforme ios uniquement)
  const { data: tokens } = await supabaseAdmin
    .from("push_tokens")
    .select("token")
    .eq("user_id", targetId)
    .eq("platform", "ios");

  let sent = 0;
  if (tokens && tokens.length > 0) {
    await supabaseAdmin
      .from("push_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_id", targetId);
    for (const t of tokens) {
      if (await sendToApns(t.token, title || "Askoo", message)) sent++;
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { "content-type": "application/json" },
  });
});