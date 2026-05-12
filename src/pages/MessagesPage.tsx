import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, User, Archive, ArchiveX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  archived?: boolean;
}

const MessagesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchConvs = async () => {
      const { data: allConvs } = await supabase
        .from("conversations")
        .select("*")
        .order("created_at", { ascending: false });

      if (!allConvs) { setLoading(false); return; }

      const demandeIds = [...new Set(allConvs.map(c => c.demande_id))];
      const { data: demandes } = await supabase
        .from("demandes")
        .select("id, titre, user_id")
        .in("id", demandeIds);

      const demandeMap: Record<number, { titre: string; user_id: string }> = {};
      (demandes || []).forEach(d => { demandeMap[d.id] = d; });

      const enriched = allConvs.map(c => ({
        ...c,
        titre: demandeMap[c.demande_id]?.titre || "Demande",
        demande_user_id: demandeMap[c.demande_id]?.user_id,
      }));

      const mine = enriched.filter(c =>
        c.helper_id === user.id ||
        c.demandeur_id === user.id ||
        c.demande_user_id === user.id
      );

      const unique = mine.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);
      setConversations(unique);
      setLoading(false);
    };
    fetchConvs();
  }, [user]);

  const handleArchive = async (convId: number, archived: boolean) => {
    await supabase.from("conversations").update({ archived }).eq("id", convId);
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, archived } : c));
  };

  const getRole = (conv: Conversation) => {
    if (!user) return "Conversation";
    if (conv.helper_id === user.id) return "Tu aides";
    if (conv.demande_user_id === user.id) return "Tu es aidé";
    return "Conversation";
  };

  const filtered = conversations.filter(c => showArchived ? c.archived : !c.archived);

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

        {!loading && (
          <>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 text-xs text-muted-foreground mb-2"
            >
              {showArchived ? <ArchiveX className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
              {showArchived ? "Voir les actives" : `Archives (${conversations.filter(c => c.archived).length})`}
            </button>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/40" />
                <p className="font-semibold text-foreground">
                  {showArchived ? "Aucune conversation archivée" : "Aucune conversation"}
                </p>
              </div>
            )}

            <AnimatePresence>
              {filtered.map((conv, i) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl border border-border p-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3" onClick={() => navigate(`/chat/${conv.id}`)}>
                    <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {getRole(conv)[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{conv.titre}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground">{getRole(conv)}</p>
                        <p className="text-xs text-muted-foreground">
                          {conv.statut === "payé" ? "✅ Payé"
                          : conv.statut === "terminee" ? "⭐ Terminée"
                          : conv.statut === "fermée" ? "❌ Fermée"
                          : "💬 En cours"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleArchive(conv.id, !conv.archived); }}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs transition-colors ${
                        conv.archived ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Archive className="w-3 h-3" /> {conv.archived ? "Restaurer" : "Archiver"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const targetId = conv.helper_id === user?.id ? conv.demandeur_id : conv.helper_id;
                        if (targetId && targetId !== "EMPTY") navigate(`/profile/${targetId}`);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <User className="w-3 h-3" /> Voir le profil
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
