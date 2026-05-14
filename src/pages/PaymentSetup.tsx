import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, ShieldCheck, Lock, Gift } from "lucide-react";

const PaymentSetup = () => {
  const navigate = useNavigate();

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

      <div className="px-4 pt-6 space-y-5 pb-24">
        <div className="card-magic">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-8 h-8 text-primary" />
            <div>
              <h2 className="font-bold text-foreground">Paiement sécurisé</h2>
              <p className="text-sm text-muted-foreground">Comment fonctionne le paiement sur Demandé</p>
            </div>
          </div>

          <div className="bg-muted rounded-xl p-4 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Paiement 100% sécurisé</p>
                <p className="text-muted-foreground text-xs">Tous les paiements sont traités via Stripe, leader mondial des paiements en ligne.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Fonds bloqués jusqu'à confirmation</p>
                <p className="text-muted-foreground text-xs">L'argent est sécurisé sur Stripe et n'est reversé qu'après confirmation des deux parties.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Gift className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Frais de service : 2€</p>
                <p className="text-muted-foreground text-xs">Une commission de 2€ est ajoutée au prix de la mission pour soutenir la plateforme.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card-magic">
          <h3 className="font-bold text-foreground mb-3">Comment ça marche ?</h3>
          <ol className="text-sm text-muted-foreground space-y-3 list-none">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>Le demandeur paie le montant de la mission <strong>+ 2€ de frais</strong> via Stripe</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>L'argent est sécurisé sur Stripe — ni le prestataire ni la plateforme n'y ont accès</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>Le prestataire réalise la mission</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span>Les deux parties confirment que la mission est terminée → les fonds sont libérés</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">5</span>
              <span>Le prestataire reçoit le paiement (prix de la mission - 2€ de frais) sur son compte</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PaymentSetup;
