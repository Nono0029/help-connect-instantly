import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface Conversation {
  id: number;
  demande_id: number;
  helper_id: string;
  demandeur_id: string;
  statut: string;
  created_at: string;
  titre?: string;
  demande_user_id?: string;
}

const MessagesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchConvs = async () => {
      // Récupérer toutes les conversations
      const { data: allConvs } = await supabase
        .from("conversations")
        .select("*")
        .order("created_at", { ascending: false });

      if (!allConvs) { setLoading(false); return; }

      // Récupérer toutes les demandes liées
      const demandeIds = [...new Set(allConvs.map(c => c.demande_id))];
      const { data: demandes } = await supabase
        .from("demandes")
        .select("id, titre, user_id")
        .in("id", demandeIds);

      const demandeMap: Record<number, { titre: string; user_id: string }> = {};
      (demandes || []).forEach(d => { demandeMap[d.id] = d; });

      // Enrichir les conversations avec les infos demande
      const enriched = allConvs.map(c => ({
        ...c,
        titre: demandeMap[c.demande_id]?.titre || "Demande",
        demande_user_id: demandeMap[c.demande_id]?.user_id,
      }));

      // Filtrer : je suis helper OU demandeur OU propriétaire de la demande
      const mine = enriched.filter(c =>
        c.helper_id === user.id ||
        c.demandeur_id === user.id ||
        c.demande_user_id === user.id
      );

      // Dédupliquer
      const unique = mine.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);
      setConversations(unique);
      setLoading(false);
    };
    fetchConvs();
  }, [user]);

  const getRole = (conv: Conversation) => {
    if (!user) return "Conversation";
    if (conv.helper_id === user.id) return "Tu aides";
    if (conv.demande_user_id === user.id) return "Tu es aidé";
    return "Conversation";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Messages</h1>
        </div>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-3">
        {loading && [1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-card rounded-2xl border border-border animate-pulse" />
        ))}

        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">Aucune conversation</p>
            <p className="text-sm text-muted-foreground">Tes conversations apparaîtront ici</p>
          </div>
        )}

        {conversations.map((conv, i) => (
          <motion.div
            key={conv.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(`/chat/${conv.id}`)}
            className="bg-card rounded-2xl border border-border p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {getRole(conv)[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{conv.titre}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-muted-foreground">{getRole(conv)}</p>
                  <p className="text-xs text-muted-foreground">
                    {conv.statut === "payé" ? "✅ Payé" : "💬 En cours"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MessagesPage;
