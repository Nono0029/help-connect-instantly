import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gift, Copy, Check, Share2, Users, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "@/context/LanguageContext";

const APP_URL = "https://askoo.fr";

const InvitePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [refCode, setRefCode] = useState("");
  const [referredCount, setReferredCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("ref_code")
        .eq("id", user.id)
        .maybeSingle();
      setRefCode(p?.ref_code || "");

      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("referred_by", user.id);
      setReferredCount(count || 0);

      setLoading(false);
    };
    withTimeout(fetchData(), 15000, "invitePage").catch(() => setLoading(false));
  }, [user?.id]);

  const link = `${APP_URL}/?ref=${refCode}`;

  const handleShare = async () => {
    const text = t('invite.shareText', { code: refCode });
    if (navigator.share) {
      try {
        await navigator.share({ title: t('invite.shareTitle'), text, url: link });
      } catch {
        /* annulé */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(t('invite.copied'));
    } catch {
      toast.error(t('invite.copyError'));
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(refCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(t('invite.copied'));
    } catch {
      toast.error(t('invite.copyError'));
    }
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
        <p className="font-semibold">{t('invite.title')}</p>
      </div>

      <div className="px-4 pt-6 space-y-4 max-w-lg mx-auto">
        <div className="card-magic bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-6 h-6 text-primary" />
            <p className="text-sm text-muted-foreground">{t('invite.subtitle')}</p>
          </div>
          <p className="text-2xl font-black text-foreground">
            {t('invite.bonus')}
          </p>
          <p className="text-sm text-muted-foreground mt-2">{t('invite.how')}</p>
        </div>

        <div className="card-magic">
          <p className="text-xs text-muted-foreground mb-2">{t('invite.codeLabel')}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-14 rounded-2xl bg-background border border-border flex items-center justify-center">
              <span className="text-xl font-black tracking-[0.25em] text-primary">{refCode}</span>
            </div>
            <button
              onClick={handleCopyCode}
              className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center"
            >
              {copied ? <Check className="w-5 h-5 text-accent" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
            </button>
          </div>

          <button
            onClick={handleShare}
            className="w-full h-12 rounded-2xl btn-magic font-semibold text-sm mt-3 flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" /> {t('invite.share')}
          </button>
          <p className="text-[11px] text-muted-foreground text-center mt-2 break-all">{link}</p>
        </div>

        <div className="card-magic flex items-center gap-3">
          <Users className="w-5 h-5 text-accent" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t('invite.friendsJoined')}</p>
            <p className="text-xs text-muted-foreground">{t('invite.friendsJoinedDesc')}</p>
          </div>
          <p className="text-2xl font-black text-foreground">{referredCount ?? 0}</p>
        </div>
      </div>
    </div>
  );
};

export default InvitePage;
