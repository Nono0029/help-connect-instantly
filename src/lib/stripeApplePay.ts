import { Capacitor } from "@capacitor/core";

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const APPLE_MERCHANT_ID = "merchant.com.askoo.app";
const COUNTRY_CODE = "FR";
const CURRENCY = "EUR";

let initialized = false;

async function getStripe() {
  const { Stripe } = await import("@capacitor-community/stripe");
  return Stripe;
}

export async function initStripe(): Promise<void> {
  if (!Capacitor.isNativePlatform() || initialized || !PUBLISHABLE_KEY) return;
  try {
    const Stripe = await getStripe();
    await Stripe.initialize({ publishableKey: PUBLISHABLE_KEY });
    initialized = true;
  } catch (err) {
    console.error("Stripe init error:", err);
  }
}

export async function isApplePayAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !PUBLISHABLE_KEY) return false;
  try {
    const Stripe = await getStripe();
    await Stripe.isApplePayAvailable();
    return true;
  } catch {
    return false;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

export async function payWithApplePay(
  clientSecret: string,
  amount: number,
  label: string
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (!PUBLISHABLE_KEY) throw new Error("Stripe n'est pas configuré (clé manquante)");

  const Stripe = await withTimeout(
    getStripe(),
    10000,
    "Erreur étape 1/5 : le plugin Stripe ne se charge pas (10 s)."
  );

  await withTimeout(
    Stripe.initialize({ publishableKey: PUBLISHABLE_KEY }),
    10000,
    "Erreur étape 2/5 : l'initialisation Stripe ne répond pas (10 s)."
  );

  try {
    await withTimeout(
      Stripe.isApplePayAvailable(),
      10000,
      "Erreur étape 3/5 : le contrôle Apple Pay ne répond pas (10 s)."
    );
  } catch (err: any) {
    if (err?.message?.includes("Erreur étape 3/5")) throw err;
    throw new Error(
      "Apple Pay n'est pas disponible sur cet appareil. Ajoute une carte dans Wallet et réessaie."
    );
  }

  await withTimeout(
    Stripe.createApplePay({
      paymentIntentClientSecret: clientSecret,
      merchantIdentifier: APPLE_MERCHANT_ID,
      countryCode: COUNTRY_CODE,
      currency: CURRENCY,
      paymentSummaryItems: [{ label: label || "Mission", amount }],
    }),
    10000,
    "Erreur étape 4/5 : la demande de paiement Apple Pay ne se crée pas (10 s)."
  );

  let paymentResult: string | undefined;
  try {
    ({ paymentResult } = await withTimeout(
      Stripe.presentApplePay(),
      45000,
      "Erreur étape 5/5 : la feuille Apple Pay ne s'est pas affichée. Vérifie que le marchand Apple Pay (merchant.com.askoo.app) est actif sur Stripe et qu'une carte est configurée dans Wallet."
    ));
  } catch (err: any) {
    if (/cancel/i.test(err?.message || "")) return false;
    throw err;
  }
  return paymentResult === "completed";
}
