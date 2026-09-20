import { useState, useEffect, useRef, useCallback } from "react";
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
  ArrowLeft,
  RefreshCw,
  Users,
  UserCheck
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
import { useNotifications, type NotificationItem } from "@/contexts/NotificationContext";

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

type FilterTab = "all" | "unread" | "leave" | "attendance" | "assignment" | "announcement";
type ScopeTab = "my" | "team";

function formatNotificationDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const clean = dateStr.trim().replace(/[(),]/g, "");
  // match DD.MM.YYYY or DD/MM/YYYY
  const ddmmyyyy = clean.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const monthIdx = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${months[monthIdx]} ${year}`;
  }
  // match YYYY-MM-DD
  const yyyymmdd = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) {
    const day = parseInt(yyyymmdd[3], 10);
    const monthIdx = parseInt(yyyymmdd[2], 10) - 1;
    const year = parseInt(yyyymmdd[1], 10);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${months[monthIdx]} ${year}`;
  }
  // match "25 Sep 2026" or "25 September 2026"
  const textDate = clean.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (textDate) {
    const day = textDate[1];
    let month = textDate[2].slice(0, 3);
    month = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
    return `${day} ${month} ${textDate[3]}`;
  }
  return clean;
}

function getNotificationDialogLabel(notif: NotificationItem): string {
  if (!notif) return "Notification";
  const rawTitle = (notif.title || "")
    .replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    .replace(/\*\*/g, "")
    .replace(/^🔔\s*/, "")
    .trim();
  const type = (notif.type || "").toLowerCase();
  const lowerTitle = rawTitle.toLowerCase();
  const msg = (notif.message || "").replace(/\*\*/g, "").trim();

  // Outstation Assignment
  if (type === "outstation" || lowerTitle.includes("outstation") || msg.toLowerCase().includes("outstation")) {
    const dateRegex = "(?:\\d{1,2}[./-]\\d{1,2}[./-]\\d{2,4}|\\d{1,2}\\s+[A-Za-z]+\\s+\\d{4}|\\d{4}-\\d{1,2}-\\d{1,2})";
    const pattern = new RegExp(`for you(?::\\s*|\\s+)(.+?)\\s+from\\s+(${dateRegex})\\s*(?:-|to)\\s*(${dateRegex})`, "i");
    const match = msg.match(pattern);
    if (match) {
      const eventAndDest = match[1].replace(/,\s*$/, "").trim();
      const start = formatNotificationDisplayDate(match[2]);
      const end = formatNotificationDisplayDate(match[3]);
      return `Outstation Assignment: ${eventAndDest} (${start} - ${end})`;
    }
    const simpleMatch = msg.match(/for you(?::\s*|\\s+)(.+?)(?:,\s*from|\.|$)/i);
    if (simpleMatch && simpleMatch[1].trim().length > 2) {
      return `Outstation Assignment: ${simpleMatch[1].replace(/,\s*$/, "").trim()}`;
    }
    return "Outstation Assignment";
  }

  // Attendance Alert
  if (type === "attendance" || lowerTitle.includes("clock-in") || lowerTitle.includes("attendance")) {
    let dateStr = "";
    if (notif.created_at) {
      const d = new Date(notif.created_at);
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      }
    }
    const base = rawTitle || "Attendance Alert";
    if (dateStr && !base.toLowerCase().includes(" on ") && !base.toLowerCase().includes(dateStr.toLowerCase())) {
      return `${base} on ${dateStr}`;
    }
    return base;
  }

  return rawTitle || "Notification";
}

