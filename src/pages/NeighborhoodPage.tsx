import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Share2, Users, PartyPopper, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useTranslation } from "@/context/LanguageContext";

const APP_URL = "https://askoo.fr";
const UNLOCK_THRESHOLD = 25;

const NeighborhoodPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [ville, setVille] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [refCode, setRefCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("ville, ref_code")
        .eq("id", user.id)
        .maybeSingle();

      const v = p?.ville?.trim() || "";
      setVille(v);
      setRefCode(p?.ref_code || "");

      if (v) {
        const { count: c } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .ilike("ville", v);
        setCount(c || 0);
      }

      setLoading(false);
    };
    withTimeout(fetchData(), 15000, "neighborhoodPage").catch(() => setLoading(false));
  }, [user?.id]);

  const progress = count === null ? 0 : Math.min(100, (count / UNLOCK_THRESHOLD) * 100);
  const unlocked = (count ?? 0) >= UNLOCK_THRESHOLD;

  const handleShare = async () => {
    setSharing(true);
    const text = unlocked
      ? t('quartier.shareUnlockedText', { ville, count: count ?? 0 })
      : t('quartier.shareText', { ville, count: count ?? 0 });
    const link = `${APP_URL}/?ref=${refCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t('quartier.shareTitle'), text, url: link });
      } else {
        await navigator.clipboard.writeText(`${text} ${link}`);
        toast.success(t('quartier.copied'));
      }
    } catch {
      /* annulé */
    }
    setSharing(false);
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
      <div className="h-16 border-b border-border bg-card/70 px-4 flex items-center gap-3">
        <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="font-semibold">{t('quartier.title')}</p>
      </div>

      <div className="px-4 pt-6 space-y-4 max-w-lg mx-auto">
        {unlocked ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-magic bg-gradient-to-br from-accent/15 to-emerald-500/10 border-accent/25 text-center py-10"
          >
            <PartyPopper className="w-12 h-12 text-accent mx-auto mb-3" />
            <p className="text-xl font-black text-foreground">{t('quartier.unlocked')}</p>
            <p className="text-sm text-muted-foreground mt-2">{t('quartier.unlockedDesc', { ville })}</p>
          </motion.div>
        ) : (
          <>
            <div className="card-magic bg-gradient-to-br from-primary/10 to-cyan-500/10 border-primary/20">
              <div className="flex items-center gap-3 mb-2">
                <MapPin className="w-6 h-6 text-primary" />
                <p className="text-sm text-muted-foreground">{t('quartier.neighborhood', { ville: ville || "?" })}</p>
              </div>
              <p className="text-3xl font-black text-foreground">
                {count ?? 0}
                <span className="text-base font-semibold text-muted-foreground"> / {UNLOCK_THRESHOLD}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">{t('quartier.countDesc')}</p>
              <div className="h-2.5 rounded-full bg-background/80 border border-border mt-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                />
              </div>
            </div>

            <div className="card-magic">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-5 h-5 text-accent" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t('quartier.howTitle')}</p>
                  <p className="text-xs text-muted-foreground">{t('quartier.howDesc', { count: UNLOCK_THRESHOLD - (count ?? 0), ville })}</p>
                </div>
              </div>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="w-full h-12 rounded-2xl btn-magic font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" /> {t('quartier.share')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NeighborhoodPage;
