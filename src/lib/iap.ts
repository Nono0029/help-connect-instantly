import { Capacitor } from "@capacitor/core";
import { PURCHASE_TYPE } from "@capgo/native-purchases";

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

export interface IAPTransaction {
  transactionId: string;
  productId: string;
  receipt?: string;
  expirationDate?: string;
  isActive?: boolean;
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
      productType: PURCHASE_TYPE.SUBS,
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
      productType: PURCHASE_TYPE.SUBS,
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

export async function purchaseProduct(productId: string): Promise<IAPTransaction | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const NativePurchases = await getNativePurchases();
    const transaction = await NativePurchases.purchaseProduct({
      productIdentifier: productId,
      productType: PURCHASE_TYPE.SUBS,
    });
    return {
      transactionId: transaction.transactionId,
      productId: transaction.productIdentifier,
      receipt: transaction.receipt,
      expirationDate: transaction.expirationDate,
      isActive: transaction.isActive,
    };
  } catch (err: any) {
    if (err?.message?.includes("cancel")) return null;
    console.error("IAP purchase error:", err);
    throw err;
  }
}

export async function restorePurchases(): Promise<IAPTransaction[]> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    const NativePurchases = await getNativePurchases();
    await NativePurchases.restorePurchases();
    return getActivePurchases();
  } catch {
    return [];
  }
}

export async function getActivePurchases(): Promise<IAPTransaction[]> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    const NativePurchases = await getNativePurchases();
    const { purchases } = await NativePurchases.getPurchases({
      productType: PURCHASE_TYPE.SUBS,
      onlyCurrentEntitlements: true,
    });
    return purchases
      .filter((p) => p.productIdentifier === IAP_PRODUCTS.BOOST_MONTHLY)
      .map((p) => ({
        transactionId: p.transactionId,
        productId: p.productIdentifier,
        receipt: p.receipt,
        expirationDate: p.expirationDate,
        isActive: p.isActive,
      }));
  } catch (err) {
    console.error("getActivePurchases error:", err);
    return [];
  }
}

export async function manageSubscriptions(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const NativePurchases = await getNativePurchases();
    await NativePurchases.manageSubscriptions();
  } catch (err) {
    console.error("manageSubscriptions error:", err);
  }
}

export function getDefaultProducts(): IAPProduct[] {
  return [
    { id: IAP_PRODUCTS.BOOST_MONTHLY, displayName: "Boost", displayPrice: "9,99 €", description: "Profil en tête des résultats + urgent gratuit" },
  ];
}
