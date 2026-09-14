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
import { formatDistanceToNow } from "date-fns";
import { useNotifications, type NotificationItem } from "@/contexts/NotificationContext";

export type { NotificationItem };

export default function NotificationBell() {
  const { role } = useRole();
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

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

    if (notif.action_url) {
      navigate(notif.action_url);
      return;
    }

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
              onClick={markAllAsRead}
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
