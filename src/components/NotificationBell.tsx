import { useState, useEffect } from "react";
import { Bell, Check, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: number;
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user?.user_id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications?user_id=${user.user_id}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n: Notification) => !n.is_read).length);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, [user?.user_id]);

  const markAsRead = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.user_id) return;
    try {
      await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id })
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    
    setIsOpen(false);
    
    const queryParam = notif.related_leave_id ? `?leaveId=${notif.related_leave_id}` : "";
    
    if (role === "employee") {
      navigate(`/leave/overview${queryParam}`);
    } else {
      navigate(`/leave/admin${queryParam}`);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-white/10 transition-colors">
          <Bell className="w-5 h-5 text-white/80" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-[#7B0099]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 z-[200] overflow-hidden border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
          <span className="text-sm font-black text-white">Notifications</span>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 uppercase tracking-widest">
              <Check className="w-3 h-3" /> Mark all read
            </button>
          )}
        </div>
        
        <div className="max-h-[400px] overflow-y-auto scrollbar-none">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-white/40">
              <Bell className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">No notifications</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-white/5">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 transition-colors cursor-pointer flex gap-3 items-start group ${!notif.is_read ? 'bg-[#7B0099]/10 hover:bg-[#7B0099]/20' : 'hover:bg-white/5'}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="mt-0.5">
                    {!notif.is_read ? (
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    ) : (
                      <div className="w-2 h-2 rounded-full border border-white/20 mt-1" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-xs font-bold mb-1 ${!notif.is_read ? 'text-white' : 'text-white/70'}`}>
                      {notif.title}
                    </h4>
                    <p className="text-[11px] text-white/50 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-2 block">
                      {new Date(notif.created_at).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
