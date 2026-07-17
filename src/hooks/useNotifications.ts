import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface Notification {
  id: number;
  user_id: string;
  message: string;
  conversation_id?: number;
  lu: boolean;
  created_at: string;
}

const notifType = (msg: string): "messages" | "demandes" | "missions" => {
  if (msg.includes(":")) return "messages";
  if (msg.includes("veut t'aider") || msg.includes("refusée") || msg.includes("acceptée")) return "demandes";
  return "missions";
};

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ messages: true, demandes: true, missions: true });

  const loadPrefs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("notif_prefs").eq("id", user.id).maybeSingle();
    if (data?.notif_prefs) setPrefs(data.notif_prefs);
  }, [user?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setNotifications(data || []);
  }, [user?.id]);

  useEffect(() => {
    loadPrefs();
    fetchNotifications();
  }, [loadPrefs, fetchNotifications]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const markAsRead = async (id: number) => {
    await supabase.from("notifications").update({ lu: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ lu: true }).eq("user_id", user.id);
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
  };

  const filtered = notifications.filter(n => prefs[notifType(n.message)] !== false);

  const unreadCount = filtered.filter(n => !n.lu).length;

  return { notifications: filtered, allNotifications: notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications, prefs };
};
