import { Capacitor } from "@capacitor/core";

export const IAP_PRODUCTS = {
  BOOST_MONTHLY: "boost_monthly",
  WALLET_5: "wallet_5",
  WALLET_10: "wallet_10",
  WALLET_20: "wallet_20",
  WALLET_50: "wallet_50",
  WALLET_100: "wallet_100",
  WALLET_200: "wallet_200",
  WALLET_500: "wallet_500",
  WALLET_1000: "wallet_1000",
} as const;

export type IAPProductId = typeof IAP_PRODUCTS[keyof typeof IAP_PRODUCTS];

export interface IAPProduct {
  id: string;
  displayName: string;
  displayPrice: string;
  description: string;
  credits: number;
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
    return result.products.map((p) => {
      const credits = getCreditsForProduct(p.identifier);
      return {
        id: p.identifier,
        displayName: p.title,
        displayPrice: p.priceString,
        description: p.description,
        credits,
      };
    });
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

function getCreditsForProduct(productId: string): number {
  const map: Record<string, number> = {
    [IAP_PRODUCTS.WALLET_5]: 5,
    [IAP_PRODUCTS.WALLET_10]: 10,
    [IAP_PRODUCTS.WALLET_20]: 20,
    [IAP_PRODUCTS.WALLET_50]: 50,
    [IAP_PRODUCTS.WALLET_100]: 100,
    [IAP_PRODUCTS.WALLET_200]: 200,
    [IAP_PRODUCTS.WALLET_500]: 500,
    [IAP_PRODUCTS.WALLET_1000]: 1000,
  };
  return map[productId] || 0;
}

export function getDefaultProducts(): IAPProduct[] {
  return [
    { id: IAP_PRODUCTS.BOOST_MONTHLY, displayName: "Boost 1 mois", displayPrice: "9,99 €", description: "Profil en tête des résultats + urgent gratuit", credits: 0 },
    { id: IAP_PRODUCTS.WALLET_5, displayName: "5 crédits", displayPrice: "4,99 €", description: "Recharge portefeuille", credits: 5 },
    { id: IAP_PRODUCTS.WALLET_10, displayName: "10 crédits", displayPrice: "9,99 €", description: "Recharge portefeuille", credits: 10 },
    { id: IAP_PRODUCTS.WALLET_20, displayName: "20 crédits", displayPrice: "19,99 €", description: "Recharge portefeuille", credits: 20 },
    { id: IAP_PRODUCTS.WALLET_50, displayName: "50 crédits", displayPrice: "49,99 €", description: "Recharge portefeuille", credits: 50 },
    { id: IAP_PRODUCTS.WALLET_100, displayName: "100 crédits", displayPrice: "99,99 €", description: "Recharge portefeuille", credits: 100 },
    { id: IAP_PRODUCTS.WALLET_200, displayName: "200 crédits", displayPrice: "199,99 €", description: "Recharge portefeuille", credits: 200 },
    { id: IAP_PRODUCTS.WALLET_500, displayName: "500 crédits", displayPrice: "499,99 €", description: "Recharge portefeuille", credits: 500 },
    { id: IAP_PRODUCTS.WALLET_1000, displayName: "1000 crédits", displayPrice: "999,99 €", description: "Recharge portefeuille", credits: 1000 },
  ];
}
