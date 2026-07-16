import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Euro, Zap, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import ImageLightbox from "@/components/ImageLightbox";
import { toast } from "sonner";
import { useTranslation } from "@/context/LanguageContext";
import { formatTimeAgo } from "@/lib/utils";
import { isUrgentActive, getTotalEuros, isBoostActive } from "@/lib/urgentFee";

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
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("demandes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (data) setDemande(data);
      setLoading(false);
    };
    fetch();
  }, [id]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("boost_until").eq("id", user.id).maybeSingle()
      .then(({ data }) => setIsBoosted(isBoostActive(data?.boost_until)));
  }, [user]);

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
        await supabase.from("notifications").insert({
          user_id: demande.user_id,
          message: `${user.email?.split("@")[0] || "Quelqu'un"} veut t'aider pour « ${demande.titre} » !`,
          conversation_id: newConv.id,
          lu: false,
        });
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
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground truncate">{demande.titre}</h1>
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
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
              {demande.auteur?.slice(0, 2).toUpperCase() || "??"}
            </div>
            <div>
              <p className="font-semibold text-foreground">{demande.auteur}</p>
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
                : isUrgentActive(demande.urgent, demande.created_at) && demande.prix
                  ? t('home.urgentTotal', { price: `${demande.prix}€`, total: getTotalEuros(parseFloat(demande.prix), true, isBoosted) })
                  : demande.prix
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
    </div>
  );
};

export default DemandeDetail;
