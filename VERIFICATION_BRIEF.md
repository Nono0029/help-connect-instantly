# VERIFICATION_BRIEF.md — Audit complet de l'app Askoo

## Rôle attendu du vérificateur

Tu es un auditeur de code senior. Ton travail : **vérifier** que toute l'app est cohérente et fonctionnelle, **corriger** tout bug ou incohérence trouvé, puis **builder, committer, push et livrer** en OTA. Tu es autorisé à modifier le code, exécuter `npm run build`, `git commit`, `git push origin main` et `npx otakit upload dist --release`. Ne committe JAMAIS de secrets, jamais de valeurs de clés API, jamais `.env.local`.

---

## 1. Stack & architecture

| Couche | Techno |
|---|---|
| Front | React 18 + Vite + TypeScript + Tailwind |
| Mobile | Capacitor 6 (iOS uniquement en pratique), `appId: com.askoo.app`, `appName: askoo` |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions Deno) |
| Paiements | Stripe (PaymentIntent + Apple Pay natif) + Apple IAP (`@capgo/native-purchases`) + portefeuille interne (wallets) |
| Mise à jour | OtaKit (`.capgo` appId `0913f58f-4ccc-43b1-aee1-094ca3e984d1`, channel `base`, `npx otakit upload dist --release`) |
| Hosting web | Vercel (`vercel.json`, rewrites SPA) |

- `capacitor.config.ts` : Keyboard resize NATIVE (le code fait aussi `KeyboardResize.None` dans `main.tsx` — vérifier que les deux ne se contredisent pas), OtaKit avec `launchPolicy: apply-staged`, `resumePolicy: shadow`, `runtimePolicy: immediate`.
- `src/main.tsx` : `OtaKit.notifyAppReady()` + `Keyboard.setResizeMode({ mode: KeyboardResize.None })` côté natif uniquement.
- Répertoires : `src/pages/` (toutes les pages), `src/components/` (UI), `src/lib/` (stripe.ts, stripeApplePay.ts, iap.ts, urgentFee.ts, supabase.ts, utils.ts, validations.ts), `supabase/functions/` (8 edge functions), `ios/` (projet Xcode).

---

## 2. Système de paiement — LES 3 CANAUX (à vérifier en détail)

### Canal A — Stripe + Apple Pay natif (missions payées à l'unité)
Parcours : bouton noir "Payer avec Apple Pay" dans `ChatPage` → `handlePayment()` (ChatPage.tsx:495).

1. **Client** : `POST /functions/v1/create-payment` avec `{ mission_id, conversation_id }` + Bearer token (retry 3x sur erreur réseau, AbortController 15s).
2. **`create-payment`** : vérifie `demandeur_id === user.id`, pas de paiement déjà "payé"/"termine", prix > 0. Calcule les frais : `totalFees = referralExempt ? 0 : (urgentActive && !requesterBoosted ? 3 : 2)`. **ATTENTION : incohérence possible avec `pay-mission-wallet`/`pay-mission-iap` qui calculent `2 + urgentFee` (2€ base + 1€ urgent). `create-payment` fait `3` quand urgent sinon `2`. C'est équivalent en valeur (2+1=3) — mais vérifier la cohérence du code.** Crée un PaymentIntent Stripe EUR avec metadata `mission_id, helper_id, payeur_id, conversation_id`, insère `payments` statut `en_attente`, renvoie `clientSecret`.
3. **Client** : `payWithApplePay(clientSecret, total, titre)` (`src/lib/stripeApplePay.ts`) : `Stripe.initialize` → `isApplePayAvailable` → `createApplePay` (merchant `merchant.com.askoo.app`, FR/EUR, paymentSummaryItems) → `presentApplePay` (timeout 45s). Retourne `paymentResult === "completed"`.
4. **Webhook** `stripe-webhook` : `payment_intent.succeeded` → payment `en_attente` → `payé`, mission → `en_cours`, conversation → `en_cours`, `referral_fee_used=true` (si pas encore), notification au helper. `payment_intent.payment_failed` → payment `expiré`. `charge.refunded` → payment `remboursé`.
5. **Client post-pay** : re-fetch payments/mission, célébration, et `fetchMission(conversation)`.

