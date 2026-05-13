import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Euro, Zap, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

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
}

const DemandeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [demande, setDemande] = useState<Demande | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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

  const getTemps = (created_at: string) => {
    const diff = Math.floor((Date.now() - new Date(created_at).getTime()) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return `Il y a ${Math.floor(diff / 86400)} j`;
  };

  const handleVouloir = async () => {
    if (!user || !demande) return;
    setCreating(true);

    // Vérifier si une conversation existe déjà
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

    // Créer une nouvelle conversation
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

    // Notifier le créateur de la demande
    if (newConv && demande.user_id && demande.user_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: demande.user_id,
        message: `${user.email?.split("@")[0] || "Quelqu'un"} veut t'aider pour « ${demande.titre} » !`,
        conversation_id: newConv.id,
        lu: false,
      });
    }

    setCreating(false);
    if (newConv) navigate(`/chat/${newConv.id}`);
    else if (error) alert("Erreur : " + error.message);
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (!demande) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Demande introuvable</p>
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
            {demande.urgent && <Badge className="bg-destructive text-destructive-foreground rounded-lg"><Zap className="w-3 h-3 mr-1" />Urgent</Badge>}
          </div>

          <h2 className="text-lg font-bold text-foreground">{demande.titre}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{demande.description}</p>

          <div className="flex items-center gap-1 pt-1">
            <Euro className="w-4 h-4 text-primary" />
            <span className={`font-bold text-base ${demande.gratuit ? "text-accent" : "text-foreground"}`}>
              {demande.gratuit ? "Gratuit ❤️" : demande.prix}
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
            {creating ? "Connexion..." : "Je veux aider 🤝"}
          </Button>
        </div>
      )}

      {isOwner && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-xl border-t border-border">
          <p className="text-center text-sm text-muted-foreground">C'est ta demande</p>
        </div>
      )}
    </div>
  );
};

export default DemandeDetail;
