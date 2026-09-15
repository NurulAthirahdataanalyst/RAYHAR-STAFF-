import { useState } from "react";
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
import { useRole } from "@/contexts/RoleContext";
import { useNavigate } from "react-router-dom";
import { useNotifications, type NotificationItem } from "@/contexts/NotificationContext";
import "./NotificationBell.css";

export type { NotificationItem };

export default function NotificationBell() {
  const { role } = useRole();
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    myUnreadCount,
    teamUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [activeScope, setActiveScope] = useState<"my" | "team">("my");

  const isElevatedRole = ["hr_admin", "superadmin", "managing_director", "operation_manager", "finance_manager", "head_of_department", "branch_leader"].includes((role || "").toLowerCase());

  const displayedNotifications = isElevatedRole
    ? notifications.filter((n) => {
        const isTeam = n.scope === "team" || 
          n.type === "leave_approval" || 
          (n.title && (
            n.title.includes("Leave Approved:") || 
            n.title.includes("Leave Rejected:") || 
            n.title.includes("New Leave Request") || 
            n.title.includes("Need Your Approval") ||
            n.title.startsWith("Leave Request:") ||
            n.title.startsWith("Irregular Clock-In") ||
            n.title.startsWith("Leave Final Approval Required") ||
            n.title.startsWith("Leave Approval Required")
          )) ||
          (n.message && (
            n.message.includes("'s request for") || 
            n.message.includes("submitted a Leave Request") ||
            (n.message.includes("request for") && n.message.includes("is now")) ||
            n.message.toLowerCase().includes("requires your approval")
          ));
        return activeScope === "team" ? isTeam : !isTeam;
      })
    : notifications;

  const currentScopeUnread = isElevatedRole
    ? (activeScope === "team" ? teamUnreadCount : myUnreadCount)
    : unreadCount;

  // 1. Delete notification
  const handleDeleteNotification = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  // 2. Navigate on click
  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      void markAsRead(notif.id);
    }
    setIsOpen(false);

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
      const userRole = (role || "").toLowerCase();
      if (userRole === "employee" || userRole === "intern" || !isApprover || isPersonal) {
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
    if (type === "outstation") {
      return <MapPin className="w-4 h-4 text-indigo-500" />;
    }
    if (type === "announcement" || type === "company_leave") {
      return <Building2 className="w-4 h-4 text-purple-500" />;
    }
    return <Calendar className="w-4 h-4 text-teal-600" />;
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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-8 w-8 lg:h-9 lg:w-9 rounded-lg lg:rounded-xl bg-card text-[#942392] flex items-center justify-center shadow-md lg:shadow-lg lg:shadow-purple-950/40 hover:scale-105 active:scale-95 transition-transform border border-white/20 relative outline-none cursor-pointer shrink-0 no-global-hover"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-[#942392] bell" strokeWidth={2.2} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-sm ring-2 ring-white pointer-events-none animate-in zoom-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
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
            {currentScopeUnread > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-bold bg-white/20 rounded-full">
                {currentScopeUnread} new
              </span>
            )}
          </div>
          {currentScopeUnread > 0 && (
            <button
              onClick={() => markAllAsRead(isElevatedRole ? activeScope : undefined)}
              className="text-xs font-semibold text-white/90 hover:text-white hover:underline transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>

        {/* Scope Pill Toggle (Elevated Roles only) */}
        {isElevatedRole && (
          <div className="flex items-center p-1.5 bg-muted/60 border-b border-border/60 gap-1.5">
            <button
              onClick={() => setActiveScope("my")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeScope === "my"
                  ? "bg-background text-[#a01497] shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>My</span>
              {myUnreadCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-[#a01497]/10 text-[#a01497]">
                  {myUnreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveScope("team")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeScope === "team"
                  ? "bg-background text-rose-600 shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Team</span>
              {teamUnreadCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-rose-500/10 text-rose-600">
                  {teamUnreadCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/60">
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <Bell className="w-5 h-5 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-semibold text-foreground">No {isElevatedRole ? (activeScope === 'team' ? 'team' : 'personal') : ''} notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">You're all caught up!</p>
            </div>
          ) : (
            displayedNotifications.map((notif) => (
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
                    <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                      {(notif.title || "").replace(/\*\*/g, "")}
                    </p>
                    {!notif.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed whitespace-pre-line">
                    {(notif.message || "")
                      .replace(/under Temporary Assignment assignment\.?/gi, "under Temporary Branch Assignment")
                      .replace(/[*_#]/g, "")}
                  </p>
                  <p 
                    className="text-[10px] text-muted-foreground/80 mt-1 font-medium"
                    title={notif.created_at ? new Date(notif.created_at).toLocaleString() : ""}
                  >
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
