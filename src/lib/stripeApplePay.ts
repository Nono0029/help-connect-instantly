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

export async function payWithApplePay(
  clientSecret: string,
  amount: number,
  label: string
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const Stripe = await getStripe();

    await Stripe.createApplePay({
      paymentIntentClientSecret: clientSecret,
      merchantIdentifier: APPLE_MERCHANT_ID,
      countryCode: COUNTRY_CODE,
      currency: CURRENCY,
      paymentSummaryItems: [
        { label: label || "Mission", amount },
        { label: "Askoo", amount },
      ],
    });

    const { paymentResult } = await Stripe.presentApplePay();
    return paymentResult === "completed";
  } catch (err: any) {
    if (err?.message?.includes("cancel")) return false;
    console.error("Apple Pay error:", err);
    throw err;
  }
}
