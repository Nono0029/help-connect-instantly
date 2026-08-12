import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Euro, Zap, MessageCircle, Share2, ShieldOff, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { sendPushNotification } from "@/lib/push";
import ImageLightbox from "@/components/ImageLightbox";
import { toast } from "sonner";
import { useTranslation } from "@/context/LanguageContext";
import { formatTimeAgo, withTimeout } from "@/lib/utils";
import { isUrgentActive, getFeesEuros, isBoostActive } from "@/lib/urgentFee";
import QRCode from "qrcode";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

interface Demande {
  id: number;
  titre: string;
  description: string;
  categorie: string;
  auteur: string;
  urgent: boolean;
  gratuit: boolean;
  prix?: string;
  ville?: string;
  created_at: string;
  user_id?: string;
  photos?: string[];
}

const DemandeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [demande, setDemande] = useState<Demande | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isBoosted, setIsBoosted] = useState(false);
  const [myPseudo, setMyPseudo] = useState("");
  const [authorPseudo, setAuthorPseudo] = useState("");
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const qrDataUrl = useMemo(() => {
    if (!demande) return null as string | null;
    return QRCode.toDataURL(`askoo://demande/${demande.id}`, {
      errorCorrectionLevel: "M",
      width: 220,
      margin: 1,
      color: { dark: "#0f1c15", light: "#ffffff" },
    }).catch(() => null);
  }, [demande?.id, shareOpen]);

  const handleShareNative = async () => {
    const text = t('demandeDetail.shareText', {
      titre: demande?.titre || "",
      ville: demande?.ville || "",
      prix: demande?.prix || (demande?.gratuit ? "Gratuit" : ""),
    });
    try {
      await Share.share({ title: t('demandeDetail.shareTitle'), text, url: Capacitor.isNativePlatform() ? undefined : `askoo://demande/${demande?.id}` });
      setShareOpen(false);
    } catch {
      // partage annulé
    }
  };

  const handleBlock = async () => {
    if (!user || !demande?.user_id || user.id === demande.user_id) return;
    setBlocking(true);
    try {
      const { error } = await supabase.from("user_blocks").insert({
        user_id: user.id,
        blocked_id: demande.user_id,
      });
      if (error) throw error;
      toast.success(t('demandeDetail.blocked'));
      navigate("/");
    } catch (err: any) {
      toast.error(err?.message || "Erreur");
    } finally {
      setBlocking(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      const { data } = await supabase
        .from("demandes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (mounted && data) {
        setDemande(data);
        if (data.user_id) {
          supabase.from("profiles").select("pseudo").eq("id", data.user_id).maybeSingle()
            .then(({ data: p }) => { if (mounted && p?.pseudo) setAuthorPseudo(p.pseudo); });
        }
      }
      if (mounted) setLoading(false);
    };
    withTimeout(fetch(), 15000, "demandeDetail").catch(() => setLoading(false));
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    supabase.from("profiles").select("boost_until, pseudo").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setIsBoosted(isBoostActive(data?.boost_until));
        setMyPseudo(data?.pseudo || "");
      });
    return () => { mounted = false; };
  }, [user?.id]);

  const getTemps = (created_at: string) => formatTimeAgo(created_at, t);

  const handleVouloir = async () => {
    if (!user || !demande) return;
    setCreating(true);

    try {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("demande_id", demande.id)
        .eq("helper_id", user.id)
        .maybeSingle();

      if (existing) {
        navigate(`/chat/${existing.id}`);
        return;
      }

      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert([{
          demande_id: demande.id,
          helper_id: user.id,
          demandeur_id: demande.user_id || "",
          statut: "en_attente",
        }])
        .select()
        .single();

      if (newConv && demande.user_id && demande.user_id !== user.id) {
        const notifMessage = `${myPseudo || user.email?.split("@")[0] || "Quelqu'un"} veut t'aider pour « ${demande.titre} » !`;
        await supabase.from("notifications").insert({
          user_id: demande.user_id,
          message: notifMessage,
          conversation_id: newConv.id,
          lu: false,
        });
        sendPushNotification(demande.user_id, t('push.titles.demande'), notifMessage);
      }

      if (newConv) navigate(`/chat/${newConv.id}`);
      else if (error) toast.error("Erreur : " + error.message);
    } catch (err: any) {
      console.error("handleVouloir error:", err);
      toast.error("Erreur lors de la création de la conversation");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (!demande) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">{t('demandeDetail.notFound')}</p>
    </div>
  );

  const isOwner = user?.id === demande.user_id;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-[env(safe-area-inset-top)] z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground truncate">{demande.titre}</h1>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              onClick={() => setShareOpen(true)}
              aria-label={t('demandeDetail.share')}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
            >
              <Share2 className="w-4 h-4 text-foreground" />
            </button>
            {!isOwner && demande.user_id && (
              <button
                onClick={() => {
                  if (window.confirm(t('demandeDetail.blockConfirm', { name: authorPseudo || demande.auteur }))) handleBlock();
                }}
                disabled={blocking}
                aria-label={t('demandeDetail.block')}
                className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
              >
                <ShieldOff className="w-4 h-4 text-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 pb-32 space-y-4">
        {/* Auteur */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => demande.user_id && navigate(`/profile/${demande.user_id}`)}
        >
            <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-avatar-gradient text-white flex items-center justify-center text-lg font-bold">
              {demande.auteur?.slice(0, 2).toUpperCase() || "??"}
            </div>
            <div>
              <p className="font-semibold text-foreground">{authorPseudo || demande.auteur}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {demande.ville && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{demande.ville}</span>}
                <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{getTemps(demande.created_at)}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Détails */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="rounded-lg">{demande.categorie}</Badge>
            {isUrgentActive(demande.urgent, demande.created_at) && <Badge className="bg-destructive text-destructive-foreground rounded-lg"><Zap className="w-3 h-3 mr-1" />{t('demandeDetail.urgent')}</Badge>}
          </div>

          <h2 className="text-lg font-bold text-foreground">{demande.titre}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{demande.description}</p>

          {demande.photos && demande.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {demande.photos.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  onClick={() => setLightbox({ images: demande.photos!, index: i })}
                  className="shrink-0 w-24 h-24 rounded-xl object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 pt-1">
            <Euro className="w-4 h-4 text-primary" />
            <span className={`font-bold text-base ${demande.gratuit ? "text-accent" : "text-foreground"}`}>
              {demande.gratuit
                ? t('demandeDetail.free')
                : (
                  <span className="inline-flex items-baseline gap-2">
                    <span>{demande.prix} €</span>
                    {isUrgentActive(demande.urgent, demande.created_at) && (
                      <span className="text-[11px] font-semibold text-destructive/80 whitespace-nowrap inline-flex items-center gap-0.5">
                        <Zap className="w-3 h-3" /> +{getFeesEuros(true, isBoosted)}€ de frais
                      </span>
                    )}
                  </span>
                )
              }
            </span>
          </div>
        </motion.div>
      </div>

      {/* Bouton Je veux aider */}
      {!isOwner && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-xl border-t border-border">
          <Button
            onClick={handleVouloir}
            disabled={creating}
            className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {creating ? t('demandeDetail.connecting') : t('demandeDetail.wantToHelp')}
          </Button>
        </div>
      )}

      {isOwner && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-xl border-t border-border">
          <p className="text-center text-sm text-muted-foreground">{t('demandeDetail.yourRequest')}</p>
        </div>
      )}

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onPrev={lightbox.index > 0 ? () => setLightbox(prev => prev ? { ...prev, index: prev.index - 1 } : null) : undefined}
          onNext={lightbox.index < lightbox.images.length - 1 ? () => setLightbox(prev => prev ? { ...prev, index: prev.index + 1 } : null) : undefined}
        />
      )}

      {/* Partager — QR code + partage natif */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>{t('demandeDetail.shareTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {qrDataUrl ? (
              <img src={qrDataUrl as string} alt="QR" className="w-44 h-44 rounded-xl border border-border" />
            ) : (
              <div className="w-44 h-44 rounded-xl bg-secondary animate-pulse" />
            )}
            <p className="text-xs text-muted-foreground">{t('demandeDetail.qrHint')}</p>
            <Button className="w-full rounded-xl" onClick={handleShareNative}>
              <Share2 className="w-4 h-4 mr-2" />
              {t('demandeDetail.shareNative')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DemandeDetail;
