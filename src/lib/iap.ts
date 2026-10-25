import { Capacitor } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE } from "@capgo/native-purchases";

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

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// StoreKit often returns [] on the first call after launch — retry before giving up
const PRODUCT_FETCH_ATTEMPTS = 3;
const PRODUCT_FETCH_RETRY_DELAY = 1500;

export async function initIAP(): Promise<void> {
  if (!Capacitor.isNativePlatform() || initialized) return;
  try {
    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
      Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

    const attempt = async () => {
      let lastCount = -1;
      for (let i = 1; i <= PRODUCT_FETCH_ATTEMPTS; i++) {
        const result = await withTimeout(
          NativePurchases.getProducts({
            productIdentifiers: Object.values(IAP_PRODUCTS),
            productType: PURCHASE_TYPE.SUBS,
          }),
          45000
        );

        lastCount = result?.products?.length ?? 0;
        if (lastCount > 0) {
          const foundProduct = result.products.find(p => p.identifier === IAP_PRODUCTS.BOOST_MONTHLY);
          if (!foundProduct) {
            throw new Error("Produit 'boost_monthly' non configuré dans App Store Connect");
          }
          return;
        }
        if (i < PRODUCT_FETCH_ATTEMPTS) {
          console.warn(`IAP init: 0 products (attempt ${i}/${PRODUCT_FETCH_ATTEMPTS}), retrying...`);
          await delay(PRODUCT_FETCH_RETRY_DELAY);
        }
      }
      throw new Error(`Aucun produit IAP trouvé dans App Store Connect (${PRODUCT_FETCH_ATTEMPTS} tentatives)`);
    };

    try {
      await attempt();
    } catch (err: any) {
      if (err?.message === "timeout") {
        console.warn("IAP init: first attempt timed out, retrying...");
        await attempt();
      } else {
        throw err;
      }
    }

    initialized = true;
  } catch (err) {
    console.error("IAP init error:", err);
    initialized = false;
    throw err;
  }
}

export async function getIAPProducts(): Promise<IAPProduct[]> {
  if (!Capacitor.isNativePlatform()) return getDefaultProducts();
  try {
    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
      Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
    const result = await withTimeout(
      NativePurchases.getProducts({
        productIdentifiers: Object.values(IAP_PRODUCTS),
        productType: PURCHASE_TYPE.SUBS,
      }),
      20000
    );
    if (!result.products || result.products.length === 0) {
      console.warn("Aucun produit IAP retourné par Apple");
      return getDefaultProducts();
    }
    return result.products.map((p) => ({
      id: p.identifier,
      displayName: p.title,
      displayPrice: p.priceString,
      description: p.description,
    }));
  } catch (err) {
    console.error("getIAPProducts error:", err);
    return getDefaultProducts();
  }
}

export interface StoreProbeResult {
  ok: boolean;
  message: string;
}

/**
 * Automatic App Store connectivity probe — runs on Boost page mount.
 * Steps: bridge plugin call → billing check → product fetch.
 * onProgress lets the UI show which step it is stuck on.
 */
