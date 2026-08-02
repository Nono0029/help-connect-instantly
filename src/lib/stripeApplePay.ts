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

  await initStripe();

  if (!(await isApplePayAvailable())) {
    throw new Error("Apple Pay n'est pas disponible sur cet appareil. Ajoute une carte dans Wallet et réessaie.");
  }

  try {
    const Stripe = await getStripe();

    await Stripe.createApplePay({
      paymentIntentClientSecret: clientSecret,
      merchantIdentifier: APPLE_MERCHANT_ID,
      countryCode: COUNTRY_CODE,
      currency: CURRENCY,
      paymentSummaryItems: [{ label: label || "Mission", amount }],
    });

    const { paymentResult } = await withTimeout(
      Stripe.presentApplePay(),
      45000,
      "La feuille Apple Pay ne s'est pas affichée. Vérifie que le marchand Apple Pay (merchant.com.askoo.app) est actif sur Stripe et qu'une carte est configurée dans Wallet."
    );
    return paymentResult === "completed";
  } catch (err: any) {
    if (err?.message?.includes("cancel")) return false;
    console.error("Apple Pay error:", err);
    throw err;
  }
}
