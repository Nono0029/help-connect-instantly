import { useEffect, useState } from "react";
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

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setNotifications(data || []);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

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
  }, [user]);

  const markAsRead = async (id: number) => {
    await supabase.from("notifications").update({ lu: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ lu: true }).eq("user_id", user.id);
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
  };

  const unreadCount = notifications.filter(n => !n.lu).length;

  return { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications };
};
