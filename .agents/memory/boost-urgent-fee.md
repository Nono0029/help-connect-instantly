---
name: Boost/urgent fee logic
description: How boost subscription exempts users from the +1€ urgent surcharge; where the check lives on server and client.
---

Users with an active `profiles.boost_until > now` pay only the base 2€ fee even when the request is flagged urgent — no +1€ surcharge.

**Where the rule is enforced:**
- `src/lib/urgentFee.ts` — `isBoostActive(boostUntil)` helper; `getFeesEuros(urgentActive, isBoosted?)` and `getTotalEuros(prix, urgentActive, isBoosted?)` accept optional `isBoosted` (default false).
- `supabase/functions/create-payment/index.ts` — fetches `profiles.boost_until` for `user.id` (the demandeur initiating payment) and sets `isUrgentBillable = urgentActive && !requesterBoosted` before computing `frais`.
- `CreateRequestPage.tsx`, `PostDemandeForm.tsx`, `DemandeDetail.tsx` — each fetches `profiles.boost_until` on mount via `supabase.from("profiles").select("boost_until").eq("id", user.id)` and passes `isBoosted` to `getTotalEuros` for the price preview.

**Why:** Boosted users already pay 4.99€/month for visibility; charging them the urgent surcharge on top was a duplicate penalty.

**How to apply:** Any new page/component that shows a fee preview for an urgent request must also fetch the current user's boost status and pass it to `getTotalEuros`. The server-side create-payment function already handles this correctly.
