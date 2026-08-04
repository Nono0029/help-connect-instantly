import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Rocket, Check, Sparkles, Loader2, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/context/LanguageContext";
import { Capacitor } from "@capacitor/core";
import {
  initIAP,
  getIAPProducts,
  purchaseProduct,
  restorePurchases,
  getActivePurchases,
  manageSubscriptions,
  IAP_PRODUCTS,
  type IAPProduct,
} from "@/lib/iap";

const BoostProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [boostUntil, setBoostUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [products, setProducts] = useState<IAPProduct[]>([]);

  const product = products.find((p) => p.id === IAP_PRODUCTS.BOOST_MONTHLY) || null;

  const refreshBoost = async (silent = false) => {
    if (!user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("boost_until")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.boost_until) setBoostUntil(data.boost_until);
    if (!silent) setLoading(false);
    return data?.boost_until ?? null;
  };

  const syncSubscription = async (silent = false) => {
    if (!user || !Capacitor.isNativePlatform()) return;
    try {
      const purchases = await getActivePurchases();
      const active = purchases.find((p) => p.productId === IAP_PRODUCTS.BOOST_MONTHLY);
      if (!active?.receipt) return;
      const { error } = await supabase.functions.invoke("verify-apple-receipt", {
        body: { receipt: active.receipt },
      });
      if (error) throw error;
      await refreshBoost(true);
    } catch (err) {
      console.error("syncSubscription error:", err);
      if (!silent) toast.error(t('boost.syncError'));
    }
  };

  useEffect(() => {
    const fetchBoost = async () => {
      await refreshBoost();
      if (Capacitor.isNativePlatform()) {
        await syncSubscription(true);
      }
    };
    withTimeout(fetchBoost(), 20000, "boostProfile").catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    (async () => {
      try {
        const ps = await getIAPProducts();
        setProducts(ps);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removeListener: (() => void) | undefined;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const listener = await App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive && user) {
            await syncSubscription(true);
            await refreshBoost(true);
          }
        });
        removeListener = () => listener.remove();
      } catch {}
    })();
    return () => { removeListener?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isBoostActive = boostUntil && new Date(boostUntil) > new Date();

  const handleSubscribe = async () => {
    if (!user) return;
    if (!Capacitor.isNativePlatform()) {
      toast.info(t('boost.webOnly'));
      return;
    }
    setActivating(true);
    try {
      await initIAP();
      const transaction = await purchaseProduct(IAP_PRODUCTS.BOOST_MONTHLY);

      if (!transaction) return;

      const { error: verifyError } = await supabase.functions.invoke("verify-apple-receipt", {
        body: { receipt: transaction.receipt },
      });

      if (verifyError) {
        toast.error(t('boost.syncError'));
        return;
      }

      await refreshBoost(true);
      toast.success(t('boost.activated'));
    } catch (err: any) {
      if (err?.message?.includes("cancel")) {
        toast.info(t('boost.paymentCancelled'));
      } else {
        toast.error(t('boost.paymentError'));
      }
    } finally {
      setActivating(false);
    }
  };

  const handleRestore = async () => {
    if (!user || !Capacitor.isNativePlatform()) return;
    setRestoring(true);
    try {
      const purchases = await restorePurchases();
      const active = purchases.find((p) => p.productId === IAP_PRODUCTS.BOOST_MONTHLY);
      if (active?.receipt) {
        const { error } = await supabase.functions.invoke("verify-apple-receipt", {
          body: { receipt: active.receipt },
        });
        if (error) throw error;
        await refreshBoost(true);
        toast.success(t('boost.restored'));
      } else {
        toast.info(t('boost.restoreError'));
      }
    } catch {
      toast.error(t('boost.syncError'));
    } finally {
      setRestoring(false);
    }
  };

  const handleManage = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await manageSubscriptions();
    } catch {}
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const displayPrice = product?.displayPrice || "9,99 €";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-[env(safe-area-inset-top)] z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{t('boost.title')}</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Hero Card */}
        <div className="card-magic p-6 bg-magic-gradient dark:bg-cyan-gradient text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center">
            <Rocket className="w-10 h-10 text-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground">{t('boost.title')}</h2>
            <p className="text-sm text-foreground/70 mt-2 leading-relaxed">
              {t('boost.description')}
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="card-magic p-5 space-y-3">
          <h3 className="text-sm font-bold text-foreground">{t('boost.benefitsTitle')}</h3>
          {[
            t('boost.benefit1'),
            t('boost.benefit2'),
            t('boost.benefit3'),
            t('boost.benefit4'),
          ].map((benefit, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm text-foreground">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="card-magic p-5 text-center space-y-3">
          <Sparkles className="w-6 h-6 text-primary mx-auto" />
          <p className="text-lg font-black text-foreground">
            {t('boost.subscribeMonthly', { price: displayPrice })}
          </p>
          <p className="text-xs text-muted-foreground">{t('boost.cancelAnytime')}</p>
        </div>

        {/* Status */}
        {!loading && (
          <div className={`card-magic p-4 text-center ${isBoostActive ? "bg-primary/10 border-primary/30" : ""}`}>
            {isBoostActive ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-primary">
                  {t('boost.active', { date: formatDate(boostUntil!) })}
                </p>
                <Button
                  onClick={handleManage}
                  variant="outline"
                  className="w-full h-11 rounded-xl text-sm font-semibold"
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  {t('boost.manage')}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('boost.inactive')}</p>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="space-y-3">
          <Button
            onClick={handleSubscribe}
            disabled={activating || loading || isBoostActive}
            className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25"
          >
            {activating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Rocket className="w-4 h-4 mr-2" />
            )}
            {activating ? t('boost.activating') : isBoostActive ? t('boost.active', { date: formatDate(boostUntil!) }) : t('boost.subscribe')}
          </Button>
          {!isBoostActive && Capacitor.isNativePlatform() && (
            <Button
              onClick={handleRestore}
              disabled={restoring}
              variant="ghost"
              className="w-full h-11 rounded-xl text-sm font-medium text-muted-foreground"
            >
              {restoring ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              {t('boost.restore')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoostProfilePage;