// ─── Undo Delete Toast Component ──────────────────────────────────────────────
function UndoDeleteToast({
  toastId,
  duration,
  onUndo,
}: {
  toastId: string | number;
  duration: number;
  onUndo: () => void;
}) {
  const [progress, setProgress] = useState(100);
  const [paused, setPaused] = useState(false);
  const startRef = useRef(Date.now());
  const pausedAtRef = useRef<number | null>(null);
  const elapsed = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      if (!paused) {
        const now = Date.now();
        elapsed.current = now - startRef.current;
        const remaining = Math.max(0, duration - elapsed.current);
        setProgress((remaining / duration) * 100);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [paused, duration]);

  const handleMouseEnter = () => {
    setPaused(true);
    pausedAtRef.current = Date.now();
  };

  const handleMouseLeave = () => {
    if (pausedAtRef.current !== null) {
      const pauseDuration = Date.now() - pausedAtRef.current;
      startRef.current += pauseDuration;
      pausedAtRef.current = null;
    }
    setPaused(false);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-[320px] rounded-xl overflow-hidden shadow-lg border border-red-200 dark:border-red-900 bg-white dark:bg-neutral-900"
    >
      {/* Progress bar at top */}
      <div className="h-1 w-full bg-red-100 dark:bg-red-900/40">
        <div
          className="h-1 bg-red-500 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
      {/* Content */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>
        <p className="flex-1 text-sm font-semibold text-red-700 dark:text-red-400">
          Your notification has been deleted.
        </p>
        <button
          onClick={onUndo}
          title="Undo delete"
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors font-bold text-base leading-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
// ──────────────────────────────────────────────────────────────────────────────

export default function Notifications() {
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();

  const { fetchNotifications: refreshBell } = useNotifications();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeScope, setActiveScope] = useState<ScopeTab>("my");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [myUnreadCount, setMyUnreadCount] = useState(0);
  const [teamUnreadCount, setTeamUnreadCount] = useState(0);
  const [notificationToDelete, setNotificationToDelete] = useState<NotificationItem | null>(null);

  const resolvedUserId = user?.user_id || user?.id || user?.employee_id;
  const isElevatedRole = ["hr_admin", "superadmin", "managing_director", "operation_manager", "finance_manager", "head_of_department", "branch_leader"].includes((role || "").toLowerCase());

  const fetchNotifications = async () => {
    if (!resolvedUserId) return;
    setLoading(true);
    try {
      const typeParam = activeTab !== "all" && activeTab !== "unread" ? `&type=${activeTab}` : "";
      const unreadParam = activeTab === "unread" ? "&unreadOnly=true" : "";
      const scopeParam = isElevatedRole ? `&scope=${activeScope}` : "&scope=personal";
      const res = await fetch(`${API_BASE_URL}/api/notifications?user_id=${encodeURIComponent(resolvedUserId)}&limit=100${typeParam}${unreadParam}${scopeParam}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
        if (typeof data.myUnreadCount === "number") setMyUnreadCount(data.myUnreadCount);
        if (typeof data.teamUnreadCount === "number") setTeamUnreadCount(data.teamUnreadCount);
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
  }, [resolvedUserId, activeTab, activeScope]);

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
      const scopeParam = isElevatedRole ? activeScope : undefined;
      await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: resolvedUserId, scope: scopeParam }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (activeScope === "team") {
        setTeamUnreadCount(0);
        setUnreadCount((c) => Math.max(0, c - teamUnreadCount));
      } else {
        setMyUnreadCount(0);
        setUnreadCount((c) => Math.max(0, c - myUnreadCount));
      }
      toast.success("All notifications marked as read");
      void refreshBell();
    } catch (e) {
      console.error("Failed to mark all read:", e);
    }
  };

  const confirmDelete = useCallback(async () => {
    if (!notificationToDelete || !resolvedUserId) return;

    const deletedNotif = notificationToDelete;
    const id = deletedNotif.id;
    const wasUnread = !deletedNotif.is_read;

    // Close dialog immediately
    setNotificationToDelete(null);

    // Optimistically remove from UI
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) {
      setUnreadCount((c) => Math.max(0, c - 1));
      if (deletedNotif.scope === "team") {
        setTeamUnreadCount((c) => Math.max(0, c - 1));
      } else {
        setMyUnreadCount((c) => Math.max(0, c - 1));
      }
    }

    let undone = false;
    const DURATION = 4000; // 4 seconds before actual delete

    toast.custom(
      (t) => (
        <UndoDeleteToast
          toastId={t}
          duration={DURATION}
          onUndo={() => {
            undone = true;
            toast.dismiss(t);
            // Restore notification in UI
            setNotifications((prev) => {
              const already = prev.find((n) => n.id === id);
              if (already) return prev;
              return [deletedNotif, ...prev];
            });
            if (wasUnread) {
              setUnreadCount((c) => c + 1);
              if (deletedNotif.scope === "team") {
                setTeamUnreadCount((c) => c + 1);
              } else {
                setMyUnreadCount((c) => c + 1);
              }
            }
          }}
        />
      ),
      { duration: DURATION, id: `delete-notif-${id}` }
    );

    // Wait for duration then actually delete if not undone
    await new Promise((resolve) => setTimeout(resolve, DURATION + 200));
    if (!undone) {
      try {
        await fetch(`${API_BASE_URL}/api/notifications/${id}?user_id=${encodeURIComponent(resolvedUserId)}`, {
          method: "DELETE",
        });
        void refreshBell();
      } catch (e) {
        console.error("Failed to delete notification:", e);
        // Restore on error
        setNotifications((prev) => {
          const already = prev.find((n) => n.id === id);
          if (already) return prev;
          return [deletedNotif, ...prev];
        });
        toast.error("Failed to delete notification");
      }
    }
  }, [notificationToDelete, resolvedUserId, refreshBell]);


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

    // Outstation routing: employee role or personal assignment goes to My Outstation (/outstation/my)
    const isOutstation = notif.type === "outstation" || title.includes("outstation");
    if (isOutstation) {
      const isPersonal = notif.scope === "personal" || title.includes("upcoming outstation assignment") || message.includes("for you");
      if (role === "employee" || role === "intern" || !isApprover || isPersonal) {
        navigate("/outstation/my");
      } else {
        navigate(notif.action_url || "/outstation");
      }
      return;
    }

    if (notif.action_url) {
      navigate(notif.action_url);
      return;
    }

    // Temporary Assignment routing: keyword check for all roles with access
    const isTempAssignment =
      notif.type === "assignment" ||
      title.includes("temporary assignment") ||
      title.includes("tempoarary assignment") ||
      title.includes("temporary branch") ||
      message.includes("temporary assignment") ||
      message.includes("tempoarary assignment") ||
      message.includes("temporary branch");

    if (isTempAssignment) {
      const normalizedRole = (role || "").toLowerCase().trim().replace(/ /g, "_");
      const canAccessTempAssignment = [
        "hr_admin",
        "hr",
        "admin",
        "superadmin",
        "managing_director",
        "md",
        "operation_manager",
        "finance_manager",
        "branch_leader",
        "head_of_department",
        "hod"
      ].includes(normalizedRole);

      if (canAccessTempAssignment) {
        navigate("/branches/temporary-assignments");
      } else {
        navigate("/attendance");
      }
      return;
    }

    if (notif.type === "attendance") {
      navigate("/attendance");
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
    if (type === "outstation") {
      return <MapPin className="w-5 h-5 text-indigo-500" />;
    }
    if (type === "announcement" || type === "company_leave") {
      return <Building2 className="w-5 h-5 text-purple-500" />;
    }
    return <Calendar className="w-5 h-5 text-[#942392]" />;
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

  function isTeamNotification(notif: NotificationItem): boolean {
    if (notif.scope === "team") return true;
    if (notif.type === "leave_approval") return true;
    const title = notif.title || "";
    const msg = notif.message || "";
    if (
      title.includes("Leave Approved:") ||
      title.includes("Leave Rejected:") ||
      title.includes("New Leave Request") ||
      title.includes("Need Your Approval") ||
      title.startsWith("Leave Request:") ||
      title.startsWith("Irregular Clock-In") ||
      title.startsWith("Leave Final Approval Required") ||
      title.startsWith("Leave Approval Required") ||
      title.startsWith("Leave Approval Progress:") ||
      msg.includes("'s request for") ||
      msg.includes("submitted a Leave Request") ||
      msg.includes("is currently waiting for") ||
      (msg.includes("request for") && msg.includes("is now")) ||
      msg.toLowerCase().includes("requires your approval")
    ) {
      return true;
    }
    return false;
  }

  const filteredNotifications = notifications.filter((notif) => {
    if (isElevatedRole) {
      const isTeam = isTeamNotification(notif);
      if (activeScope === "my" && isTeam) return false;
      if (activeScope === "team" && !isTeam) return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return notif.title.toLowerCase().includes(q) || notif.message.toLowerCase().includes(q);
  });

  const currentScopeUnread = isElevatedRole
    ? (activeScope === "team" ? teamUnreadCount : myUnreadCount)
    : unreadCount;

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-500">
      {/* Top Header Row: Back to Dashboard on Left, Refresh & Actions on Right (Single Line) */}
      <div className="flex items-center justify-between gap-3 pb-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-0 text-[#942392] hover:bg-transparent hover:text-[#5e0080] transition-colors touch-target no-global-hover cursor-pointer"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Back to Dashboard
          </span>
        </Button>

        <div className="flex items-center gap-2">
          {currentScopeUnread > 0 && (
            <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs">
              {currentScopeUnread} unread
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            disabled={loading}
            className="gap-1.5 cursor-pointer text-xs h-8 border-border"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#942392]" : ""}`} />
            Refresh
          </Button>

          {currentScopeUnread > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleMarkAllRead}
              className="bg-[#942392] hover:bg-[#801e7e] text-white gap-1.5 cursor-pointer text-xs h-8 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Primary Scope Tabs: Personal vs Management (matching Recent Activity) */}
      {isElevatedRole && (
        <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 pb-0">
          <button
            onClick={() => setActiveScope("my")}
            className={`pb-2.5 text-sm font-bold transition-all duration-200 border-b-2 flex items-center gap-2 ${
              activeScope === "my"
                ? "border-[#942392] text-[#942392]"
                : "border-transparent text-muted-foreground dark:text-white/70 hover:text-foreground dark:hover:text-white"
            }`}
          >
            <span>Personal</span>
            {myUnreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-[#942392]/10 text-[#942392] border border-[#942392]/20">
                {myUnreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveScope("team")}
            className={`pb-2.5 text-sm font-bold transition-all duration-200 border-b-2 flex items-center gap-2 ${
              activeScope === "team"
                ? "border-[#942392] text-[#942392]"
                : "border-transparent text-muted-foreground dark:text-white/70 hover:text-foreground dark:hover:text-white"
            }`}
          >
            <span>Team Management</span>
            {teamUnreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-[#942392]/10 text-[#942392] border border-[#942392]/20">
                {teamUnreadCount}
              </span>
            )}
          </button>
        </div>
      )}

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
                  ? "bg-[#942392] text-white shadow-xs"
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
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#942392]" />
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
              className={`group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-xs hover:border-[#942392]/40 ${
                !notif.is_read
                  ? "bg-[#942392]/5 dark:bg-[#942392]/10 border-[#942392]/20 dark:border-[#942392]/30"
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
                      {(notif.title || "").replace(/\*\*/g, "")}
                    </span>
                    {!notif.is_read && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#942392] text-white">
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
                  {(notif.message || "")
                    .replace(/under Temporary Assignment assignment\.?/gi, "under Temporary Branch Assignment")
                    .replace(/waiting for MD\.?/gi, "waiting for Managing Director.")
                    .replace(/[*_#]/g, "")}
                </p>

                {/* Footer Action Hint */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
                  <span className="text-[11px] font-bold text-[#942392] dark:text-[#d15fd0] flex items-center gap-1 group-hover:underline">
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotificationToDelete(notif);
                      }}
                      className="text-muted-foreground/60 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
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

      {/* Delete Notification Dialog */}
      <Dialog 
        open={!!notificationToDelete} 
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setNotificationToDelete(null);
          }
        }}
      >
        <DialogContent className="max-w-md w-[95vw] sm:w-full rounded-2xl p-0 overflow-hidden bg-card border border-border shadow-xl [&>button]:text-rose-600 [&>button]:hover:text-rose-700">
          {/* Header: soft red background with icon beside title and separator line */}
          <div className="bg-rose-50 dark:bg-rose-950/40 px-6 py-4 border-b border-rose-200/80 dark:border-rose-900/40">
            <DialogHeader className="p-0 space-y-0 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <Trash2 className="w-5 h-5" />
                </div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Delete Notification?
                </DialogTitle>
              </div>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="p-6 space-y-3">
            <DialogDescription className="text-sm text-muted-foreground space-y-2.5 block text-left">
              <span className="block">Are you sure you want to delete this notification?</span>
              <span className="block p-3.5 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/80 font-semibold text-slate-900 dark:text-white text-sm break-words shadow-2xs">
                &ldquo;{notificationToDelete ? getNotificationDialogLabel(notificationToDelete) : ""}&rdquo;
              </span>
              <span className="block text-xs text-rose-600 dark:text-rose-400 font-semibold">
                You will have 4 seconds to undo this action.
              </span>
            </DialogDescription>
          </div>

          {/* Footer with identical separator line above */}
          <DialogFooter className="flex flex-row justify-end gap-2.5 px-6 py-4 border-t border-border/60 bg-muted/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNotificationToDelete(null)}
              className="text-xs font-semibold px-4 h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 h-9 cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Notification</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
