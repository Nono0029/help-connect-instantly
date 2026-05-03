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
  demande?: { titre: string; user_id?: string };
}

const MessagesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchConvs = async () => {
      // Récupérer les conversations où je suis helper OU demandeur
      const { data: asHelper } = await supabase
        .from("conversations")
        .select("*, demande:demande_id(titre, user_id)")
        .eq("helper_id", user.id)
        .order("created_at", { ascending: false });

      const { data: asDemandeur } = await supabase
        .from("conversations")
        .select("*, demande:demande_id(titre, user_id)")
        .eq("demandeur_id", user.id)
        .order("created_at", { ascending: false });

      // Récupérer aussi les conversations sur mes demandes
      const { data: mesDemandesConvs } = await supabase
        .from("conversations")
        .select("*, demande:demande_id(titre, user_id)")
        .order("created_at", { ascending: false });

      const convsSurMesDemandes = (mesDemandesConvs || []).filter(
        c => c.demande?.user_id === user.id
      );

      // Fusionner et dédupliquer
      const all = [
        ...(asHelper || []),
        ...(asDemandeur || []),
        ...convsSurMesDemandes,
      ];
      const unique = all.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);
      unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setConversations(unique);
      setLoading(false);
    };
    fetchConvs();
  }, [user]);

  const getRole = (conv: Conversation) => {
    if (!user) return "Inconnu";
    if (conv.helper_id === user.id) return "Tu aides";
    if (conv.demande?.user_id === user.id) return "Tu es aidé";
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
                <p className="font-semibold text-foreground truncate">{conv.demande?.titre || "Demande"}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-muted-foreground">
                    {getRole(conv)}
                  </p>
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
