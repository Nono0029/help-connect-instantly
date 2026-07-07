import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, ShieldCheck, Lock, Smartphone, Landmark, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const PaymentSetup = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [iban, setIban] = useState("");
  const [bankHolderName, setBankHolderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("iban, bank_holder_name")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setIban(data.iban || "");
        setBankHolderName(data.bank_holder_name || "");
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!iban.trim() || !bankHolderName.trim()) {
      toast.error(t("paymentSetup.fillBothFields"));
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ iban: iban.trim(), bank_holder_name: bankHolderName.trim() })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(t("paymentSetup.saveError"));
      return;
    }
    toast.success(t("paymentSetup.saveSuccess"));
  };

  const hasBankDetails = iban.trim().length > 0 && bankHolderName.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{t("paymentSetup.title")}</h1>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-5 pb-24">
        <div className="card-magic">
          <div className="flex items-center gap-3 mb-4">
            <Landmark className="w-8 h-8 text-primary" />
            <div>
              <h2 className="font-bold text-foreground">{t("paymentSetup.bankDetailsTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("paymentSetup.bankDetailsDesc")}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("paymentSetup.holderNameLabel")}</label>
                <input
                  type="text"
                  value={bankHolderName}
                  onChange={(e) => setBankHolderName(e.target.value)}
                  placeholder="Prénom Nom"
                  className="w-full h-11 rounded-xl bg-secondary border-none px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("paymentSetup.ibanLabel")}</label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase())}
                  placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                  className="w-full h-11 rounded-xl bg-secondary border-none px-3 text-sm tracking-wide"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasBankDetails ? <CheckCircle2 className="w-4 h-4" /> : null}
                {saving ? t("paymentSetup.savingButton") : t("paymentSetup.saveButton")}
              </button>
            </div>
          )}
        </div>

        <div className="card-magic">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-8 h-8 text-primary" />
            <div>
              <h2 className="font-bold text-foreground">{t("paymentSetup.securePayment")}</h2>
              <p className="text-sm text-muted-foreground">{t("paymentSetup.howItWorks")}</p>
            </div>
          </div>

          <div className="bg-muted rounded-xl p-4 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">{t("paymentSetup.secure100")}</p>
                <p className="text-muted-foreground text-xs">{t("paymentSetup.secure100Desc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">{t("paymentSetup.lockedUntilEnd")}</p>
                <p className="text-muted-foreground text-xs">{t("paymentSetup.lockedDesc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">{t("paymentSetup.payWithCard")}</p>
                <p className="text-muted-foreground text-xs">{t("paymentSetup.payWithCardDesc")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card-magic">
          <h3 className="font-bold text-foreground mb-3">{t("paymentSetup.withdrawHowTitle")}</h3>
          <ol className="text-sm text-muted-foreground space-y-3 list-none">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>{t("paymentSetup.withdrawStep1")}</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>{t("paymentSetup.withdrawStep2")}</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>{t("paymentSetup.withdrawStep3")}</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PaymentSetup;
