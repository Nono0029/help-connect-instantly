// Shared pricing logic for mission fees and urgent status.
//
// Fees: 2€ base fee, +1€ extra if the request is still urgent.
// A request stays "urgent" for 7 days after creation; after that the
// urgent surcharge and badge disappear even though the `urgent` flag
// may still be true in the database.
//
// Boosted users (active boost_until > now) are exempt from the +1€
// urgent surcharge — they already pay 4.99€/month for visibility.

export const BASE_FEE_EUROS = 2;
export const URGENT_EXTRA_EUROS = 1;
export const URGENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Whether a request's urgent badge/sort should still apply.
 * For display purposes only — use `getFeesEuros` to determine
 * whether the fee applies (which also factors in `isBoosted`).
 *
 * Treats missing or invalid `createdAt` as inactive (matches server
 * behavior) to avoid showing a payment button for a request the
 * server would reject. For brand-new forms without a `created_at`
 * yet, don't call this — use the user's toggle state directly.
 */
export function isUrgentActive(urgent: boolean | null | undefined, createdAt?: string | null): boolean {
  if (!urgent || !createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created < URGENT_WINDOW_MS;
}

/**
 * Whether the user's boost subscription is currently active.
 */
export function isBoostActive(boostUntil?: string | null): boolean {
  if (!boostUntil) return false;
  return new Date(boostUntil).getTime() > Date.now();
}

/**
 * Total fees (in euros) added on top of the mission price.
 * Boosted users pay only the base fee — no urgent surcharge.
 */
export function getFeesEuros(urgentActive: boolean, isBoosted = false): number {
  const urgentSurcharge = urgentActive && !isBoosted ? URGENT_EXTRA_EUROS : 0;
  return BASE_FEE_EUROS + urgentSurcharge;
}

/** Total amount (in euros) the requester pays: price + fees. */
export function getTotalEuros(prix: number, urgentActive: boolean, isBoosted = false): number {
  return prix + getFeesEuros(urgentActive, isBoosted);
}
