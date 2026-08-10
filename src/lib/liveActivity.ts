import { registerPlugin, Capacitor } from "@capacitor/core";

export interface LiveActivityPluginAPI {
  start(options: { missionId: string; titre: string }): Promise<{ activityId?: string }>;
  update(options: { missionId: string; statut: string }): Promise<void>;
  end(options: { missionId: string }): Promise<void>;
}

const LiveActivity = registerPlugin<LiveActivityPluginAPI>("LiveActivity");

const supported = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

// Feature Vague 2 — Live Activity / Dynamic Island (iOS 16.1+)
// Tous les appels sont silencieux : si le plugin natif n'est pas là,
// l'app continue de fonctionner normalement.
export const liveActivitySupported = supported;

export async function startMissionActivity(missionId: string | number, titre: string): Promise<void> {
  if (!supported) return;
  try {
    await LiveActivity.start({ missionId: String(missionId), titre });
  } catch {
    // Live Activities non supportées ou désactivées par l'utilisateur
  }
}

export async function updateMissionActivity(missionId: string | number, statut: string): Promise<void> {
  if (!supported) return;
  try {
    await LiveActivity.update({ missionId: String(missionId), statut });
  } catch {
    // silencieux
  }
}

export async function endMissionActivity(missionId: string | number): Promise<void> {
  if (!supported) return;
  try {
    await LiveActivity.end({ missionId: String(missionId) });
  } catch {
    // silencieux
  }
}
