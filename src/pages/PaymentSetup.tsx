import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, ShieldCheck, Lock, Gift } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

const PaymentSetup = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{t('paymentSetup.title')}</h1>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-5 pb-24">
        <div className="card-magic">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-8 h-8 text-primary" />
            <div>
              <h2 className="font-bold text-foreground">{t('paymentSetup.securePayment')}</h2>
              <p className="text-sm text-muted-foreground">{t('paymentSetup.secureDesc')}</p>
            </div>
          </div>

          <div className="bg-muted rounded-xl p-4 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">{t('paymentSetup.secure100')}</p>
                <p className="text-muted-foreground text-xs">{t('paymentSetup.secure100Desc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">{t('paymentSetup.lockedUntilEnd')}</p>
                <p className="text-muted-foreground text-xs">{t('paymentSetup.lockedDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Gift className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">{t('paymentSetup.feesTitle')}</p>
                <p className="text-muted-foreground text-xs">{t('paymentSetup.feesDesc')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card-magic">
          <h3 className="font-bold text-foreground mb-3">{t('paymentSetup.howTitle')}</h3>
          <ol className="text-sm text-muted-foreground space-y-3 list-none">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>{t('paymentSetup.step1')}</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>{t('paymentSetup.step2')}</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>{t('paymentSetup.step3')}</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span>{t('paymentSetup.step4')}</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">5</span>
              <span>{t('paymentSetup.step5')}</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PaymentSetup;
