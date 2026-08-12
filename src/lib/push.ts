import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/lib/supabase";

// Push notifications APNs (iOS). Tous les appels sont silencieux :
// si le plugin natif ou l'edge function "notify-user" ne sont pas
// disponibles, l'app continue de fonctionner normalement.

let registeredForUser: string | null = null;

export async function registerPushToken(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return;
  if (registeredForUser === userId) return;
  try {
    const perms = await PushNotifications.checkPermissions();
    let granted = perms.receive === "granted";
    if (!granted) {
      if (perms.receive === "denied") return;
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === "granted";
    }
    if (!granted) return;

    const { value: token } = await PushNotifications.register();
    if (!token) return;

    await supabase.from("push_tokens").upsert(
      { user_id: userId, token, platform: "ios" },
      { onConflict: "user_id,token" }
    );
    registeredForUser = userId;
  } catch {
    // silencieux (simulateur, permission refusée, plugin absent)
  }
}

// Envoie un push au destinataire via l'edge function notify-user.
// La vérification de blocage et l'envoi APNs se font côté serveur.
export async function sendPushNotification(
  userId: string,
  title: string,
  message: string
): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return;
  if (!userId) return;
  try {
    await supabase.functions.invoke("notify-user", {
      body: { user_id: userId, title, message },
    });
  } catch {
    // silencieux : la notification in-app existe déjà
  }
}