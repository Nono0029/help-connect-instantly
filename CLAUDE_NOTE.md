# Askoo - Contexte Complet pour Claude

## Infos Projet

- **Repo GitHub**: `https://github.com/Nono0029/help-connect-instantly.git`
- **App**: Askoo (`com.askoo.app`) — plateforme d'entraide de voisinage française
- **Framework**: React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Framer Motion
- **Mobile**: Capacitor 8.3 + iOS (builds via Capgo cloud)
- **Backend**: Supabase (auth, DB, realtime, storage)
- **Paiements**: Stripe
- **OTA updates**: Capgo (`@capgo/capacitor-updater`)
- **Déploiement web**: Vercel (domaine: askoo.fr)
- **Version actuelle**: 1.0.17
- **Supabase URL**: `https://tdymtslljytdihkblvwu.supabase.co`
- **Supabase anon key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeW10c2xsanl0ZGloa2Jsdnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTQyMzgsImV4cCI6MjA5MTY3MDIzOH0.nWLKkZ8_0m3TFXPQs2VRgRpkUmM4ZP8PUPyRIVyWlis`
- **Capgo API key**: `b26f2657-1fee-4d3b-82a8-e4ce3d9bcc76`
- **Apple Team ID**: `W9Y56L27YU`
- **Supabase admin email**: `admin@askoo.fr`
- **Build commands**:
  - Web: `npm run build` → deploy Vercel: `npx vercel --prod --yes`
  - OTA: `npx @capgo/cli bundle upload com.askoo.app --path ./dist --channel production`
  - Native: `npx @capgo/cli build request com.askoo.app --platform ios --path .`

---

## Bugs Persistants (ce qu'il reste à corriger)

### 1. L'app native iOS plante / tourne en boucle / charge éternellement
**Statut**: Corrigé en v1.0.17 (limits ajoutées, channels réduits, orbs supprimés) MAIS pas encore testé car le build TestFlight (20260715160368) est encore en upload.
**Ce qu'il faut faire**:
- Vérifier que le build TestFlight est bien dispo sur App Store Connect
- Tester l'app native après install du nouveau build
- Si ça plante encore, regarder les crash logs via Xcode > Window > Organizer > Crashes

### 2. Camera : l'app crash quand on prend une photo
**Statut**: partiellement corrigé en v1.0.16 (busyRef ajouté, timeout upload, mountedRef cleanup)
**Racine du problème**: L'ancien build natif a des imports statiques de `@capacitor/camera` qui crashent. Les imports dynamiques ont été ajoutés mais l'ancien binaire natif est toujours sur les appareils.
**Ce qu'il faut faire**:
- Attendre que le nouveau build natif soit installé (pas juste l'OTA, le vrai binaire IPA)
- Vérifier que les permissions camera sont bien dans `Info.plist`
- Si ça plante encore: capturer le crash log, chercher `CapacitorCamera` ou `CameraPlugin`

### 3. Camera : affiche 2 photos au lieu d'1 quand on en prend une
**Statut**: Corrigé en v1.0.16 (busyRef empêche les double-taps)
**Racine du problème**: Les boutons Camera et Gallery n'étaient pas désactivés pendant que la caméra native était ouverte (uploadingPhoto n'était true qu'APRÈS le retour de la caméra). Le busyRef bloque maintenant les deux boutons dès le premier clic.
**Ce qu'il faut faire**:
- Tester sur le web (askoo.fr) d'abord pour valider le fix
- Si toujours 2 photos: vérifier que le `busyRef` est bien à `true` pendant l'ouverture de la caméra

### 4. Le chargement se bloque (spinner qui tourne indéfiniment)
**Statut**: partiellement corrigé en v1.0.17 (limits sur toutes les requêtes)
**Racine du problème**: Les requêtes Supabase sans `.limit()` renvoyaient des milliers de lignes, gelant le WebView iOS. Maintenant limité à 100 demandes, 200 messages, 50 notifications, 30 conversations.
**Ce qu'il faut faire**:
- Si ça plante encore après le nouveau build: vérifier la console Safari (inspecter via cable USB) pour voir quelle requête est lente
- Vérifier les indexes Supabase sur les colonnes `conversation_id`, `user_id`, `statut`
- Envisager d'ajouter des indexes DB pour les colonnes fréquemment queryées

### 5. Le message qu'on envoie n'apparaît pas immédiatement
**Statut**: Corrigé en v1.0.17 (append optimiste au lieu de full refetch)
**Ce qu'il faut faire**:
- Tester: envoyer un message, vérifier qu'il apparaît immédiatement
- Si le message double (apparaît 2 fois): le guard `prev.some(m => m.id === newMsg.id)` ne fonctionne pas, vérifier que les IDs sont bien uniques

### 6. Les notifications arrivent avec du retard
**Statut**: Le channel realtime est bien configuré avec filtre `user_id=eq.${user.id}`
**Ce qu'il faut faire**:
- Vérifier que le realtime est bien activé sur la table `notifications` dans Supabase Dashboard > Database > Replication
- Le `.limit(50)` peut cacher des notifs anciennes — OK car c'est un display limit

---

## Bugs Visuels / UX mineurs

### 7. Les orbes animés ont été supprimés — le fond est maintenant vide
**Ce qu'il faut faire**: Si tu veux garder un fond joli, ajouter un gradient CSS simple au lieu des 6 orbes blur

### 8. Le chat n'a plus de channel "conversation" — les changements de statut de conversation ne se mettent plus à jour en temps réel
**Ce qu'il faut faire**: Soit réajouter le channel conv avec un filtre limité, soit refetcher le conversation quand on envoie un message ou une action

---

## Structure des Fichiers

```
src/
├── App.tsx                    # Routeur, providers, ErrorBoundary
├── main.tsx                   # Init Capacitor updater (dynamic import)
├── index.css                  # Global styles + animations
├── lib/supabase.ts            # Client Supabase
├── lib/utils.ts               # getDistance, formatTimeAgo
├── lib/urgentFee.ts           # Calcul frais urgence/boost
├── context/AuthContext.tsx     # Auth (loading race condition fixé, isAdmin/isBlocked)
├── context/LanguageContext.tsx # i18n français
├── hooks/useTheme.tsx         # Dark mode
├── hooks/useNotifications.ts  # Notifs (limit 50, capped real-time)
├── hooks/useCameraUpload.ts   # Camera/gallery (busyRef, timeout 15s, mountedRef cleanup)
├── components/
│   ├── ProtectedRoute.tsx     # Spinner loading -> redirect /auth
│   ├── ErrorBoundary.tsx      # Catch render errors
│   ├── BottomNav.tsx          # Nav bas (caché sur auth/chat)
│   ├── PostDemandeForm.tsx    # Formulaire création demande (resetBusy on open)
│   ├── NotificationBell.tsx   # Cloche notifs dropdown
│   ├── SearchFilters.tsx      # Filtres recherche
│   ├── CityPicker.tsx         # Sélecteur ville
│   ├── MapView.tsx            # Carte Leaflet
│   ├── ImageLightbox.tsx      # Visionneuse images
│   └── ui/                    # Composants shadcn/ui
├── pages/
│   ├── Index.tsx              # Home (limit 100 demandes, 500 missions completed)
│   ├── AuthPage.tsx           # Login/signup
│   ├── ChatPage.tsx           # Chat (limit 200 msg, 3 channels, optimistic append)
│   ├── MessagesPage.tsx       # Conversations (server-side filter, limit 30)
│   ├── ProfilePage.tsx        # Profil (limit 50 avis, 30 missions)
│   ├── Settings.tsx           # Paramètres + profil
│   ├── EditProfile.tsx        # Édition profil
│   ├── DemandeDetail.tsx      # Détail demande
│   ├── MesDemandesPage.tsx    # Mes demandes
│   ├── MonPortefeuille.tsx    # Wallet/solde
│   ├── PaymentSetup.tsx       # Setup Stripe
│   ├── CreateRequestPage.tsx  # Créer demande (avec géoloc)
│   ├── BoostProfilePage.tsx   # Boost profil payant
│   ├── BecomeProPage.tsx      # Devenir pro
│   ├── AdminReportsPage.tsx   # Admin signalements (limit 50)
│   ├── AidePage.tsx           # Page aide/FAQ
│   ├── ChangePassword.tsx     # Changement mdp
│   └── PrivacyPage.tsx        # Politique confidentialité
├── components/EmptyState.tsx  # État vide
└── index.css                  # Animations bg-orb (supprimées du render)
```

---

## Commandes Utiles

```bash
# Dev local
npm install
npm run build && npx vite preview

