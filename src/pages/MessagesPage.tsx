import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/context/LanguageContext";
import {
  ArrowLeft,
  MessageCircle,
  Archive,
  ArchiveX,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Illu } from "@/components/Illustrations";
import { EmptyState } from "@/components/EmptyState";

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

interface Profile {
  id: string;
  pseudo: string;
  avatar_url: string;
}

const getStatutConfig = (t: (key: string) => string): Record<string, { label: string; color: string; icon: any }> => ({
  en_attente: { label: t('messages.statusPending'), color: "text-amber-500", icon: Clock },
  en_cours: { label: t('messages.statusProgress'), color: "text-accent", icon: MessageCircle },
  payé: { label: t('messages.statusPaid'), color: "text-emerald-500", icon: CheckCircle2 },
  terminee: { label: t('messages.statusDone'), color: "text-emerald-500", icon: CheckCircle2 },
  fermée: { label: t('messages.statusClosed'), color: "text-muted-foreground", icon: XCircle },
});

const MessagesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [lastMessages, setLastMessages] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchConvs = async () => {
      try {
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

      // Fetch last message for ALL conversations in a single query
      const convIds = unique.map(c => c.id);
      if (convIds.length > 0) {
        const { data: allMsgs } = await supabase
          .from("messages")
          .select("conversation_id, content, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false });

        const lastMsgMap: Record<number, string> = {};
        (allMsgs || []).forEach(msg => {
          if (!lastMsgMap[msg.conversation_id]) {
            const content = msg.content.startsWith("📷:") ? t('messages.photo') : msg.content;
            lastMsgMap[msg.conversation_id] = content;
          }
        });
        setLastMessages(lastMsgMap);
      }

      // Fetch profiles for all involved users
      const userIds = [...new Set(unique.flatMap(c => [c.helper_id, c.demandeur_id, c.demande_user_id].filter(Boolean)))];
      const { data: profData } = await supabase
        .from("profiles")
        .select("id, pseudo, avatar_url")
        .in("id", userIds);
      const profMap: Record<string, Profile> = {};
      (profData || []).forEach(p => { profMap[p.id] = p; });
      setProfiles(profMap);
      } catch (err) {
        console.error("MessagesPage fetchConvs error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConvs();
  }, [user?.id]);

  const handleArchive = async (convId: number, archived: boolean) => {
    const { error } = await supabase.from("conversations").update({ archived }).eq("id", convId);
    if (error) {
      console.error("MessagesPage handleArchive error:", error);
      return;
    }
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, archived } : c));
  };

  const getOtherProfile = (conv: Conversation) => {
    if (!user) return null;
    const otherId = conv.helper_id === user.id
      ? (conv.demandeur_id !== "EMPTY" ? conv.demandeur_id : conv.demande_user_id)
      : conv.helper_id;
    return otherId ? profiles[otherId] : null;
  };

  const getRole = (conv: Conversation) => {
    if (!user) return "Conversation";
    if (conv.helper_id === user.id) return t('messages.youHelp');
    if (conv.demande_user_id === user.id) return "Tu es aidé";
    return "Conversation";
  };

  const getTimeAgo = (created_at: string) => {
    const diff = Math.floor((Date.now() - new Date(created_at).getTime()) / 1000);
    if (diff < 60) return "à l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
    return `il y a ${Math.floor(diff / 86400)}j`;
  };

  const filtered = conversations.filter(c => showArchived ? c.archived : !c.archived);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Background blobs */}
      <div className="fixed top-[-80px] left-[-80px] w-56 h-56 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-80px] right-[-80px] w-56 h-56 bg-accent/10 blur-[100px] rounded-full pointer-events-none" />

      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">{t('messages.title')}</h1>
            <p className="text-xs text-muted-foreground">
              {t('messages.activeConversations', { count: conversations.filter(c => !c.archived).length })}
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 pb-28 space-y-3">
        {loading && [1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-card rounded-3xl border border-border animate-pulse flex items-center gap-4 p-4">
            <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded-full w-1/3" />
              <div className="h-3 bg-muted rounded-full w-2/3" />
            </div>
          </div>
        ))}

        {!loading && (
          <>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 text-xs text-muted-foreground mb-2 hover:text-foreground transition-colors"
            >
              {showArchived ? <ArchiveX className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
              {showArchived ? t('messages.viewActive') : t('messages.archives', {n: conversations.filter(c => c.archived).length})}
            </button>

            {filtered.length === 0 && (
              <EmptyState
                icon="💬"
                title={showArchived ? t('messages.noArchived') : t('messages.noConversations')}
                description={showArchived ? t('messages.archivedEmpty') : t('messages.exploreEmpty')}
              />
            )}

            <AnimatePresence>
              {filtered.map((conv, i) => {
                const otherProfile = getOtherProfile(conv);
                const statutConfig = getStatutConfig(t);
                const sc = statutConfig[conv.statut] || statutConfig.en_attente;
                const StatutIcon = sc.icon;
                const lastMsg = lastMessages[conv.id];

                return (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.04 }}
                    className="group relative"
                  >
                    <div
                      onClick={() => navigate(`/chat/${conv.id}`)}
                      className="bg-card border border-border rounded-3xl p-4 cursor-pointer hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 active:scale-[0.99]"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-12 h-12 shrink-0 ring-2 ring-border group-hover:ring-primary/30 transition-all">
                          <AvatarImage src={otherProfile?.avatar_url || ""} />
                          <AvatarFallback className="bg-magic-gradient dark:bg-cyan-gradient text-foreground font-bold text-sm">
                            {otherProfile?.pseudo?.[0]?.toUpperCase() || getRole(conv)[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-foreground truncate text-sm">
                              {otherProfile?.pseudo || conv.titre}
                            </h3>
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {getTimeAgo(conv.created_at)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            <StatutIcon className={`w-3 h-3 ${sc.color}`} />
                            <span className={`text-[11px] ${sc.color}`}>{sc.label}</span>
                            <span className="text-muted-foreground/30 mx-1">·</span>
                            <span className="text-[11px] text-muted-foreground">{getRole(conv)}</span>
                          </div>

                          {lastMsg && (
                            <p className="text-xs text-muted-foreground truncate mt-1.5">
                              {lastMsg}
                            </p>
                          )}
                        </div>

                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 mt-3 shrink-0 group-hover:text-muted-foreground transition-colors" />
                      </div>
                    </div>

                    <div className="absolute top-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleArchive(conv.id, !conv.archived); }}
                        className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-accent/10 transition-colors"
                        title={conv.archived ? t('messages.restore') : t('messages.archiveBtn')}
                      >
                        {conv.archived ? <ArchiveX className="w-3.5 h-3.5 text-muted-foreground" /> : <Archive className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
