import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Rocket, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/context/LanguageContext";
import { Capacitor } from "@capacitor/core";

const BoostProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [boostUntil, setBoostUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    const fetchBoost = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("boost_until")
        .eq("id", user.id)
        .maybeSingle();

      if (data?.boost_until) {
        setBoostUntil(data.boost_until);
      }
      setLoading(false);
    };
    fetchBoost();
  }, [user?.id]);

  // Stripe's webhook is the only place that activates the boost.
  useEffect(() => {
    const refreshBoostAfterPayment = async () => {
      if (!user || searchParams.get("boost") !== "success") return;

      const { data, error } = await supabase
        .from("profiles")
        .select("boost_until")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data?.boost_until && new Date(data.boost_until) > new Date()) {
        setBoostUntil(data.boost_until);
        toast.success(t('boost.activated'));
      }
    };
    refreshBoostAfterPayment();
  }, [user?.id, searchParams, t]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removeListener: (() => void) | undefined;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const listener = await App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive && user) {
            const { data } = await supabase
              .from("profiles")
              .select("boost_until")
              .eq("id", user.id)
              .maybeSingle();
            if (data?.boost_until && new Date(data.boost_until) > new Date()) {
              setBoostUntil(data.boost_until);
            }
          }
        });
        removeListener = () => listener.remove();
      } catch {}
    })();
    return () => { removeListener?.(); };
  }, [user?.id]);

  const isBoostActive = boostUntil && new Date(boostUntil) > new Date();

  const handleActivate = async () => {
    if (!user) return;
    setActivating(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-boost-payment", {
        body: {},
      });

      if (error || !data?.url) {
        throw new Error(error?.message || "Erreur de paiement");
      }

      if (Capacitor.isNativePlatform()) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: data.url });
      } else {
        window.location.href = data.url;
      }
      setActivating(false);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors du paiement");
      setActivating(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
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
          <h3 className="text-sm font-bold text-foreground">Avantages</h3>
          {[
            "Apparaît en tête des résultats de recherche",
            "Plus de visibilité sur tes demandes",
            "Badge boost sur ton profil",
            "Durée : 1 mois",
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
          <p className="text-lg font-black text-foreground">{t('boost.price1Month')}</p>
          <p className="text-xs text-muted-foreground">Paiement unique — pas d'abonnement</p>
        </div>

        {/* Status */}
        {!loading && (
          <div className={`card-magic p-4 text-center ${isBoostActive ? "bg-primary/10 border-primary/30" : ""}`}>
            {isBoostActive ? (
              <p className="text-sm font-semibold text-primary">
                {t('boost.active', { date: formatDate(boostUntil!) })}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('boost.inactive')}</p>
            )}
          </div>
        )}

        {/* CTA */}
        <Button
          onClick={handleActivate}
          disabled={activating || loading || isBoostActive}
          className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25"
        >
          <Rocket className="w-4 h-4 mr-2" />
          {activating ? "Activation..." : t('boost.activate')}
        </Button>
      </div>
    </div>
  );
};

export default BoostProfilePage;
