import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, MessageCircle } from "lucide-react";

export default function TopUpPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Paiement</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
          <CreditCard className="w-10 h-10 text-accent" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-2">Paiement simplifié</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Les paiements se font directement via <strong>Apple Pay</strong> dans la conversation.
            Plus besoin de recharger un portefeuille !
          </p>
        </div>

        <button
          onClick={() => navigate("/messages")}
          className="w-full max-w-xs h-12 rounded-2xl bg-accent text-white font-semibold flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          Retour aux messages
        </button>
      </div>
    </div>
  );
}
