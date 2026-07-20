import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatTimeAgo(created_at: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const timestamp = new Date(created_at).getTime();
  if (!created_at || isNaN(timestamp)) return t('time.justNow');
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 0) return t('time.justNow');
  if (diff < 60) return t('time.justNow');
  if (diff < 3600) return t('time.minutesAgo', { n: Math.floor(diff / 60) });
  if (diff < 86400) return t('time.hoursAgo', { n: Math.floor(diff / 3600) });
  return t('time.daysAgo', { n: Math.floor(diff / 86400) });
}

/**
 * Races a Supabase query (or any thenable) against a timeout.
 * Without this, a request that never gets a response on a flaky mobile
 * connection or a stalled iOS WebView never resolves AND never rejects —
 * the awaiting code just hangs forever, which is what leaves loading
 * skeletons stuck on screen indefinitely. try/catch/finally alone does NOT
 * protect against this, since finally only runs once the awaited promise
 * settles one way or the other.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms = 12000, label = "request"): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}