### Canal B — Apple IAP pour missions (produits mission_5..50)
Parcours : sélection "Apple Pay" via IAP → `POST /functions/v1/pay-mission-iap` avec `{ mission_id, receipt, product_id }`.
- `MISSION_PRODUCT_AMOUNTS` : mission_5→5, mission_10→10, mission_15→15, mission_20→20, mission_25→25, mission_30→30, mission_40→40, mission_50→50.
- Vérifie le receipt Apple (prod puis sandbox si status 21007), l'idempotence par `reference: iap_mission_<transaction_id>`, mission existe, `demandeur_id === user.id`, pas déjà payé, `productAmount >= totalCost`.
- Débit : crédite le helper via `credit_wallet` (montant = prix, frais = commission plateforme), insère `payments` statut `payé`, mission → `en_cours`, `referral_fee_used`, notification. **En cas d'échec d'insertion payments : crédit reversé** (crédit négatif avec référence `_reversal`).

### Canal C — Portefeuille interne (wallets)
- `pay-mission-wallet` : solde requis, débite via `credit_wallet` (négatif), insère `payments` `payé`, mission `en_cours`, `referral_fee_used`, notification. Reversement si échec insert.
- `release-payment` : ne peut être appelé que si `helper_confirme && demandeur_confirme`, idempotent (statut `payé` → `termine`), crédite le wallet du helper AVANT de marquer `termine`, log CRITICAL si divergence.
- `withdraw-wallet` : exige IBAN + titulaire, solde suffisant, déduction atomique (condition sur balance), référence unique. Vérifier la fin du fichier (lignes 60-117) : création de l'ordre de retrait, idempotence.

