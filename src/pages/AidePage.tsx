import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MessageCircle, CreditCard, UserCheck, Shield, AlertTriangle, HelpCircle, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Illu } from "@/components/Illustrations";
import { useTranslation } from "@/context/LanguageContext";

const faqs = [
  {
    icon: HelpCircle,
    key: "q1",
    answerKey: "a1",
  },
  {
    icon: MessageCircle,
    key: "q2",
    answerKey: "a2",
  },
  {
    icon: CreditCard,
    key: "q3",
    answerKey: "a3",
  },
  {
    icon: UserCheck,
    key: "q4",
    answerKey: "a4",
  },
  {
    icon: Shield,
    key: "q5",
    answerKey: "a5",
  },
  {
    icon: AlertTriangle,
    key: "q6",
    answerKey: "a6",
  },
];

const AidePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = faqs.filter((faq) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const question = t(`help.${faq.key}`).toLowerCase();
    const answer = t(`help.${faq.answerKey}`).toLowerCase();
    return question.includes(query) || answer.includes(query);
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{t('help.title')}</h1>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('help.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-secondary border-none text-sm"
          />
        </div>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-4">
        <div className="flex justify-center mb-2">
          <Illu name="aide" className="w-40" />
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">{t('help.noResults') || "Aucun résultat trouvé"}</p>
            </div>
          ) : (
            filteredFaqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-2xl border border-border px-4">
                <AccordionTrigger className="py-3.5 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <faq.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{t(`help.${faq.key}`)}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                  {t(`help.${faq.answerKey}`)}
                </AccordionContent>
              </AccordionItem>
            ))
          )}
        </Accordion>

        <div className="bg-card rounded-2xl border border-border p-4 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">{t('help.noAnswer')}</p>
          <p className="text-xs text-muted-foreground">{t('help.writeUs')}</p>
          <a href="mailto:askoo.contact@gmail.com" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium mt-2 hover:opacity-90 transition-opacity">
            <Mail className="w-4 h-4" />
            askoo.contact@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default AidePage;
