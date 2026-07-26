import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, Loader2, Check, Zap, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { IAP_PRODUCTS, getIAPProducts, purchaseProduct, initIAP, type IAPProduct } from "@/lib/iap";
import { Capacitor } from "@capacitor/core";

const CREDIT_PACKS = [
  { productId: IAP_PRODUCTS.WALLET_5, credits: 5, color: "from-blue-500/10 to-cyan-500/10" },
  { productId: IAP_PRODUCTS.WALLET_10, credits: 10, color: "from-purple-500/10 to-pink-500/10", popular: true },
  { productId: IAP_PRODUCTS.WALLET_20, credits: 20, color: "from-orange-500/10 to-red-500/10" },
  { productId: IAP_PRODUCTS.WALLET_50, credits: 50, color: "from-emerald-500/10 to-teal-500/10", popular: true },
  { productId: IAP_PRODUCTS.WALLET_100, credits: 100, color: "from-yellow-500/10 to-amber-500/10" },
  { productId: IAP_PRODUCTS.WALLET_200, credits: 200, color: "from-rose-500/10 to-pink-500/10", popular: true },
  { productId: IAP_PRODUCTS.WALLET_500, credits: 500, color: "from-violet-500/10 to-purple-500/10" },
  { productId: IAP_PRODUCTS.WALLET_1000, credits: 1000, color: "from-amber-500/10 to-yellow-500/10", best: true },
];

export default function TopUpPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initIAP();
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [prods, wallet] = await Promise.all([
        getIAPProducts(),
        supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);
      setProducts(prods);
      if (wallet.data) setBalance(wallet.data.balance || 0);
    } catch {}
    setLoading(false);
  };

  const handlePurchase = async (pack: typeof CREDIT_PACKS[number]) => {
    if (!Capacitor.isNativePlatform()) {
      toast.info("Les achats in-app sont disponibles sur l'application mobile");
      return;
    }
    setPurchasing(pack.productId);
    try {
      const transaction = await purchaseProduct(pack.productId);
      if (!transaction) {
        setPurchasing(null);
        return;
      }

      const resp = await supabase.functions.invoke("verify-apple-receipt", {
        body: { receipt: transaction, productId: pack.productId },
      });

      if (resp.error) {
        toast.error("Erreur de vérification du paiement");
        setPurchasing(null);
        return;
      }

      if (resp.data?.success) {
        toast.success(`${pack.credits} crédits ajoutés à ton portefeuille !`);
        setBalance((b) => b + pack.credits);
      }
    } catch (err: any) {
      if (err?.message?.includes("cancel")) {
        toast.info("Paiement annulé");
      } else {
        toast.error("Erreur lors du paiement");
      }
    }
    setPurchasing(null);
  };

  const getPriceDisplay = (productId: string): string => {
    const p = products.find((pp) => pp.id === productId);
    return p?.displayPrice || getDefaultPrice(productId);
  };

  const getDefaultPrice = (id: string): string => {
    const map: Record<string, string> = {
      [IAP_PRODUCTS.WALLET_5]: "4,99 €",
      [IAP_PRODUCTS.WALLET_10]: "9,99 €",
      [IAP_PRODUCTS.WALLET_20]: "19,99 €",
      [IAP_PRODUCTS.WALLET_50]: "49,99 €",
      [IAP_PRODUCTS.WALLET_100]: "99,99 €",
      [IAP_PRODUCTS.WALLET_200]: "199,99 €",
      [IAP_PRODUCTS.WALLET_500]: "499,99 €",
      [IAP_PRODUCTS.WALLET_1000]: "999,99 €",
    };
    return map[id] || "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/portefeuille")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Recharger</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        <div className="card-magic bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border-cyan-500/20 text-center">
          <Wallet className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Solde actuel</p>
          <p className="text-3xl font-black text-foreground">{balance.toFixed(2)} €</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Choisis un pack de crédits</h2>
          <div className="grid grid-cols-2 gap-3">
            {CREDIT_PACKS.map((pack) => (
              <button
                key={pack.productId}
                onClick={() => handlePurchase(pack)}
                disabled={!!purchasing}
                className={`card-magic p-4 text-center relative bg-gradient-to-br ${pack.color} border-border hover:border-primary/50 transition-all disabled:opacity-50`}
              >
                {pack.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Populaire
                  </span>
                )}
                {pack.best && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Meilleure offre
                  </span>
                )}
                <Zap className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-black text-foreground">{pack.credits}</p>
                <p className="text-xs text-muted-foreground mb-2">crédits</p>
                {purchasing === pack.productId ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />
                ) : (
                  <p className="text-sm font-bold text-foreground">{getPriceDisplay(pack.productId)}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="card-magic p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Comment ça marche</h3>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <p>Achète des crédits via Apple Pay</p>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <p>Utilise-les pour payer tes missions (prix + 2€ de frais)</p>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <p>L'argent est transféré au helper une fois la mission confirmée</p>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <p>Retire tes gains sur ton compte bancaire via RIB</p>
          </div>
        </div>
      </div>
    </div>
  );
}
