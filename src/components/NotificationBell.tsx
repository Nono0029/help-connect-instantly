import { Bell } from "lucide-react";
import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {/* 🔔 BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2"
      >
        <Bell className="w-5 h-5 text-foreground" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* 📩 DROPDOWN */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 max-h-96 overflow-auto">
          <div className="p-3 font-semibold border-b border-border">
            Notifications
          </div>

          {notifications.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Aucune notification
            </p>
          )}

          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`p-3 text-sm border-b border-border cursor-pointer hover:bg-muted/40 ${
                !n.lu ? "bg-primary/5" : ""
              }`}
            >
              {n.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