### Vérifications à faire sur les paiements
- [ ] `create-payment` : les frais correspondent-ils à `urgentFee.ts` (`2€ base + 1€ urgent`, boost exempt, referral exempt) ?
- [ ] Les 3 canaux gèrent-ils l'idempotence et le "already paid" de la même façon ?
- [ ] Le webhook Stripe gère-t-il `payment_intent.succeeded` sans double-credit ? (statut `en_attente` requis)
- [ ] `release-payment` ne crédite qu'UNE fois (condition `statut: "payé"` + idempotence) ?
- [ ] Les montants sont-ils en cents côté Stripe (`Math.round(total * 100)`) et en euros côté client ?
- [ ] Le client ChatPage gère-t-il l'annulation Apple Pay (retour `false`) sans toast d'erreur ?
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` présente, Stripe configuré côté iOS (merchant `merchant.com.askoo.app` actif) ?

---

## 3. Abonnement Boost (mensuel, Apple IAP) — POURTANT INCOMPLET, À FINIR

- Produit : `boost_monthly` (sub) via `@capgo/native-purchases`, prix affiché par défaut 9,99 € (`src/lib/iap.ts` `getDefaultProducts`).
- `BoostProfilePage.tsx` : `initIAP`, `purchaseProduct(BOOST_MONTHLY)` → receipt envoyé à `verify-apple-receipt` → `profiles.boost_until` mis à jour → UI "Boost actif jusqu'au …".
- `verify-apple-receipt` (edge function) : vérifie le receipt (prod/sandbox), trouve la transaction `boost_monthly` la plus récente (par `expires_date`), insère `wallet_transactions` `type: boost_subscription` (idempotent par `reference: iap_sub_<original_transaction_id>`), met à jour `boost_until` (max entre actuel et expires_date), renvoie `{ success, type: "boost", active, until }`.
- **`restorePurchases()`** existe (bouton "Restaurer") et `manageSubscriptions()` (gestion App Store).
- **LE POINT QUE L'UTILISATEUR VEUT VÉRIFIER** : « l'abonnement qui n'est pas vraiment mis car on doit faire la vérification quand je sors l'app ».
  - Aujourd'hui, la sync de l'abonnement (`syncSubscription` → `getActivePurchases` + `verify-apple-receipt`) n'est appelée que dans `BoostProfilePage` (au mount + sur `appStateChange` local à la page).
  - **PROBLÈME PROBABLE** : quand l'app revient au premier plan depuis n'importe quelle AUTRE page (accueil, messages, chat…), `boost_until` n'est JAMAIS resynchronisé. L'expiration de l'abonnement (non-renouvellement, refus de paiement) n'est donc pas reflétée dans les badges boost des cartes de demande ni dans les frais.
  - **À CORRIGER** : déplacer/dupliquer un `appStateChange` GLOBAL (ex. dans `App.tsx` ou un hook `useSubscriptionSync` dans `src/hooks/`) qui, à chaque retour au premier plan (`isActive === true`) avec un utilisateur connecté sur iOS natif : `getActivePurchases()` → si un receipt boost actif existe → `verify-apple-receipt` (idempotent) → `refreshBoost`/état global. Aussi à l'ouverture de l'app (mount). Vérifier que l'état boost est propagé partout (Index badge pro, ChatPage fees, urgentFee).
  - Vérifier aussi : le listener `appStateChange` de `BoostProfilePage` n'est enregistré que si `user` existe (ok) et est bien retiré au démontage (`removeListener`).

---

## 4. Comptes, rôles et frais (urgentFee.ts)

- `isUrgentActive(urgent, createdAt)` : urgent === true/"true" ET < 7 jours après création. **Règle** : une demande "urgente" ne reste urgente que 7 jours.
- `getFeesEuros(urgentActive, isBoosted, referralExempt)` : referral → 0€ ; boost → 2€ ; sinon 2€ + 1€ si urgent actif.
- `isBoostActive(boostUntil)` : `boost_until > now`.
- Vérifier que chaque edge function (create-payment, pay-mission-wallet, pay-mission-iap) réplique EXACTEMENT cette logique côté serveur (c'est le point critique de cohérence prix client/serveur).

---

## 5. Clés API — OÙ ELLES VIVENT (NE PAS AFFICHER LES VALEURS, NE PAS COMMITTER)

> IMPORTANT : ne jamais écrire/committer/afficher les VALEURS de ces secrets. Elles se trouvent dans des fichiers .gitignore et des secrets Supabase. Le vérificateur peut les lire localement si nécessaire, mais ne doit pas les reproduire.

**Côté client (`.env.local`, gitignoré, + fallbacks dans le code) :**
- `VITE_STRIPE_PUBLISHABLE_KEY` → `src/lib/stripe.ts` et `src/lib/stripeApplePay.ts`
- `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` → `src/lib/supabase.ts` (fallback hardcodés : URL `https://tdymtslljytdihkblvwu.supabase.co` ; l'anon key est publique par nature — c'est une clé anon Supabase, OK en dur dans le bundle)
- `VERCEL_OIDC_TOKEN` (déploiement Vercel uniquement, dans `.env.local`)

**Côté serveur (secrets des Edge Functions Supabase — dashboard : Supabase → Edge Functions → Secrets) :**
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (service role ! jamais exposé au client)
- `STRIPE_SECRET_KEY` (create-payment, create-boost-payment, stripe-webhook)
- `STRIPE_WEBHOOK_SECRET` (stripe-webhook)
- `APPLE_SHARED_SECRET` (verify-apple-receipt, pay-mission-iap)

**À vérifier** : la présence de ces secrets dans Supabase, et que `src/lib/supabase.ts` n'utilise que la clé ANON (pas la service role).

---

## 6. Checklist de vérification globale

