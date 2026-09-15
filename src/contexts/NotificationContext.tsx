import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";
import { initializePushNotifications } from "@/lib/pushNotifications";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export interface NotificationItem {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: string;
  scope?: "personal" | "team" | string;
  priority?: "low" | "medium" | "high" | string;
  is_read: boolean;
  related_leave_id: number | null;
  related_attendance_id?: number | null;
  action_url?: string | null;
  created_by?: string | null;
  created_at: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  myUnreadCount: number;
  teamUnreadCount: number;
  loading: boolean;
  fetchNotifications: (scope?: string) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: (scope?: string) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [myUnreadCount, setMyUnreadCount] = useState<number>(0);
  const [teamUnreadCount, setTeamUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const resolvedUserId = user?.user_id || user?.id || user?.employee_id;
  const channelRef = useRef<any>(null);

  const fetchNotifications = useCallback(async (scope?: string) => {
    if (!resolvedUserId) return;
    try {
      setLoading(true);
      const scopeParam = scope ? `&scope=${scope}` : "";
      const res = await fetch(
        `${API_BASE_URL}/api/notifications?user_id=${encodeURIComponent(resolvedUserId)}&limit=30${scopeParam}`
      );
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(
          typeof data.unreadCount === "number"
            ? data.unreadCount
            : (data.notifications || []).filter((n: NotificationItem) => !n.is_read).length
        );
        if (typeof data.myUnreadCount === "number") setMyUnreadCount(data.myUnreadCount);
        if (typeof data.teamUnreadCount === "number") setTeamUnreadCount(data.teamUnreadCount);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [resolvedUserId]);

  const markAsRead = useCallback(
    async (id: number) => {
      if (!resolvedUserId) return;
      try {
        await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: resolvedUserId }),
        });
        const target = notifications.find(n => n.id === id);
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
        if (target?.scope === 'team') {
          setTeamUnreadCount((c) => Math.max(0, c - 1));
        } else {
          setMyUnreadCount((c) => Math.max(0, c - 1));
        }
      } catch (e) {
        console.error("Failed to mark notification read:", e);
      }
    },
    [resolvedUserId, notifications]
  );

  const markAllAsRead = useCallback(async (scope?: string) => {
    if (!resolvedUserId) return;
    try {
      await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: resolvedUserId, scope: scope || undefined }),
      });
      setNotifications((prev) => prev.map((n) => {
        if (!scope || (scope === 'team' && n.scope === 'team') || (scope === 'my' && n.scope !== 'team')) {
          return { ...n, is_read: true };
        }
        return n;
      }));
      if (!scope) {
        setUnreadCount(0);
        setMyUnreadCount(0);
        setTeamUnreadCount(0);
      } else if (scope === 'team') {
        setUnreadCount((c) => Math.max(0, c - teamUnreadCount));
        setTeamUnreadCount(0);
      } else {
        setUnreadCount((c) => Math.max(0, c - myUnreadCount));
        setMyUnreadCount(0);
      }
      toast.success("All notifications marked as read");
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  }, [resolvedUserId, myUnreadCount, teamUnreadCount]);

  const deleteNotification = useCallback(
    async (id: number) => {
      if (!resolvedUserId) return;
      try {
        await fetch(`${API_BASE_URL}/api/notifications/${id}?user_id=${encodeURIComponent(resolvedUserId)}`, {
          method: "DELETE",
        });
        setNotifications((prev) => {
          const item = prev.find((n) => n.id === id);
          if (item && !item.is_read) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.filter((n) => n.id !== id);
        });
      } catch (e) {
        console.error("Failed to delete notification:", e);
      }
    },
    [resolvedUserId]
  );

  // Realtime subscription + Push initialization (executed ONCE per logged-in user)
  useEffect(() => {
    if (!resolvedUserId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    void fetchNotifications();
    void initializePushNotifications(resolvedUserId);

    // Generate a unique channel name with timestamp + random string to guarantee no topic collision
    const channelTopic = `notif-${resolvedUserId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      const channel = supabase
        .channel(channelTopic)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${resolvedUserId}`,
          },
          (payload) => {
            const newNotif = payload.new as NotificationItem;
            setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)].slice(0, 15));
            setUnreadCount((c) => c + 1);

            toast.info(newNotif.title, {
              description: newNotif.message ? newNotif.message.slice(0, 75) + "..." : undefined,
              action: {
                label: "View",
                onClick: () => {
                  if (newNotif.action_url) {
                    navigate(newNotif.action_url);
                  } else {
                    navigate("/notifications");
                  }
                },
              },
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${resolvedUserId}`,
          },
          (payload) => {
            const updated = payload.new as NotificationItem;
            setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
            if (updated.is_read) {
              setUnreadCount((c) => Math.max(0, c - 1));
            }
          }
        );

      channel.subscribe((status, err) => {
        if (err) {
          console.warn("Supabase Realtime subscription status notice:", status, err);
        }
      });

      channelRef.current = channel;
    } catch (err) {
      console.error("Realtime subscription setup failed:", err);
    }

    return () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (err) {
          console.error("Error removing realtime notification channel:", err);
        }
        channelRef.current = null;
      }
    };
  }, [resolvedUserId, fetchNotifications, navigate]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        myUnreadCount,
        teamUnreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
