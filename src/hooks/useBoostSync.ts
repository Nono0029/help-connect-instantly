import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";
import { getActivePurchases, IAP_PRODUCTS } from "@/lib/iap";

/**
 * Global Boost subscription sync.
 *
 * On native iOS, whenever the app returns to the foreground (or is opened),
 * re-reads the Apple Store purchases, re-validates the active Boost receipt
 * via the `verify-apple-receipt` edge function (idempotent server-side) so
 * `profiles.boost_until` always reflects the real subscription state —
 * including expiry after a failed renewal or a cancelled plan.
 *
 * `boostSyncVersion` increments after every completed sync so pages can
 * re-fetch their boost-dependent state (badges, fees, sorting).
 */
export function useBoostSync(userId?: string | null): { boostSyncVersion: number } {
  const [boostSyncVersion, setBoostSyncVersion] = useState(0);
  const syncingRef = useRef(false);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    const sync = async () => {
      if (!userIdRef.current || !Capacitor.isNativePlatform()) return;
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        const purchases = await getActivePurchases();
        const active = purchases.find((p) => p.productId === IAP_PRODUCTS.BOOST_MONTHLY);
        if (!active?.receipt) return;
        const { error } = await supabase.functions.invoke("verify-apple-receipt", {
          body: { receipt: active.receipt },
        });
        if (error) return;
        setBoostSyncVersion((v) => v + 1);
      } catch {
        // Silently ignore — the server state is refreshed on next foreground.
      } finally {
        syncingRef.current = false;
      }
    };

    let removeListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      (async () => {
        try {
          const { App } = await import("@capacitor/app");
          const listener = await App.addListener("appStateChange", ({ isActive }) => {
            if (isActive) sync();
          });
          removeListener = () => listener.remove();
        } catch {}
      })();
    }

    sync();

    return () => {
      removeListener?.();
    };
  }, [userId]);

  return { boostSyncVersion };
}
