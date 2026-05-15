import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, Loader2, Plus, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const MonPortefeuille = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [wallet, setWallet] = useState<{ balance: number } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [stripeLinked, setStripeLinked] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
      if (w) setWallet(w);
      else setWallet({ balance: 0 });

      const { data: t } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setTransactions(t || []);

      const { data: p } = await supabase.from("profiles").select("stripe_onboarding").eq("id", user.id).maybeSingle();
      setStripeLinked(p?.stripe_onboarding || false);

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || !wallet || amount > wallet.balance) {
      toast.error("Montant invalide ou supérieur au solde");
      return;
    }
    if (amount < 5) {
      toast.error("Montant minimum de retrait : 5€");
      return;
    }
    setWithdrawLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("withdraw-wallet", {
        body: { user_id: user!.id, amount },
      });
      if (error) {
        const errData = data as any;
        if (errData?.error === "no_stripe_account") {
          toast.error("Configure d'abord ton compte Stripe dans Paramètres > Paiements");
          setShowWithdraw(false);
          return;
        }
        throw new Error(error.message);
      }
      toast.success(`💰 ${amount}€ envoyé vers ton compte bancaire !`);
      setShowWithdraw(false);
      setWithdrawAmount("");

      const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", user!.id).maybeSingle();
      if (w) setWallet(w);
      const { data: t } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setTransactions(t || []);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors du retrait");
    }
    setWithdrawLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="h-16 border-b border-border bg-card/70 px-4 flex items-center gap-3">
        <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="font-semibold">Mon portefeuille</p>
      </div>

      {/* Solde */}
      <div className="px-4 pt-6">
        <div className="card-magic bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border-cyan-500/20">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-6 h-6 text-accent" />
            <p className="text-sm text-muted-foreground">Solde disponible</p>
          </div>
          <p className="text-4xl font-black text-foreground">
            {wallet?.balance?.toFixed(2) || "0.00"}€
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                if (!stripeLinked) {
                  toast.error("Configure ton compte Stripe d'abord dans Paramètres > Paiements");
                  return;
                }
                setShowWithdraw(true);
              }}
              disabled={!wallet || wallet.balance <= 0}
              className="flex-1 h-11 rounded-2xl btn-magic font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ArrowUpRight className="w-4 h-4" /> Retirer
            </button>
            <button
              onClick={() => navigate("/payment-setup")}
              className="flex-1 h-11 rounded-2xl bg-card border border-border text-sm font-semibold flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" /> Stripe
            </button>
          </div>
          {!stripeLinked && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Configure Stripe pour retirer tes fonds
            </p>
          )}
        </div>
      </div>

      {/* Historique */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Historique des transactions</h3>
        <div className="card-magic divide-y divide-border">
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Plus className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Aucune transaction pour l'instant
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  tx.type === "credit" ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                }`}>
                  {tx.type === "credit" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {tx.type === "credit" ? "Paiement reçu" : "Retrait bancaire"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {tx.description || tx.reference || ""}
                  </p>
                </div>
                <p className={`text-sm font-bold ${
                  tx.type === "credit" ? "text-accent" : "text-destructive"
                }`}>
                  {tx.type === "credit" ? "+" : ""}{Number(tx.amount).toFixed(2)}€
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Withdraw modal */}
      <AnimatePresence>
        {showWithdraw && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50"
            onClick={() => setShowWithdraw(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full p-6 rounded-t-3xl space-y-4 max-w-lg mx-auto"
            >
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto" />
              <h3 className="font-bold text-lg text-foreground">Retirer des fonds</h3>
              <p className="text-sm text-muted-foreground">L'argent sera envoyé sur ton compte bancaire Stripe.</p>

              <div className="bg-muted rounded-2xl p-4 text-sm">
                <p className="text-muted-foreground">Solde disponible</p>
                <p className="text-2xl font-bold text-foreground">{wallet?.balance?.toFixed(2) || "0.00"}€</p>
              </div>

              <input
                type="number"
                step="0.01"
                min="5"
                max={wallet?.balance || 0}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Montant à retirer (min 5€)"
                className="w-full h-14 rounded-2xl bg-background border border-border px-4 text-lg font-bold text-foreground outline-none"
              />

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowWithdraw(false); setWithdrawAmount(""); }} className="flex-1 h-12 rounded-2xl bg-muted border border-border text-muted-foreground font-medium">
                  Annuler
                </button>
                <button onClick={handleWithdraw} disabled={withdrawLoading || !withdrawAmount || parseFloat(withdrawAmount) < 5} className="flex-1 h-12 rounded-2xl btn-magic font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                  Retirer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MonPortefeuille;