### Fonctionnel / UX
- [ ] Accueil : tri, filtres (catégories + tri dans le modal `SearchFilters`), état vide avec `home.beFirst*`, hero vert+jaune, badges boost ambré (NE PAS MODIFIER le badge boost des cartes).
- [ ] Mes demandes : boutons Archiver/Modifier/Supprimer (Supprimer discret, texte seul), modal de confirmation "Supprimer définitivement cette demande ?", compteur de réponses (badge vert, `responseCounts`).
- [ ] Messages : statuts colorés (vert = en cours via `text-primary`, ambre = en attente, gris = terminé/fermé), avatars `bg-avatar-gradient`.
- [ ] Profil/Paramètres : badge "Nouveau membre" si 0 avis, avatar gradient unifié partout, icône boost ambrée.
- [ ] Bouton retour : pilule grise `w-9 h-9 bg-secondary` SUR TOUTES les pages (16 pages — vérifier qu'aucune n'a échappé au changement).
- [ ] Chat : pilule blanche collée au clavier (`bottom: keyboardHeight - 6`), bouton CONFIRM à `calc(4.3rem + keyboardHeight)`, SOS avec double confirmation, illustration décorative en haut (w-20, opacity 10%, scrollable), un seul rappel de paiement (bouton Apple Pay).
- [ ] Chat : mesure clavier = plugin Capacitor primary + polling visualViewport fallback 2s (QuickType), ZERO buffer.
- [ ] iOS : pas de zoom sur input (text-size 16px), safe areas.

### Technique
- [ ] `npm run build` passe SANS erreur ni warning TS.
- [ ] `npm run lint` propre (eslint.config.js présent).
- [ ] Aucun `console.log` de debug oublié (`[pay]`, `payTrace`…) — tolérés provisoirement dans handlePayment mais à nettoyer si possible.
- [ ] Aucun secret dans le code commité (`grep -r "STRIPE_SECRET\|SERVICE_ROLE\|APPLE_SHARED" src/` → aucun résultat).
- [ ] Vérifier `git log --oneline -15` pour comprendre les derniers changements.

### BDD (Supabase) — schémas supposés
- `profiles`: id, pseudo, email, avatar_url, ville, boost_until, stripe_onboarding, iban, bank_holder_name, referred_by, referral_fee_used, email_verifie.
- `demandes`: id, titre, description, categorie, prix, gratuit, urgent, ville, lat, lng, user_id, archived, created_at.
- `conversations`: id, demande_id, helper_id, demandeur_id, statut, archived.
- `messages`: id, conversation_id, sender_id, content, created_at.
- `missions`: id, demande_id, helper_id, demandeur_id, statut, helper_confirme, demandeur_confirme, conversation_id.
- `payments`: id, mission_id, payeur_id, helper_id, montant, frais, statut (en_attente/payé/expiré/termine/remboursé), stripe_payment_intent, released_at, refunded_at.
- `wallets`: user_id, balance. `wallet_transactions`: reference (unique = idempotence), user_id, amount, type, description.
- `avis`: mission_id, auteur_id, cible_id, note, commentaire, verifie.
- `signals`, `notifications`, `notif_prefs`.
- RPCs: `credit_wallet`, `delete_demande`.

---

## 7. Workflow de livraison (après corrections)

```bash
npm run build
git add -A
git commit -m "fix(...): description claire"
git push origin main
npx otakit upload dist --release   # upload + release sur channel base
```

- NE PAS committer : `.env.local`, `dist/`, `ASKOO_CONTEXT.md`, `PUBLICATION_APP_STORE.md` (déjà gitignorés).
- Message de commit : français, préfixe `fix(...)`/`feat(...)`/`refactor(...)`, 1 ligne.
- Après upload OTA : vérifier la réponse `Uploaded ... and released to base channel`.

---

## 8. Corrige tout ce que tu trouves

En tant qu'auditeur, pour chaque problème identifié :
1. Corrige-le proprement (style du projet : Tailwind, composants `card-magic`/`btn-magic`, pas de commentaires inutiles).
2. `npm run build` après chaque série de changements.
3. Un seul commit par groupe logique de corrections.
4. Push + OTA à la fin (ou après chaque gros groupe).
5. Résume en français, à la fin, ce que tu as vérifié et corrigé (avec fichiers :lignes).
