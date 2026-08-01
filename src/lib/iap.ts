import { Capacitor } from "@capacitor/core";

export const IAP_PRODUCTS = {
  BOOST_MONTHLY: "boost_monthly",
} as const;

export type IAPProductId = typeof IAP_PRODUCTS[keyof typeof IAP_PRODUCTS];

export interface IAPProduct {
  id: string;
  displayName: string;
  displayPrice: string;
  description: string;
}

let initialized = false;

async function getNativePurchases() {
  const { NativePurchases } = await import("@capgo/native-purchases");
  return NativePurchases;
}

export async function initIAP(): Promise<void> {
  if (!Capacitor.isNativePlatform() || initialized) return;
  try {
    const NativePurchases = await getNativePurchases();
    await NativePurchases.getProducts({
      productIdentifiers: Object.values(IAP_PRODUCTS),
    });
    initialized = true;
  } catch (err) {
    console.error("IAP init error:", err);
  }
}

export async function getIAPProducts(): Promise<IAPProduct[]> {
  if (!Capacitor.isNativePlatform()) return getDefaultProducts();
  try {
    const NativePurchases = await getNativePurchases();
    const result = await NativePurchases.getProducts({
      productIdentifiers: Object.values(IAP_PRODUCTS),
    });
    return result.products.map((p) => ({
      id: p.identifier,
      displayName: p.title,
      displayPrice: p.priceString,
      description: p.description,
    }));
  } catch {
    return getDefaultProducts();
  }
}

export async function purchaseProduct(productId: string): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const NativePurchases = await getNativePurchases();
    const transaction = await NativePurchases.purchaseProduct({
      productIdentifier: productId,
    });
    return transaction.receipt || transaction.transactionId || null;
  } catch (err: any) {
    if (err?.message?.includes("cancel")) return null;
    console.error("IAP purchase error:", err);
    throw err;
  }
}

export async function restorePurchases(): Promise<string[]> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    const NativePurchases = await getNativePurchases();
    await NativePurchases.restorePurchases();
    const { purchases } = await NativePurchases.getPurchases();
    return purchases
      .filter((p) => p.expirationDate && new Date(p.expirationDate) > new Date())
      .map((p) => p.productIdentifier);
  } catch {
    return [];
  }
}

export function getDefaultProducts(): IAPProduct[] {
  return [
    { id: IAP_PRODUCTS.BOOST_MONTHLY, displayName: "Boost 1 mois", displayPrice: "9,99 €", description: "Profil en tête des résultats + urgent gratuit" },
  ];
}
