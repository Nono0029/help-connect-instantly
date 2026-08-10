import { Bell, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/hooks/useNotifications";
import { useTranslation } from "@/context/LanguageContext";
import { formatTimeAgo } from "@/lib/utils";

const FILTERS = ["Toutes", "Messages", "Demandes", "Missions"] as const;
type Filter = typeof FILTERS[number];

const matchFilter = (msg: string, filter: Filter): boolean => {
  if (filter === "Toutes") return true;
  if (filter === "Messages") return msg.includes(":") || msg.includes("veut t'aider");
  if (filter === "Demandes") return msg.includes("veut t'aider") || msg.includes("refusée") || msg.includes("acceptée");
  if (filter === "Missions") return msg.includes("confirmé") || msg.includes("Mission terminée") || msg.includes("terminée");
  return true;
};

interface NotificationItem {
  id: number;
  conversation_id?: number;
  lu: boolean;
  message: string;
  created_at: string;
}

interface Group {
  conversation_id: number;
  items: NotificationItem[];
}

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("Toutes");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const navigate = useNavigate();
  const { t } = useTranslation();

  const filtered = useMemo(() => notifications.filter(n => matchFilter(n.message, filter)), [notifications, filter]);

  // Vague 2 — notifications groupées par conversation (style iMessage)
  const groups = useMemo(() => {
    const withConv = filtered.filter(n => n.conversation_id);
    const singles = filtered.filter(n => !n.conversation_id);
    const byConv = new Map<number, NotificationItem[]>();
    withConv.forEach(n => {
      const list = byConv.get(n.conversation_id!) || [];
      list.push(n);
      byConv.set(n.conversation_id!, list);
    });
    const grouped: Group[] = [...byConv.entries()]
      .map(([conversation_id, items]) => ({
        conversation_id,
        items: items.sort((a, b) => b.created_at.localeCompare(a.created_at)),
      }))
      .sort((a, b) => b.items[0].created_at.localeCompare(a.items[0].created_at));
    return { singles, grouped };
  }, [filtered]);

  const hasUnread = (g: Group) => g.items.some(n => !n.lu);

  const toggleGroup = (g: Group) => {
    setExpanded(prev => {
      const next = new Set(prev);
      const shouldExpand = !next.has(g.conversation_id);
      if (shouldExpand) {
        next.add(g.conversation_id);
      } else {
        next.delete(g.conversation_id);
      }
      return next;
    });
  };

  const handleClick = async (n: NotificationItem) => {
    await markAsRead(n.id);
    setOpen(false);
    if (n.conversation_id) {
      navigate(`/chat/${n.conversation_id}`);
    }
  };

  const getTemps = (created_at: string) => formatTimeAgo(created_at, t);

  const filterLabels: Record<Filter, string> = {
    "Toutes": t('notifications.all'),
    "Messages": t('notifications.messages'),
    "Demandes": t('notifications.requests'),
    "Missions": t('notifications.missions'),
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative p-2 rounded-xl hover:bg-secondary transition-colors"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-bold px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex flex-col" onClick={() => setOpen(false)} />
      )}

      <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "-100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9999] max-h-[85vh] bg-card border-b border-border rounded-b-3xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="safe-area-top flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm text-foreground">{t('notifications.title')}</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* FILTERS */}
          <div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>

          <div className="max-h-[calc(85vh-88px)] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('notifications.noNotifications')}</p>
              </div>
            ) : (
              <>
                {groups.singles.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/40 transition-colors ${
                      !n.lu ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.lu && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      )}
                      <div className={!n.lu ? "" : "pl-4"}>
                        <p className="text-sm text-foreground">{n.message}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {getTemps(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}

                {groups.grouped.map(g => {
                  const isOpen = expanded.has(g.conversation_id);
                  const unread = hasUnread(g);
                  const preview = g.items[0];
                  return (
                    <div key={g.conversation_id} className="border-b border-border">
                      <button
                        onClick={() => toggleGroup(g)}
                        className={`w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors ${unread ? "bg-primary/5" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          {unread && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                          <div className={unread ? "" : "pl-4"}>
                            <p className="text-sm text-foreground line-clamp-1">{preview.message}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              {getTemps(preview.created_at)}
                              {g.items.length > 1 && (
                                <span className="font-semibold text-primary">
                                  · {t('notifications.others', { n: g.items.length - 1 })}
                                </span>
                              )}
                            </p>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-muted-foreground ml-auto shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            {g.items.map(n => (
                              <button
                                key={n.id}
                                onClick={() => handleClick(n)}
                                className={`w-full text-left pl-10 pr-4 py-2.5 border-t border-border/60 hover:bg-muted/40 transition-colors ${
                                  !n.lu ? "bg-primary/5" : ""
                                }`}
                              >
                                <p className="text-sm text-foreground">{n.message}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {getTemps(n.created_at)}
                                </p>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
