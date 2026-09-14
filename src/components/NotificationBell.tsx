import { useState, useEffect } from "react";
import { 
  Bell, 
  Check, 
  Trash2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  MapPin, 
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { initializePushNotifications } from "@/lib/pushNotifications";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export interface NotificationItem {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  related_leave_id: number | null;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const resolvedUserId = user?.user_id || user?.id || user?.employee_id;

  // 1. Fetch initial notifications
  const fetchNotifications = async () => {
    if (!resolvedUserId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications?user_id=${encodeURIComponent(resolvedUserId)}&limit=15`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : (data.notifications || []).filter((n: NotificationItem) => !n.is_read).length);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  // 2. Initial load and Supabase Realtime subscription
  useEffect(() => {
    if (!resolvedUserId) return;

    void fetchNotifications();
    void initializePushNotifications(resolvedUserId);

    // Subscribe to Supabase Realtime postgres_changes
    const channel = supabase
      .channel(`user-notifications-${resolvedUserId}`)
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
              onClick: () => handleNotificationClick(newNotif),
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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedUserId]);

  // 3. Mark single notification as read
  const markAsRead = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: resolvedUserId }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error("Failed to mark notification read:", e);
    }
  };

  // 4. Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!resolvedUserId) return;
    try {
      await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: resolvedUserId }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  };

  // 5. Delete notification
  const handleDeleteNotification = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${id}?user_id=${encodeURIComponent(resolvedUserId)}`, {
        method: "DELETE",
      });
      const wasUnread = notifications.find((n) => n.id === id && !n.is_read);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (e) {
      console.error("Failed to delete notification:", e);
    }
  };

  // 6. Navigate on click
  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      void markAsRead(notif.id);
    }
    setIsOpen(false);

    const isApprover = ["hr_admin", "managing_director", "operation_manager", "finance_manager", "head_of_department", "branch_leader"].includes(role);

    if (notif.type === "leave_approval" || notif.type === "leave" || notif.type === "approval" || notif.type === "status_update") {
      if (isApprover && notif.type === "leave_approval") {
        navigate(notif.related_leave_id ? `/leave/admin?leaveId=${notif.related_leave_id}` : `/leave/admin`);
      } else {
        navigate(notif.related_leave_id ? `/leave?leaveId=${notif.related_leave_id}` : `/leave`);
      }
    } else if (notif.type === "attendance") {
      navigate("/attendance");
    } else if (notif.type === "assignment") {
      navigate("/branches/temporary-assignments");
    } else if (notif.type === "announcement" || notif.type === "company_leave") {
      navigate("/calendar/company-leave");
    } else {
      navigate("/notifications");
    }
  };

  // Icon selector based on type & title
  const getNotificationIcon = (notif: NotificationItem) => {
    const type = (notif.type || "").toLowerCase();
    const title = (notif.title || "").toLowerCase();

    if (type === "approval" || title.includes("approved")) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
    if (title.includes("rejected")) {
      return <XCircle className="w-4 h-4 text-rose-500" />;
    }
    if (type === "attendance") {
      return <Clock className="w-4 h-4 text-amber-500" />;
    }
    if (type === "assignment") {
      return <MapPin className="w-4 h-4 text-blue-500" />;
    }
    if (type === "announcement" || type === "company_leave") {
      return <Building2 className="w-4 h-4 text-purple-500" />;
    }
    return <Calendar className="w-4 h-4 text-teal-600" />;
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "just now";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground h-9 w-9 rounded-full transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-in zoom-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 shadow-xl border-border bg-card overflow-hidden z-50 rounded-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wide">Notifications</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-bold bg-white/20 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-semibold text-white/90 hover:text-white hover:underline transition-colors flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/60">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <Bell className="w-5 h-5 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-semibold text-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">You're all caught up!</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative flex items-start gap-3 p-3.5 cursor-pointer transition-colors hover:bg-muted/60 ${
                  !notif.is_read ? "bg-teal-500/5 dark:bg-teal-500/10" : ""
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5 p-2 rounded-lg bg-background border border-border shadow-xs">
                  {getNotificationIcon(notif)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className={`text-xs font-bold truncate ${!notif.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                      {notif.title}
                    </p>
                    {!notif.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed whitespace-pre-line">
                    {notif.message.replace(/[*_#]/g, "")}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1 font-medium">
                    {formatTime(notif.created_at)}
                  </p>
                </div>

                {/* Delete button on hover */}
                <button
                  onClick={(e) => handleDeleteNotification(e, notif.id)}
                  title="Remove notification"
                  className="absolute right-2.5 top-3.5 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground/60 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-border bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsOpen(false);
              navigate("/notifications");
            }}
            className="w-full text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/30 justify-center gap-1 h-8"
          >
            View all notifications <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
