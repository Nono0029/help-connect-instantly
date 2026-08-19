import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Star, Medal, Calendar, MessageCircle, ShoppingBag, TrendingUp, Clock, Zap, CheckCircle2, BadgeCheck, Sprout, HandHeart, HeartHandshake, Building2, Crown, Trophy, Award, CalendarCheck, ShieldCheck, User, LucideIcon, ShieldOff, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/context/LanguageContext";
import { isUrgentActive } from "@/lib/urgentFee";
import { computeBadge, badgeLabel } from "@/lib/trustBadges";
import { toast } from "sonner";

interface Profile {
  id: string;
  pseudo: string;
  bio: string;
  ville?: string;
  avatar_url?: string;
  email_verifie?: boolean;
  skills?: string[];
  stripe_onboarding?: boolean;
  last_seen?: string;
  updated_at?: string;
  created_at?: string;
}

interface Review {
  id: number;
  note: number;
  commentaire: string;
  created_at: string;
  verifie?: boolean;
  photo?: string;
}

interface Mission {
  id: number;
  demande_id: number;
  statut: string;
  created_at: string;
  titre?: string;
}

interface Demande {
  id: number;
  titre: string;
  description: string;
  categorie: string;
  urgent: boolean;
  gratuit: boolean;
  prix?: string;
  created_at: string;
}

const ProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [avis, setAvis] = useState<Review[]>([]);
  const [moyenne, setMoyenne] = useState(0);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [helperCount, setHelperCount] = useState(0);
  const [demandeurCount, setDemandeurCount] = useState(0);
  const [monthMissions, setMonthMissions] = useState(0);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [contacting, setContacting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  const getRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);
    if (diffMin < 5) return t('profile.online');
    if (diffMin < 60) return t('profile.lastSeen', { time: t('time.minutesAgoLower', { n: String(diffMin) }) });
    if (diffH < 24) return t('profile.lastSeen', { time: t('time.hoursAgoLower', { n: String(diffH) }) });
    return t('profile.lastSeen', { time: t('time.daysAgoLower', { n: String(diffD) }) });
  };

  const isOnline = (dateStr?: string) => {
    if (!dateStr) return false;
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    return diffMs < 5 * 60000;
  };

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const load = async () => {
      try {
        const { data: userData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (mounted && userData) setProfile(userData);

      const { data: avisData } = await supabase
        .from("avis")
        .select("*")
        .eq("cible_id", id)
        .eq("verifie", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (avisData && mounted) {
        setAvis(avisData);
        const total = avisData.reduce((acc, r) => acc + r.note, 0);
        setMoyenne(avisData.length > 0 ? total / avisData.length : 0);
      }

      const { data: missionsData } = await supabase
        .from("missions")
        .select("*")
        .or(`helper_id.eq.${id},demandeur_id.eq.${id}`)
        .eq("statut", "terminee")
        .order("created_at", { ascending: false })
        .limit(30);

      if (missionsData && mounted) {
        const demandeIds = [...new Set(missionsData.map(m => m.demande_id))];
        const { data: demandes } = await supabase
          .from("demandes")
          .select("id, titre")
          .in("id", demandeIds);

        const titreMap: Record<number, string> = {};
        (demandes || []).forEach(d => { titreMap[d.id] = d.titre; });

        setHelperCount(missionsData.filter(m => m.helper_id === id).length);
        setDemandeurCount(missionsData.filter(m => m.demandeur_id === id).length);
        setMissions(missionsData.map(m => ({
          ...m,
          titre: titreMap[m.demande_id] || "Mission",
        })));
      }

      const { data: demandesData } = await supabase
        .from("demandes")
        .select("id, titre, description, categorie, urgent, gratuit, prix, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (demandesData && mounted) setDemandes(demandesData);

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count: monthCount } = await supabase
        .from("missions")
        .select("id", { count: "exact", head: true })
        .eq("helper_id", id)
        .eq("statut", "terminee")
        .gte("created_at", monthStart);
      if (mounted) setMonthMissions(monthCount || 0);
      } catch (err) {
        console.error("ProfilePage load error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    withTimeout(load(), 15000, "profile").catch(() => setLoading(false));
    return () => { mounted = false; };
  }, [id]);

  const handleBlock = async () => {
    if (!user || !id || user.id === id) return;
    if (!window.confirm(t('profile.confirmBlock'))) return;
    setBlocking(true);
    try {
      const { error } = await supabase.from("user_blocks").insert({
        user_id: user.id,
        blocked_id: id,
      });
      if (error) throw error;
      toast.success(t('profile.blocked'));
      navigate("/");
    } catch (err: any) {
      toast.error(err?.message || "Erreur");
    } finally {
      setBlocking(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason || !user || !id) return;
    setReportLoading(true);
    try {
      await supabase.from("signals").insert({
        reporter_id: user.id,
        reported_id: id,
        raison: reportReason,
        description: reportDesc,
        statut: "ouvert",
      });
      toast.success(t('profile.reportSent'));
      setShowReport(false);
      setReportReason("");
      setReportDesc("");
    } catch (err: any) {
      toast.error(err?.message || "Erreur");
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <p className="text-muted-foreground text-lg mb-2">{t('profile.notFound')}</p>
      <p className="text-sm text-muted-foreground/60 text-center mb-6">{t('profile.notFoundDesc')}</p>
      {user && user.id !== id && (
        <button
          onClick={async () => {
            if (!user || !id) return;
            setContacting(true);
            const { data: existing } = await supabase
              .from("conversations")
              .select("id")
              .or(`and(helper_id.eq.${user.id},demandeur_id.eq.${id}),and(helper_id.eq.${id},demandeur_id.eq.${user.id})`)
              .maybeSingle();
            if (existing) {
              navigate(`/chat/${existing.id}`);
            } else {
              const { data: newConv } = await supabase
                .from("conversations")
                .insert({ helper_id: user.id, demandeur_id: id, statut: "en_attente" })
                .select()
                .single();
              if (newConv) navigate(`/chat/${newConv.id}`);
            }
            setContacting(false);
          }}
          disabled={contacting}
          className="px-6 h-11 rounded-xl btn-magic font-semibold"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          {t('profile.contactAnyway')}
        </button>
      )}
    </div>
  );

  const level = (() => {
    if (helperCount >= 25) return { icon: Crown, label: t('profile.level5') };
    if (helperCount >= 10) return { icon: Building2, label: t('profile.level4') };
    if (helperCount >= 5) return { icon: HeartHandshake, label: t('profile.level3') };
    if (helperCount >= 1) return { icon: HandHeart, label: t('profile.level2') };
    return { icon: Sprout, label: t('profile.level1') };
  })();

  // Badge de confiance public — basé sur les avis vérifiés (visible pour tous les visiteurs)
  const trustBadge = computeBadge(avis.length, moyenne);

  const earnedBadges = [
    profile.email_verifie && { key: "verified", icon: BadgeCheck, label: t('profile.badgeVerified'), desc: t('profile.identityVerifiedDesc') },
    helperCount >= 1 && { key: "first", icon: HeartHandshake, label: t('profile.badgeFirst'), desc: t('profile.badgeFirstDesc') },
    helperCount >= 10 && { key: "ten", icon: Trophy, label: t('profile.badgeTen'), desc: t('profile.badgeTenDesc') },
    helperCount >= 25 && { key: "twentyfive", icon: Award, label: t('profile.badgeTwentyFive'), desc: t('profile.badgeTwentyFiveDesc') },
    monthMissions >= 3 && { key: "month", icon: CalendarCheck, label: t('profile.badgeMonth'), desc: t('profile.badgeMonthDesc') },
  ].filter(Boolean) as { key: string; icon: LucideIcon; label: string; desc: string }[];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* HEADER */}
      <header className="sticky top-[env(safe-area-inset-top)] z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{t('profile.title')}</h1>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-5">
        {/* CARD PROFIL */}
        <div className="card-magic text-center">
          <div className="w-24 h-24 rounded-full bg-avatar-gradient mx-auto flex items-center justify-center text-3xl font-black text-white shadow-xl overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile.pseudo?.[0]?.toUpperCase() || "?"
            )}
          </div>

          <h2 className="text-xl font-bold text-foreground mt-4 flex items-center justify-center gap-2">
            {profile.pseudo || t('profile.anonymous')}
          {profile.email_verifie && (
              <Badge className="rounded-full text-[10px] gap-1 bg-accent/15 text-accent hover:bg-accent/15" title={t('profile.identityVerifiedDesc')}>
                <BadgeCheck className="w-3 h-3" />
                {t('profile.identityVerified')}
              </Badge>
            )}
            {profile.stripe_onboarding && (
              <span title={t('profile.verified')} className="w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-accent" />
              </span>
            )}
          </h2>

          <Badge
            className={`mt-2 rounded-full text-[11px] gap-1.5 px-3 py-1 font-semibold ${
              trustBadge.key === "trusted" ? "bg-amber-500/15 text-amber-600" : "bg-primary/10 text-primary"
            }`}
            title={t('badges.tooltip', { count: avis.length, note: moyenne.toFixed(1) })}
          >
            {trustBadge.key === "trusted" ? <ShieldCheck className="w-3.5 h-3.5" /> : trustBadge.key === "helper10" ? <Star className="w-3.5 h-3.5" /> : trustBadge.key === "helper5" ? <Sparkles className="w-3.5 h-3.5" /> : <Sprout className="w-3.5 h-3.5" />}
            {badgeLabel(trustBadge, t)}
          </Badge>

          {profile.bio && (
            <p className="text-sm text-muted-foreground italic mt-1 px-4">{profile.bio}</p>
          )}

          {profile.skills && profile.skills.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {profile.skills.map((skill, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{skill}</span>
              ))}
            </div>
          )}

          {(profile.last_seen || profile.updated_at) && (
            <p className={`text-xs mt-2 ${isOnline(profile.last_seen || profile.updated_at) ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>
              {getRelativeTime(profile.last_seen || profile.updated_at!)}
            </p>
          )}

          {profile.ville && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5" /> {profile.ville}
            </p>
          )}

          {user && user.id !== id && (
            <Button
              onClick={async () => {
                if (!user || !id) return;
                setContacting(true);
                const { data: existing } = await supabase
                  .from("conversations")
                  .select("id")
                  .or(`and(helper_id.eq.${user.id},demandeur_id.eq.${id}),and(helper_id.eq.${id},demandeur_id.eq.${user.id})`)
                  .maybeSingle();
                if (existing) {
                  navigate(`/chat/${existing.id}`);
                } else {
                  const { data: newConv } = await supabase
                    .from("conversations")
                    .insert({ helper_id: user.id, demandeur_id: id, statut: "en_attente" })
                    .select()
                    .single();
                  if (newConv) navigate(`/chat/${newConv.id}`);
                }
                setContacting(false);
              }}
              disabled={contacting}
              className="mt-4 w-full h-11 rounded-xl btn-magic font-semibold"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {contacting ? t('profile.connecting') : t('profile.contact')}
            </Button>
          )}

          {user && user.id !== id && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowReport(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-secondary text-muted-foreground text-xs font-medium"
              >
                <Flag className="w-3.5 h-3.5" />
                {t('profile.report')}
              </button>
              <button
                onClick={handleBlock}
                disabled={blocking}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-medium"
              >
                <ShieldOff className="w-3.5 h-3.5" />
                {blocking ? "..." : t('profile.block')}
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mt-4">
            {avis.length > 0 ? (
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1.5">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-base font-extrabold text-foreground">{moyenne.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({avis.length} {t('profile.reviews')})</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-secondary border border-border px-3.5 py-1.5">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground">{t('settings.newMember')}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-3.5 py-1.5">
              <Medal className="w-4 h-4 text-accent" />
              <span className="text-base font-extrabold text-foreground">{missions.length}</span>
              <span className="text-xs text-muted-foreground">{missions.length > 1 ? t('profile.missions') : t('profile.mission')}</span>
            </span>
          </div>

          {/* TRUST SIGNALS */}
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            {profile.created_at && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>Membre depuis {new Date(profile.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
              </div>
            )}
            {(missions.length > 0 || avis.length > 0 || demandes.length > 0) && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-accent font-medium">
                <Zap className="w-3.5 h-3.5" />
                <span>{t('profile.recentActivity')}</span>
              </div>
            )}
          </div>

          {/* NIVEAU */}
          {helperCount > 0 && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary/5 border border-primary/15 px-4 py-2.5">
              <level.icon className="w-5 h-5 text-primary shrink-0" />
              <div className="text-left">
                <p className="text-sm font-bold text-foreground leading-tight">{level.label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{t('profile.levelHint')}</p>
              </div>
            </div>
          )}
        </div>

        {/* BADGES */}
        {earnedBadges.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Medal className="w-4 h-4 text-accent" />
              {t('profile.badges')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {earnedBadges.map(b => (
                <div key={b.key} className="flex items-center gap-2 rounded-xl bg-card border border-border px-3 py-2" title={b.desc}>
                  <b.icon className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-xs font-medium">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-2">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <p className="text-xl font-bold text-foreground">{demandeurCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('profile.statRequests')}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-xl font-bold text-foreground">{helperCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('profile.statOffers')}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-2">
              <Medal className="w-5 h-5" />
            </div>
            <p className="text-xl font-bold text-foreground">{missions.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('profile.statMissions')}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center mx-auto mb-2">
              <Star className="w-5 h-5" />
            </div>
            <p className="text-xl font-bold text-foreground">{moyenne.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('profile.statAverage')}</p>
          </div>
        </div>

        {/* SES DEMANDES */}
        {demandes.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-500" />
              {t('profile.theirRequests')}
            </h3>
            <div className="space-y-2">
              {demandes.slice(0, 5).map(d => (
                <div
                  key={d.id}
                  onClick={() => navigate(`/demande/${d.id}`)}
                  className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{d.titre}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className="rounded-lg text-[10px]">{d.categorie}</Badge>
                        {isUrgentActive(d.urgent, d.created_at) && <Badge className="bg-destructive text-destructive-foreground rounded-lg text-[10px]"><Zap className="w-3 h-3 mr-0.5" />Urgent</Badge>}
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(d.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${d.gratuit ? "text-accent" : "text-foreground"}`}>
                      {d.gratuit ? "Gratuit" : d.prix}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MISSIONS */}
        {missions.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Medal className="w-4 h-4 text-accent" />
              {t('profile.finishedMissions')}
            </h3>

            <div className="space-y-2">
              {missions.slice(0, 5).map(m => (
                <div key={m.id} className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.titre}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-full text-[10px]">{t('profile.finished')}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AVIS */}
        {avis.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              {t('profile.receivedReviews')}
            </h3>

            <div className="space-y-3">
              {avis.slice(0, 10).map(a => (
                <div key={a.id} className="bg-card border border-border rounded-[24px] p-5">
                  {a.photo && (
                    <img src={a.photo} alt="" loading="lazy" className="w-full rounded-[18px] object-cover mb-3 max-h-64" />
                  )}
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: a.note }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  {a.commentaire && (
                    <p className="text-[15px] text-foreground/90 leading-relaxed">{a.commentaire}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("fr-FR")}
                    </p>
                    {a.verifie && (
                      <Badge className="rounded-full text-[10px] gap-1">
                        <BadgeCheck className="w-3 h-3" />
                        {t('profile.verifiedMission')}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* REPORT MODAL */}
      {showReport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setShowReport(false)}>
          <div className="bg-background w-full max-w-lg rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground">{t('profile.reportTitle')}</h3>
            <select
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              className="w-full h-12 rounded-xl bg-secondary border-none px-4 text-sm text-foreground"
            >
              <option value="">{t('profile.reportSelectReason')}</option>
              <option value="bad_behavior">{t('profile.reportBadBehavior')}</option>
              <option value="scam">{t('profile.reportScam')}</option>
              <option value="inappropriate">{t('profile.reportInappropriate')}</option>
              <option value="other">{t('profile.reportOther')}</option>
            </select>
            <textarea
              value={reportDesc}
              onChange={e => setReportDesc(e.target.value)}
              placeholder={t('profile.reportDescPlaceholder')}
              rows={3}
              className="w-full rounded-xl bg-secondary border-none px-4 py-3 text-sm text-foreground resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowReport(false)}
                className="flex-1 h-11 rounded-xl bg-secondary text-foreground font-semibold text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleReport}
                disabled={!reportReason || reportLoading}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
              >
                {reportLoading ? "..." : t('profile.reportSend')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;