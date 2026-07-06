import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Cookie, FileText, Scale } from "lucide-react";
import { Illu } from "@/components/Illustrations";
import { useTranslation } from "@/context/LanguageContext";

const PrivacyPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sections = [
    {
      icon: FileText,
      title: t('privacy.rgpdTitle'),
      content: t('privacy.rgpdContent'),
    },
    {
      icon: Scale,
      title: t('privacy.cguTitle'),
      content: t('privacy.cguContent'),
    },
    {
      icon: Cookie,
      title: t('privacy.cookiesTitle'),
      content: t('privacy.cookiesContent'),
    },
    {
      icon: FileText,
      title: t('privacy.legalTitle'),
      content: t('privacy.legalContent'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{t('privacy.title')}</h1>
        </div>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-4">
        <div className="flex justify-center mb-2">
          <Illu name="aide" className="w-40" />
        </div>

        {sections.map((section, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <section.icon className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-foreground text-sm">{section.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
          </div>
        ))}

        <p className="text-center text-xs text-muted-foreground pt-2">
          {t('privacy.lastUpdate')}
        </p>
      </div>
    </div>
  );
};

export default PrivacyPage;
