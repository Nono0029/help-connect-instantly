import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CreditCard, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const PaymentSetup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const successParam = searchParams.get("success");
  const { user } = useAuth();
  const [stripeAccountId, setStripeAccountId] = useState("");
  const [onboarding, setOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Handle return from Stripe onboarding
    if (successParam === "true") {
      supabase
        .from("profiles")
        .update({ stripe_onboarding: true })
        .eq("id", user.id)
        .then(() => {
          setOnboarding(true);
          toast.success("Compte Stripe connecté ✅");
          navigate("/payment-setup", { replace: true });
        });
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("stripe_account_id, stripe_onboarding")
        .eq("id", user.id)
        .single();
      if (data) {
        setStripeAccountId(data.stripe_account_id || "");
        setOnboarding(data.stripe_onboarding || false);
      }
      setLoading(false);
    };
    fetch();
  }, [user, successParam]);

  const handleConnect = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("create-stripe-account", {
        body: { user_id: user.id },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Paiements Stripe</h1>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-5">
        <div className="card-magic">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-8 h-8 text-primary" />
            <div>
              <h2 className="font-bold text-foreground">Recevoir des paiements</h2>
              <p className="text-sm text-muted-foreground">Pour être payé quand tu aides quelqu'un</p>
            </div>
          </div>

          {onboarding ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-accent">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-semibold text-sm">Compte Stripe connecté ✅</p>
              </div>
              <p className="text-xs text-muted-foreground">Tu peux recevoir des paiements directement sur ton compte bancaire.</p>
              <Button onClick={handleConnect} variant="outline" className="w-full h-11 rounded-xl text-sm">
                <ExternalLink className="w-4 h-4 mr-2" /> Gérer mon compte Stripe
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Connecte ton compte Stripe pour recevoir les paiements de tes missions.</p>
              <div className="bg-muted rounded-xl p-3 text-xs text-muted-foreground space-y-1">
                <p>💰 Les paiements sont sécurisés via Stripe</p>
                <p>🔒 L'argent est bloqué jusqu'à confirmation de la mission</p>
                <p>📋 Frais de service : 2€ par mission</p>
              </div>
              <Button onClick={handleConnect} className="w-full h-12 rounded-xl btn-magic font-semibold">
                <CreditCard className="w-4 h-4 mr-2" /> Connecter Stripe
              </Button>
            </div>
          )}
        </div>

        <div className="card-magic">
          <h3 className="font-bold text-foreground mb-2">Comment ça marche ?</h3>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Le demandeur paie le montant de la mission + 2€ de frais</li>
            <li>L'argent est sécurisé sur Stripe (escrow)</li>
            <li>Tu réalises la mission</li>
            <li>Les deux parties confirment → les fonds sont libérés</li>
            <li>Tu reçois le paiement sur ton compte bancaire</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PaymentSetup;