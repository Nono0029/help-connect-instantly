import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Rocket, Check, Sparkles, Loader2, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/context/LanguageContext";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import {
  initIAP,
  getIAPProducts,
  purchaseProduct,
  restorePurchases,
  getActivePurchases,
  manageSubscriptions,
  probeStore,
  getDefaultProducts,
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
  const [debugLine, setDebugLine] = useState<string | null>(null);
  const [probe, setProbe] = useState<string | null>(null);
  const [probeOk, setProbeOk] = useState<boolean | null>(null);
  const [probeElapsed, setProbeElapsed] = useState(0);
  const [buildInfo, setBuildInfo] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startElapsed = () => {
    stopElapsed();
    setElapsed(0);
    elapsedTimerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  };
  const stopElapsed = () => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  };
  useEffect(() => () => stopElapsed(), []);

  const product = products.find((p) => p.id === IAP_PRODUCTS.BOOST_MONTHLY) || null;

  const refreshBoost = async (silent = false) => {
    if (!user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("boost_until")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.boost_until) setBoostUntil(data.boost_until);
    else setBoostUntil(null);
    if (!silent) setLoading(false);
    return data?.boost_until ?? null;
  };

  const syncSubscription = async (silent = false) => {
    if (!user || !Capacitor.isNativePlatform()) return;
    try {
      const purchases = await getActivePurchases();
      const active = purchases.find((p) => p.productId === IAP_PRODUCTS.BOOST_MONTHLY);
      const { error } = await supabase.functions.invoke("verify-apple-receipt", {
        body: { receipt: active?.receipt || null },
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
      if (!Capacitor.isNativePlatform()) {
        setProducts(getDefaultProducts());
        return;
      }
      try {
        const info = await CapacitorApp.getInfo();
        setBuildInfo(`v${info.version} (${info.build})`);
      } catch {}
      setProbe("Test automatique de l'App Store en cours...");
      setProbeOk(null);
      setProbeElapsed(0);
      const probeTimer = setInterval(() => setProbeElapsed((s) => s + 1), 1000);
      try {
        const res = await probeStore((step) => setProbe(step));
        setProbe(res.message);
        setProbeOk(res.ok);
        // Fetch full product data only if the store responded
        if (res.ok) {
          try {
            const ps = await getIAPProducts();
            setProducts(ps);
          } catch {}
        }
      } catch (e: any) {
        setProbe(`Erreur probe : ${e?.message || e || "inconnue"}`);
        setProbeOk(false);
      } finally {
        clearInterval(probeTimer);
      }
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
    setDebugLine(null);
    if (!Capacitor.isNativePlatform()) {
      setDebugLine("Mode web détecté — l'achat nécessite l'app native (iOS).");
      toast.info(t('boost.webOnly'));
      return;
    }
    setActivating(true);
    startElapsed();
    // Safety: force-reset if promise hangs (covers init 45s*2 + check 30s + purchase 120s)
    const safetyTimer = setTimeout(() => setActivating(false), 300000);
    try {
      setDebugLine("Étape 1/4 : initialisation de l'App Store...");
      await initIAP();
      setDebugLine("Étape 2/4 : ouverture du paiement Apple...");
      const transaction = await purchaseProduct(IAP_PRODUCTS.BOOST_MONTHLY);

      if (!transaction) {
        setDebugLine("Achat annulé ou interrompu par le système.");
        return;
      }

      setDebugLine("Étape 3/4 : reçu reçu, vérification côté serveur...");
      const { data: verifyRes, error: verifyError } = await supabase.functions.invoke("verify-apple-receipt", {
        body: { receipt: transaction.receipt },
      });

      if (verifyError) {
        setDebugLine(`Étape 4/4 : erreur serveur — ${verifyError.message || "inconnue"}`);
        toast.error(t('boost.syncError'));
        return;
      }

      if (verifyRes?.active !== true) {
        setDebugLine(`Étape 4/4 : serveur a refusé l'activation (active=${String(verifyRes?.active)})`);
        toast.error("Le boost n'a pas pu être activé. Réessaie ou restaure tes achats.");
        return;
      }

      await refreshBoost(true);
      setDebugLine(null);
      toast.success(t('boost.activated'));
    } catch (err: any) {
      const msg = err?.message || "";
      setDebugLine(`Erreur : ${msg || "inconnue"}`);
      if (msg.includes("cancel") || msg.includes("user cancelled")) {
        toast.info(t('boost.paymentCancelled'));
      } else if (msg.includes("timeout")) {
        toast.error("Délai dépassé. Réessaie.");
      } else if (msg.includes("disponible") || msg.includes("introuvable") || msg.includes("non configuré") || msg.includes("pas encore actif")) {
        toast.error("L'abonnement n'est pas encore disponible. Réessaie plus tard.");
      } else if (msg.includes("reçu")) {
        toast.error("Erreur de réception. Réessaie ou restaure tes achats.");
      } else {
        toast.error("Erreur lors de l'achat. Réessaie.");
      }
    } finally {
      clearTimeout(safetyTimer);
      stopElapsed();
      setActivating(false);
    }
  };

  const handleRestore = async () => {
    if (!user || !Capacitor.isNativePlatform()) return;
    setRestoring(true);
    startElapsed();
    setDebugLine("Restauration des achats en cours...");
    try {
      const purchases = await restorePurchases();
      const active = purchases.find((p) => p.productId === IAP_PRODUCTS.BOOST_MONTHLY);
      if (active?.receipt) {
        setDebugLine("Achat trouvé, vérification côté serveur...");
        const { data: verifyRes, error } = await supabase.functions.invoke("verify-apple-receipt", {
          body: { receipt: active.receipt },
        });
        if (error) throw error;
        if (verifyRes?.active !== true) {
          setDebugLine("Achat trouvé mais expiré/annulé.");
          toast.info(t('boost.restoreError'));
          return;
        }
        await refreshBoost(true);
        setDebugLine(null);
        toast.success(t('boost.restored'));
      } else {
        setDebugLine("Aucun abonnement trouvé sur ce compte Apple.");
        toast.info(t('boost.restoreError'));
      }
    } catch (e: any) {
      setDebugLine(`Erreur restauration : ${e?.message || "inconnue"}`);
      toast.error(t('boost.syncError'));
    } finally {
      stopElapsed();
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
          <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
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
          {buildInfo && (
            <p className="text-[10px] font-mono text-muted-foreground/60">Build {buildInfo}</p>
          )}
          {probe && (
            <p
              className={`text-xs font-mono break-words px-2 py-2 rounded-lg border ${
                probeOk === null
                  ? "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20"
                  : probeOk
                  ? "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20"
                  : "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20"
              }`}
            >
              {probe}
              {probeOk === null && probeElapsed > 0 && ` (${probeElapsed}s)`}
            </p>
          )}
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
          {!isBoostActive && Capacitor.isNativePlatform() && (
            <div className="space-y-2 text-center text-xs text-muted-foreground pt-2 border-t border-border">
              <p>{t('boost.subscriptionTerms')}</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => window.open("https://askoo.fr/conditions", "_system")}
                  className="underline"
                >
                  {t('boost.terms')}
                </button>
                <button
                  onClick={() => window.open("https://askoo.fr/privacy", "_system")}
                  className="underline"
                >
                  {t('boost.privacy')}
                </button>
              </div>
            </div>
          )}
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
          {debugLine && (
            <p className="text-xs text-center text-amber-600 dark:text-amber-400 font-mono break-words px-2 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              {debugLine}
              {elapsed > 0 && ` (${elapsed}s)`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoostProfilePage;
