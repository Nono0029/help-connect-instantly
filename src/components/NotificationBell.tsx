import { Bell } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";

const FILTERS = ["Toutes", "Messages", "Demandes", "Missions"] as const;
type Filter = typeof FILTERS[number];

const matchFilter = (msg: string, filter: Filter): boolean => {
  if (filter === "Toutes") return true;
  if (filter === "Messages") return msg.includes(":") || msg.includes("veut t'aider");
  if (filter === "Demandes") return msg.includes("veut t'aider") || msg.includes("refusée") || msg.includes("acceptée");
  if (filter === "Missions") return msg.includes("confirmé") || msg.includes("Mission terminée") || msg.includes("terminée");
  return true;
};

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("Toutes");
  const navigate = useNavigate();

  const filtered = useMemo(() => notifications.filter(n => matchFilter(n.message, filter)), [notifications, filter]);

  const handleClick = async (n: { id: number; conversation_id?: number; lu: boolean }) => {
    await markAsRead(n.id);
    setOpen(false);
    if (n.conversation_id) {
      navigate(`/chat/${n.conversation_id}`);
    }
  };

  const getTemps = (created_at: string) => {
    const diff = Math.floor((Date.now() - new Date(created_at).getTime()) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    return `Il y a ${Math.floor(diff / 86400)}j`;
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
        <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
      )}

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-[9999] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm text-foreground">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline"
              >
                Tout lire
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
                {f}
              </button>
            ))}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucune notification</p>
              </div>
            ) : (
              filtered.map(n => (
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