# Deploy web Vercel
npx vercel --prod --yes

# Deploy OTA Capgo (JS only, pas de rebuild natif)
npx @capgo/cli bundle upload com.askoo.app --path ./dist --channel production

# Build iOS natif (Capgo cloud, upload TestFlight)
npx @capgo/cli build request com.askoo.app --platform ios --path .

# Vérifier status build Capgo
npx @capgo/cli build info com.askoo.app
```

---

## Règles Importantes

1. **JAMAIS d'import statique** de `@capacitor/camera`, `@capacitor/app`, `@capacitor/browser` — TOUJOURS `await import()` dynamique. Les imports statiques crashent les anciens builds natifs.
2. **TOUJOURS `.limit()`** sur les requêtes Supabase — sinon l'app crash sur iOS (mémoire WebView).
3. **`defaultChannel: 'production'`** dans `capacitor.config.ts` — requis pour que les OTA fonctionnent.
4. **`notifyAppReady()`** dans `main.tsx` — requis pour que Capgo sache que le bundle est stable.
5. **`mountedRef` cleanup** dans TOUS les `useEffect` async — évite les setState sur composant démonté.
6. **`busyRef`** pour les opérations async qui ouvrent des UI natives (caméra) — empêche les double-taps.

---

## Credentials / Clés API

### Supabase
- **URL**: `https://tdymtslljytdihkblvwu.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeW10c2xsanl0ZGloa2Jsdnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTQyMzgsImV4cCI6MjA5MTY3MDIzOH0.nWLKkZ8_0m3TFXPQs2VRgRpkUmM4ZP8PUPyRIVyWlis`
- **Dashboard**: `https://supabase.com/dashboard/project/tdymtslljytdihkblvwu`

