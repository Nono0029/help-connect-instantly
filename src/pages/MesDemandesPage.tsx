import { useEffect, useState } from "react";
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
  demande?: {
    titre: string;
  };
}

const MessagesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      setLoading(true);

      const { data } = await supabase
        .from("conversations")
        .select("*, demande:demande_id(titre)")
        .or(`helper_id.eq.${user.id},demandeur_id.eq.${user.id}`)
        .order("id", { ascending: false });

      if (data) setConversations(data);

      setLoading(false);
    };

    fetchConversations();
  }, [user]);

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <p className="text-sm font-bold text-foreground">Messages</p>
        </div>
      </header>

      {/* Liste */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">

        {loading && (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}

        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-20 text-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Aucune conversation
            </p>
          </div>
        )}

        {conversations.map((conv, i) => (
          <motion.div
            key={conv.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => navigate(`/chat/${conv.id}`)}
            className="p-4 rounded-2xl bg-card border border-border cursor-pointer hover:opacity-80 transition"
          >
            <p className="text-sm font-semibold text-foreground">
              {conv.demande?.titre || "Conversation"}
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              {conv.statut === "payé" ? "✅ Payé" : "💬 En cours"}
            </p>
          </motion.div>
        ))}

      </div>
    </div>
  );
};

export default MessagesPage;
