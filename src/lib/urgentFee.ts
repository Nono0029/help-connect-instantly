// Shared pricing logic for mission fees and urgent status.
//
// Fees: 2€ base fee, +1€ extra if the request is (still) urgent.
// A request stays "urgent" for 7 days after creation; after that the
// urgent surcharge and badge disappear even though the `urgent` flag
// may still be true in the database (the requester can recreate the
// request if they still need urgent visibility).

export const BASE_FEE_EUROS = 2;
export const URGENT_EXTRA_EUROS = 1;
export const URGENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Whether a request's urgent surcharge/badge should still apply.
 * `createdAt` should be the persisted request's `created_at`. If it is
 * missing or invalid, this conservatively returns false (matching the
 * payment edge function's behavior) rather than assuming urgency is
 * still active. For a brand-new, not-yet-persisted request (e.g. the
 * creation form's live preview), don't call this helper at all — use
 * the user's toggle state directly, since there is no `created_at` yet.
 */
export function isUrgentActive(urgent: boolean | null | undefined, createdAt?: string | null): boolean {
  if (!urgent || !createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created < URGENT_WINDOW_MS;
}

/** Total fees (in euros) added on top of the mission price. */
export function getFeesEuros(urgentActive: boolean): number {
  return BASE_FEE_EUROS + (urgentActive ? URGENT_EXTRA_EUROS : 0);
}

/** Total amount (in euros) the requester pays: price + fees. */
export function getTotalEuros(prix: number, urgentActive: boolean): number {
  return prix + getFeesEuros(urgentActive);
}