### Capgo (OTA + Builds natifs)
- **API Key**: `b26f2657-1fee-4d3b-82a8-e4ce3d9bcc76`
- **Console**: `https://console.capgo.app`
- **Trial expire**: ~2026-07-29

### Apple / App Store Connect
- **Team ID**: `W9Y56L27YU`
- **App Store Connect API Key ID**: `DV42D4UN4P`
- **App Store Connect Issuer ID**: `a0137349-f59e-40ff-ac79-b8e7ef51a151`
- **App Store Connect API Private Key**:
```
-----BEGIN PRIVATE KEY-----
MIIGvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC5Ml/mhXQYR9qt
fXlzeErZSOwSJda4olO5++i9gubLeBL9QaT3WHFmBJf8TuR5x7eGBeP8ttMQ47cR
QbBvUBpaFnuWGZFnxxlJYD6WRPf... (voir fichier complet ci-dessous)
```
- **Certificate P12**: `MIILzgIBAzCCC5QGCSqGSIb3DQEHAaCCC4UEgguBMIILfTCCBjQ...`
- **P12 Password**: `capgo`
- **Provisioning Profile**: Capgo com.askoo.app AppStore (App Store distribution)
- **Bundle ID**: `com.askoo.app`

### Vercel
- **Project**: `askoo` (nono4/askoo)
- **Domain**: `askoo.fr`
- **CLI**: `npx vercel --prod --yes`
- **Dashboard**: `https://vercel.com/nono4/askoo`

