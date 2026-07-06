import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Briefcase, Star, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Illu } from "@/components/Illustrations";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/context/LanguageContext";

const BecomeProPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<"intro" | "form">("intro");
  const { user } = useAuth();
  const [competences, setCompetences] = useState("");
  const [experience, setExperience] = useState("");
  const [tarif, setTarif] = useState("");
  const [loading, setLoading] = useState(false);
  const benefits = [
    { icon: Briefcase, text: t('becomePro.benefit1') },
    { icon: Star, text: t('becomePro.benefit2') },
    { icon: Shield, text: t('becomePro.benefit3') },
  ];

  const handleSubmit = async () => {
    if (!competences || !experience || !tarif) {
      toast.error(t('becomePro.fillFields'));
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      competences,
      experience,
      tarif_horaire: parseFloat(tarif),
      pro_status: "pending",
    }).eq("id", user?.id);
    setLoading(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(t('becomePro.sendSuccess'));
      navigate("/");
    }
  };

  if (step === "intro") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/settings")} className="p-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-bold text-foreground">{t('becomePro.title')}</h1>
          </div>
        </header>

        <div className="flex-1 px-4 pt-6 pb-28 space-y-6">
          <Illu name="aide" className="w-48 mx-auto" />

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{t('becomePro.title')}</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {t('becomePro.pageDesc')}
            </p>
          </div>

          <div className="space-y-3">
            {benefits.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 bg-card rounded-2xl border border-border p-4"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <b.icon className="w-5 h-5" />
                </div>
                <p className="text-sm text-foreground">{b.text}</p>
              </motion.div>
            ))}
          </div>

          <Button
            onClick={() => setStep("form")}
            className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25"
          >
            <Sparkles className="w-4 h-4 mr-2" /> {t('becomePro.start')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("intro")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{t('becomePro.title')}</h1>
        </div>
      </header>

      <div className="px-4 pt-6 pb-28 space-y-5">
        <div className="flex items-center gap-2">
          {[1, 2].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= 1 ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t('becomePro.skills')}</label>
          <Textarea
            placeholder={t('becomePro.skillsPlaceholder')}
            value={competences}
            onChange={e => setCompetences(e.target.value)}
            className="min-h-[100px] rounded-xl bg-secondary border-none resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t('becomePro.experience')}</label>
          <Textarea
            placeholder={t('becomePro.experiencePlaceholder')}
            value={experience}
            onChange={e => setExperience(e.target.value)}
            className="min-h-[100px] rounded-xl bg-secondary border-none resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t('becomePro.hourlyRate')}</label>
          <Input
            type="number"
            placeholder={t('becomePro.hourlyPlaceholder')}
            value={tarif}
            onChange={e => setTarif(e.target.value)}
            className="h-11 rounded-xl bg-secondary border-none"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25"
        >
          {loading ? t('becomePro.sending') : t('becomePro.sendBtn')}
        </Button>
      </div>
    </div>
  );
};

export default BecomeProPage;
