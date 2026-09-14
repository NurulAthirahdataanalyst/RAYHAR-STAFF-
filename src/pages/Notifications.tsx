import { useState, useEffect } from "react";
import { 
  Bell, 
  Check, 
  Trash2, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  MapPin, 
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import PageActions from "@/components/layout/PageActions";
import { useNotifications, type NotificationItem } from "@/contexts/NotificationContext";

type FilterTab = "all" | "unread" | "leave" | "attendance" | "assignment" | "announcement";

export default function Notifications() {
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();

  const { fetchNotifications: refreshBell } = useNotifications();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const resolvedUserId = user?.user_id || user?.id || user?.employee_id;

  const fetchNotifications = async () => {
    if (!resolvedUserId) return;
    setLoading(true);
    try {
      const typeParam = activeTab !== "all" && activeTab !== "unread" ? `&type=${activeTab}` : "";
      const unreadParam = activeTab === "unread" ? "&unreadOnly=true" : "";
      const res = await fetch(`${API_BASE_URL}/api/notifications?user_id=${encodeURIComponent(resolvedUserId)}&limit=100${typeParam}${unreadParam}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : (data.notifications || []).filter((n: NotificationItem) => !n.is_read).length);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
  }, [resolvedUserId, activeTab]);

  // Realtime updates
  useEffect(() => {
    if (!resolvedUserId) return;

    const channelTopic = `page-notif-${resolvedUserId}-${Date.now()}`;
    let channel: any = null;

    try {
      channel = supabase
        .channel(channelTopic)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${resolvedUserId}`,
          },
          () => {
            void fetchNotifications();
            void refreshBell();
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.warn("Realtime subscription notice (Notifications page):", status, err);
          }
        });
    } catch (err) {
      console.error("Realtime subscription error in Notifications page:", err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error("Error removing channel:", err);
        }
      }
    };
  }, [resolvedUserId, refreshBell]);

  const markAsRead = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: resolvedUserId }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      void refreshBell();
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  };

  const handleMarkAllRead = async () => {
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
      void refreshBell();
    } catch (e) {
      console.error("Failed to mark all read:", e);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
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
      toast.success("Notification deleted");
      void refreshBell();
    } catch (e) {
      console.error("Failed to delete notification:", e);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      void markAsRead(notif.id);
    }

    const isApprover = ["hr_admin", "managing_director", "operation_manager", "finance_manager", "head_of_department", "branch_leader"].includes(role);
    const title = (notif.title || "").toLowerCase();
    const message = (notif.message || "").toLowerCase();

    // Check if this is a leave-related notification
    const isLeaveNotification = notif.type === "leave_approval" || 
                                notif.type === "leave" || 
                                notif.type === "approval" || 
                                notif.type === "status_update" || 
                                title.includes("leave");

    if (isLeaveNotification) {
      // It's the user's own leave if the message directly addresses them ("your request", "your leave", "your application")
      // AND the title does NOT specify another staff's name (e.g. doesn't have a colon like "Leave Approved: Name")
      const isOwnLeave = (
        (message.includes("your request") || message.includes("your application") || message.includes("your leave")) &&
        !notif.title.includes(":")
      );

      const isOtherStaff = isApprover && (notif.type === "leave_approval" || !isOwnLeave || notif.title.includes(":"));

      if (isOtherStaff) {
        navigate(notif.related_leave_id ? `/leave/admin?leaveId=${notif.related_leave_id}` : `/leave/admin`);
        return;
      } else {
        navigate(notif.related_leave_id ? `/leave?leaveId=${notif.related_leave_id}` : `/leave`);
        return;
      }
    }

    if (notif.action_url) {
      navigate(notif.action_url);
      return;
    }

    if (notif.type === "attendance") {
      navigate("/attendance");
    } else if (notif.type === "assignment") {
      navigate("/branches/temporary-assignments");
    } else if (notif.type === "announcement" || notif.type === "company_leave") {
      navigate("/calendar/company-leave");
    }
  };

  const getIcon = (notif: NotificationItem) => {
    const type = (notif.type || "").toLowerCase();
    const title = (notif.title || "").toLowerCase();

    if (type === "approval" || title.includes("approved")) {
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    }
    if (title.includes("rejected")) {
      return <XCircle className="w-5 h-5 text-rose-500" />;
    }
    if (type === "attendance") {
      return <Clock className="w-5 h-5 text-amber-500" />;
    }
    if (type === "assignment") {
      return <MapPin className="w-5 h-5 text-blue-500" />;
    }
    if (type === "announcement" || type === "company_leave") {
      return <Building2 className="w-5 h-5 text-purple-500" />;
    }
    return <Calendar className="w-5 h-5 text-teal-600" />;
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (d.toDateString() === now.toDateString()) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        return `${Math.floor(diffMins / 60)}h ago`;
      }

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
        return `Yesterday at ${timeStr}`;
      }

      if (diffDays > 0 && diffDays < 7) {
        return `${diffDays}d ago`;
      }

      const datePart = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      const timePart = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
      return `${datePart}, ${timePart}`;
    } catch {
      return "just now";
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return notif.title.toLowerCase().includes(q) || notif.message.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      {/* Header Actions via PageActions portal */}
      <PageActions>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
              {unreadCount} unread
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            disabled={loading}
            className="gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#942392]" : ""}`} />
            Refresh
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleMarkAllRead}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all as read
            </Button>
          )}
        </div>
      </PageActions>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-2 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All" },
            { id: "unread", label: "Unread" },
            { id: "leave", label: "Leaves & Approvals" },
            { id: "attendance", label: "Attendance" },
            { id: "assignment", label: "Assignments" },
            { id: "announcement", label: "Announcements" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FilterTab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-teal-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
            <p className="text-sm">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <h3 className="text-base font-bold text-foreground">No notifications found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {searchQuery
                  ? "No notifications matching your search query."
                  : activeTab === "unread"
                  ? "You have no unread notifications."
                  : "You're all caught up! New notifications will appear here automatically in real-time."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-xs hover:border-teal-500/40 ${
                !notif.is_read
                  ? "bg-teal-50/40 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/40"
                  : "bg-card border-border hover:bg-muted/40"
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5 p-2.5 rounded-xl bg-background border border-border shadow-xs">
                {getIcon(notif)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {notif.title}
                    </span>
                    {!notif.is_read && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-600 text-white">
                        NEW
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                      {notif.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <span
                    className="text-xs text-muted-foreground whitespace-nowrap"
                    title={notif.created_at ? new Date(notif.created_at).toLocaleString() : ""}
                  >
                    {notif.created_at ? formatTime(notif.created_at) : ""}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line mt-1">
                  {notif.message.replace(/[*_#]/g, "")}
                </p>

                {/* Footer Action Hint */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
                  <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 group-hover:underline">
                    View details <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </span>

                  <div className="flex items-center gap-2">
                    {!notif.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void markAsRead(notif.id);
                        }}
                        className="text-[11px] font-semibold text-muted-foreground hover:text-foreground p-1"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, notif.id)}
                      className="text-muted-foreground/60 hover:text-rose-600 p-1 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
