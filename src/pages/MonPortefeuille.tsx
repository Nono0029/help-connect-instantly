import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, Loader2, Plus, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/context/LanguageContext";

const MonPortefeuille = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [wallet, setWallet] = useState<{ balance: number } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [bankReady, setBankReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
      if (w) setWallet(w);
      else setWallet({ balance: 0 });

      const { data: txData } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setTransactions(txData || []);

      const { data: p } = await supabase
        .from("profiles")
        .select("iban, bank_holder_name")
        .eq("id", user.id)
        .maybeSingle();
      setBankReady(Boolean(p?.iban && p?.bank_holder_name));

      setLoading(false);
    };
    fetchData();
  }, [user?.id]);

  const handleWithdraw = async () => {
    if (!user) {
      toast.error(t('wallet.withdrawError'));
      return;
    }
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || !wallet || amount > wallet.balance) {
      toast.error(t('wallet.invalidAmount'));
      return;
    }
    if (amount < 5) {
      toast.error(t('wallet.minimumWithdraw'));
      return;
    }
    setWithdrawLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("withdraw-wallet", {
        body: { amount },
      });
      if (error) {
        const errData = data as any;
        if (errData?.error === "no_bank_details") {
          toast.error(t('wallet.configureBankFirst'));
          setShowWithdraw(false);
          setWithdrawLoading(false);
          return;
        }
        throw new Error(error.message);
      }
      toast.success(t('wallet.withdrawSuccess', { amount }));
      setShowWithdraw(false);
      setWithdrawAmount("");

      const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
      if (w) setWallet(w);
      const { data: tx } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setTransactions(tx || []);
    } catch (err: any) {
      toast.error(err?.message || t('wallet.withdrawError'));
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
        <p className="font-semibold">{t('wallet.title')}</p>
      </div>

      {/* Solde */}
      <div className="px-4 pt-6">
        <div className="card-magic bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border-cyan-500/20">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-6 h-6 text-accent" />
            <p className="text-sm text-muted-foreground">{t('wallet.availableBalance')}</p>
          </div>
          <p className="text-4xl font-black text-foreground">
            {wallet?.balance?.toFixed(2) || "0.00"}€
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                if (!bankReady) {
                  toast.error(t('wallet.configureBankFirst'));
                  return;
                }
                setShowWithdraw(true);
              }}
              disabled={!wallet || wallet.balance <= 0}
              className="flex-1 h-11 rounded-2xl btn-magic font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ArrowUpRight className="w-4 h-4" /> {t('wallet.withdraw')}
            </button>
            <button
              onClick={() => navigate("/payment-setup")}
              className="flex-1 h-11 rounded-2xl bg-card border border-border text-sm font-semibold flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" /> {t('wallet.bankDetails')}
            </button>
          </div>
          {!bankReady && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {t('wallet.configureBank')}
            </p>
          )}
        </div>
      </div>

      {/* Historique */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('wallet.history')}</h3>
        <div className="card-magic divide-y divide-border">
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Plus className="w-8 h-8 mx-auto mb-2 opacity-40" />
              {t('wallet.noTransactions')}
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
                    {tx.type === "credit" ? t('wallet.paymentReceived') : t('wallet.bankWithdrawal')}
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
              <h3 className="font-bold text-lg text-foreground">{t('wallet.withdrawFunds')}</h3>
              <p className="text-sm text-muted-foreground">{t('wallet.withdrawDesc')}</p>

              <div className="bg-muted rounded-2xl p-4 text-sm">
                <p className="text-muted-foreground">{t('wallet.availableBalance')}</p>
                <p className="text-2xl font-bold text-foreground">{wallet?.balance?.toFixed(2) || "0.00"}€</p>
              </div>

              <input
                type="number"
                step="0.01"
                min="5"
                max={wallet?.balance || 0}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={t('wallet.withdrawPlaceholder')}
                className="w-full h-14 rounded-2xl bg-background border border-border px-4 text-lg font-bold text-foreground outline-none"
              />

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowWithdraw(false); setWithdrawAmount(""); }} className="flex-1 h-12 rounded-2xl bg-muted border border-border text-muted-foreground font-medium">
                  {t('wallet.cancel')}
                </button>
                <button onClick={handleWithdraw} disabled={withdrawLoading || !withdrawAmount || parseFloat(withdrawAmount) < 5} className="flex-1 h-12 rounded-2xl btn-magic font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                  {t('wallet.withdraw')}
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