export async function probeStore(onProgress?: (step: string) => void): Promise<StoreProbeResult> {
  const t0 = Date.now();
  const secs = () => `après ${((Date.now() - t0) / 1000).toFixed(0)}s`;
  if (!Capacitor.isNativePlatform()) return { ok: false, message: "Mode web (pas d'App Store)" };
  try {
    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
      Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

    // 0. Bridge health: trivial native call (no StoreKit involved)
    onProgress?.("Test du pont natif…");
    try {
      const v = await withTimeout(NativePurchases.getPluginVersion(), 8000);
      console.log("[probe] getPluginVersion:", JSON.stringify(v), secs());
    } catch (e) {
      console.log("[probe] getPluginVersion FAILED:", e);
      return { ok: false, message: `Pont natif KO — le plugin ne répond pas (${secs()})` };
    }

    // 1. Billing support (fast check)
    onProgress?.("Test facturation App Store…");
    try {
      const billing = await withTimeout(NativePurchases.isBillingSupported(), 15000);
      console.log("[probe] isBillingSupported:", JSON.stringify(billing), secs());
      if (billing && billing.isBillingSupported === false) {
        return { ok: false, message: `Facturation non supportée sur cet appareil (${secs()})` };
      }
    } catch (e) {
      console.log("[probe] isBillingSupported failed:", e);
      // continue — some environments don't implement this check
    }

    // 2. Product fetch (StoreKit often returns [] on first call — retry)
    let res: { products?: Array<{ identifier: string; priceString: string }> } | undefined;
    for (let i = 1; i <= PRODUCT_FETCH_ATTEMPTS; i++) {
      onProgress?.(i === 1 ? "Recherche des produits…" : `Recherche des produits… (tentative ${i}/${PRODUCT_FETCH_ATTEMPTS})`);
      res = await withTimeout(
        NativePurchases.getProducts({
          productIdentifiers: Object.values(IAP_PRODUCTS),
          productType: PURCHASE_TYPE.SUBS,
        }),
        45000
      );
      console.log(`[probe] getProducts count: ${res?.products?.length} (attempt ${i})`, secs());
      if (res?.products && res.products.length > 0) break;
      if (i < PRODUCT_FETCH_ATTEMPTS) await delay(PRODUCT_FETCH_RETRY_DELAY);
    }
    const p = res?.products?.find((x) => x.identifier === IAP_PRODUCTS.BOOST_MONTHLY);
    if (!p) {
      return {
        ok: false,
        message: `Apple n'a renvoyé aucun produit (${res?.products?.length ?? 0} trouvés, ${PRODUCT_FETCH_ATTEMPTS} tentatives) ${secs()}`,
      };
    }
    initialized = true;
    return { ok: true, message: `App Store OK — Boost à ${p.priceString} ${secs()}` };
  } catch (err: any) {
    console.log("[probe] error:", err);
    return { ok: false, message: `Échec App Store : ${err?.message || "inconnu"} ${secs()}` };
  }
}

export async function purchaseProduct(productId: string): Promise<IAPTransaction | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
      Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

    await initIAP();

    // Verify product exists before attempting purchase (retry — StoreKit cold start can return [])
    let productCheck: { products?: unknown[] } | undefined;
    for (let i = 1; i <= PRODUCT_FETCH_ATTEMPTS; i++) {
      productCheck = await withTimeout(
        NativePurchases.getProducts({
          productIdentifiers: [productId],
          productType: PURCHASE_TYPE.SUBS,
        }),
        30000
      );
      if (productCheck.products && productCheck.products.length > 0) break;
      if (i < PRODUCT_FETCH_ATTEMPTS) await delay(PRODUCT_FETCH_RETRY_DELAY);
    }
    if (!productCheck?.products || productCheck.products.length === 0) {
      throw new Error("Produit non disponible — abonnement pas encore actif sur l'App Store.");
    }

    const transaction = await withTimeout(
      NativePurchases.purchaseProduct({
        productIdentifier: productId,
        productType: PURCHASE_TYPE.SUBS,
      }),
      120000 // 120s — StoreKit sheet + Face ID can take a while
    );
    
    if (!transaction?.receipt) {
      throw new Error("Aucun reçu reçu d'Apple");
    }

    return {
      transactionId: transaction.transactionId,
      productId: transaction.productIdentifier,
      receipt: transaction.receipt,
      expirationDate: transaction.expirationDate,
      isActive: transaction.isActive,
    };
  } catch (err: any) {
    if (err?.message?.includes("cancel") || err?.message?.includes("user cancelled")) return null;
    if (err?.message === "timeout" || err?.message?.includes("timeout")) throw new Error("Le paiement a pris trop de temps. Réessaie.");
    if (err?.message?.includes("not found") || err?.message?.includes("invalid product")) throw new Error("Produit introuvable. Contactez le support.");
    console.error("IAP purchase error:", err);
    throw new Error(err?.message || "Erreur lors de l'achat. Réessaie.");
  }
}

export async function restorePurchases(): Promise<IAPTransaction[]> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    await NativePurchases.restorePurchases();
    return getActivePurchases();
  } catch {
    return [];
  }
}

export async function getActivePurchases(): Promise<IAPTransaction[]> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
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