### GitHub
- **Repo**: `https://github.com/Nono0029/help-connect-instantly.git`
- **Branch**: `main`

### Stripe
- **Clé publique**: chercher `pk_test_` ou `pk_live_` dans le code ou dans `.env`
- **Dashboard**: `https://dashboard.stripe.com`

---

## Fichier complet credentials Apple (pour Capgo)

Le fichier complet est ici: `/Users/noabelarbi/.capgo-credentials/credentials.json`
Contenu complet:

```json
{
  "com.askoo.app": {
    "ios": {
      "BUILD_CERTIFICATE_BASE64": "MIILzgIBAzCCC5QGCSqGSIb3DQEHAaCCC4UEgguBMIILfTCCBjQGCSqGSIb3DQEHAaCCBiUEggYhMIIGHTCCBhkGCyqGSIb3DQEMCgEDoIIF4TCCBd0GCiqGSIb3DQEJFgGgggXNBIIFyTCCBcUwggStoAMCAQICEGwCqgLX/9P4Z9i5Hw/jZq0wDQYJKoZIhvcNAQELBQAwdTFEMEIGA1UEAww7QXBwbGUgV29ybGR3aWRlIERldmVsb3BlciBSZWxhdGlvbnMgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkxCzAJBgNVBAsMAkczMRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzAeFw0yNjA3MTUyMjUxNTJaFw0yNzA3MTUyMjUxNTFaMIGLMRowGAYKCZImiZPyLGQBAQwKVzlZNTZMMjdZVTE1MDMGA1UEAwwsQXBwbGUgRGlzdHJpYnV0aW9uOiBub2EgYmVsYXJiaSAoVzlZNTZMMjdZVSkxEzARBgNVBAsMClc5WTU2TDI3WVUxFDASBgNVBAoMC25vYSBiZWxhcmJpMQswCQYDVQQGEwJVUzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALEyX+aFdBhH2q19eXN4StlI7BIl1riiU7n76L2C5st4Ev1BpPdYcWYEl/xO5HnHt4YF4/y20xDjtxFBsG9QGloWe5YZkWfGOUlgPpZE/+bT1qJHZkPJaSsS8bRvrXO8yDzIOQ07zuzG/mxBN+GhcP6fK4bgOFb+XcmZO6FE2JCtY1LzMZZKS/g8VJlCjKbeqRc0jn9Yr2szVV1gw0wc8PtcHnzHyMFH9mewdnxEXM9k9+jzVXgqiT93SLPtRptGzsBCcK3Iti2LJZYCKC6eNJYXOZG4d1Gtn8zbFL4BZnrjOOmRCQ1h3ACvhMTxVfUIX5D82oRzJNV7tH8payKU4a0CAwEAAaOCAjgwggI0MAwGA1UdEwEB/wQCMAAwHwYDVR0jBBgwFoAUCf7AFZD5r2QKkhK5JihjDJfsp7IwcAYIKwYBBQUHAQEEZDBiMC0GCCsGAQUFBzAChiFodHRwOi8vY2VydHMuYXBwbGUuY29tL3d3ZHJnMy5kZXIwMQYIKwYBBQUHMAGGJWh0dHA6Ly9vY3NwLmFwcGxlLmNvbS9vY3NwMDMtd3dkcmczMDUwggEeBgNVHSAEggEVMIIBETCCAQ0GCSqGSIb3Y2QFATCB/zCBwwYIKwYBBQUHAgIwgbYMgbNSZWxpYW5jZSBvbiB0aGlzIGNlcnRpZmljYXRlIGJ5IGFueSBwYXJ0eSBhc3N1bWVzIGFjY2VwdGFuY2Ugb2YgdGhlIHRoZW4gYXBwbGljYWJsZSBzdGFuZGFyZCB0ZXJtcyBhbmQgY29uZGl0aW9ucyBvZiB1c2UsIGNlcnRpZmljYXRlIHBvbGljeSBhbmQgY2VydGlmaWNhdGlvbiBwcmFjdGljZSBzdGF0ZW1lbnRzLjA3BggrBgEFBQcCARYraHR0cHM6Ly93d3cuYXBwbGUuY29tL2NlcnRpZmljYXRlYXV0aG9yaXR5LzAWBgNVHSUBAf8EDDAKBggrBgEFBQcDAzAdBgNVHQ4EFgQUVeh2j/dgaT7KVcR793V7amWpF1cwDgYDVR0PAQH/BAQDAgeAMBMGCiqGSIb3Y2QGAQcBAf8EAgUAMBMGCiqGSIb3Y2QGAQQBAf8EAgUAMA0GCSqGSIb3DQEBCwUAA4IBAQDU5pnPaaiHAz6fgNplGjCpytjDA+cyqyAIAbsrdV/7oHs1BsfEQakUM6rEfz04v5mj32DS7MdM94j5LED9+fwYwr/HGzm9N+MVFOsqKA/h0ReVjryo5DMho5vKlX8meDOapHsOYe7jYHxI4XH/wjbLC95i2rOhVSPHTJ3thdkyZxtnUHMXOe8rUOSPem36X",
      "P12_PASSWORD": "capgo",
      "CAPGO_IOS_PROVISIONING_MAP": "{\"com.askoo.app\":{\"profile\":\"MIIvaQYJKoZIhvcNAQcCoIIvWjCCL1YCAQExCzAJBgUrDgMCGgUAMIIfdgYJKoZIhvcNAQcBoIIfZwSCH2M8P3htbCB2ZXJzaW9uPSIxLjAiIGVuY29kaW5nPSJVVEYtOCI/Pgo8IURPQ1RZUEUgcGxpc3QgUFVCTElDICItLy9BcHBsZS8vRFREIFBMSVNUIDEuMC8vRU4iICJodHRwOi8vd3d3LmFwcGxlLmNvbS9EVERzL1Byb3BlcnR5TGlzdC0xLjAuZHRkIj4KPHBsaXN0IHZlcnNpb249IjEuMCI+CjxkaWN0PgoJPGtleT5BcHBJRE5hbWU8L2tleT4KCTxzdHJpbmc+Q2FwZ28gY29tIGFza29vIGFwcDwvc3RyaW5nPgoJPGtleT5BbHBsaWNhdGlvbklkZW50aWZpZXJQcmVmaXg8L2tleT4KCTxhcnJheT4KCTxzdHJpbmc+VzlZNTZMMjdZVTwvc3RyaW5nPgoJPC9hcnJheT4KCTxrZXk+Q3JlYXRpb25EYXRlPC9rZXk+Cgk8ZGF0ZT4yMDI2LTA3LTE1VDIzOjAxOjUzWjwvZGF0ZT4KCTxrZXk+UGxhdGZvcm08L2tleT4KCTxhcnJheT4KCQk8c3RyaW5nPmlPUzwvc3RyaW5nPgoJCTxzdHJpbmc+eHJPUzwvc3RyaW5nPgoJCTxzdHJpbmc+dmlzaW9uT1M8L3N0cmluZz4KCTwvYXJyYXk+Cgk8a2V5PklzWGNvZGVNYW5hZ2VkPC9rZXk+Cgk8ZmFsc2UvPgoJPGtleT5EZXZlbG9wZXJDZXJ0aWZpY2F0ZXM8L2tleT4KCTxhcnJheT4KCQk8ZGF0YT5NSUlGeFRDQ0JLMmdBd0lCQWdJUWJBS3FBdGYvMC9objJMa2ZEK05tclRBTkJna3Foa2lHOXcwQkFRc0ZBREIxTVVRd1FnWURWUVFERER0QmNIQnNaU0JYYjNKc1pIZHBaR1VnUkdWMlpXeHZjR1Z5SUZKbGJHRjBhVzl1Y3lCRFpYSjBhV1pwWTJGMGFXOXVJRUYxZEdodmNtbDBlVEVMTUFrR0ExVUVDd3dDUnpNeEV6QVJCZ05WQkFvTUNrRndjR3hsSUVsdVl5NHhDekFKQmdOVkJBWVRBbFZUTUI0WERUSTJNRGN4TlRJeU5URTFNbG9YRFRJM01EY3hOVEl5TlRFMU1Wb3dnWXN4R2pBWUJnb0praWFKay9Jc1pBRUJEQXBYT1ZrMU5rd3lOMWxWTVRVd013WURWUVFEREN4QmNIQnNaU0JFYVhOMGNtbGlkWFJwYjI0NklHNXZZU0JpWld4aGNtSnBJQ2hYT1ZrMU5rd3lOMWxWS1RFVE1CRUdBMVVFQ3d3S1Z6bFpOVFpNTWpkWlZURVVNQklHQTFVRUNnd0xibTloSUdKbGJHRnlZbWt4Q3pBSkJnTlZCQVlUQWxWVE1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBc1RKZjVvVjBHRWZhclgxNWMzaEsyVWpzRWlYV3VLSlR1ZnZvdllMbXkzZ1MvVUdrOTFoeFpnU1gvRTdrZWNlM2hnWGovTGJURU9PM0VVR3diMUFhV2haN2xobVJaOFk1U1dBK2xrVC81dFBXb2tkbVE4bHBLeEx4dEcrdGM3eklQTWc1RFR2TzdNYitiRUUzNGFGdy9wOHJodUE0VnY1ZHlaazdvVVRZa0sxalV2TXhsa3BMK0R4VW1VS01wdDZwRnpTT2YxaXZhek5WWFdERFRCencrMXdlZk1mSXdVZjJaN0IyZkVSY3oyVDM2UE5WZUNxSlAzZElzKzFHbTBiT3dFSndyY2kyTFlzbGxnSW9McDQwbGhjNWtiaDNVYTJmek5zVXZnRm1ldU00NlpFSkRXS0F5UUdZQ01JR0F3RGdZSklCQWdFaU1DQU9DQU1BQUdBUUFBQUFBQUFBQXdBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQQ==\",...\"}}"
      "APP_STORE_CONNECT_TEAM_ID": "W9Y56L27YU",
      "CAPGO_IOS_DISTRIBUTION": "app_store",
      "APPLE_KEY_ID": "DV42D4UN4P",
      "APPLE_ISSUER_ID": "a0137349-f59e-40ff-ac79-b8e7ef51a151",
      "APPLE_KEY_CONTENT": "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR1RBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJIa3dkd0lCQVFRZy9zUTJQN0FGZGVMYzRuOEEKNnVpVE5hTXBWQXVESjdxOEVDeE93VGRDSzdPZ0NnWUlLb1pJemowREFRZWhSQU5DQUFSelhjS01ydjRuRitXNgpQTnZSRSt0VjVFUG5JYmZRYTJZdnNQdGpxczVIY2J2ZzZyak5aL0FyOHR5U1Z2dGVzdmtUbUU0Qmh5Sm1xdWh6CloxMnAySG5QCi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0=",
      "PROVISIONING_PROFILE": "MIIvaQYJKoZIhvcNAQcCoIIvWjCCL1YCAQExCzAJBgUrDgMCGgUAMIIfdgYJKoZIhvcNAQcBoIIfZwSCH2M8..."
    }
  }
}
```

**ATTENTION**: Ces clés sont sensibles. Ne les partage JAMAIS publiquement. Ce fichier est uniquement pour ton usage personnel avec Claude.
