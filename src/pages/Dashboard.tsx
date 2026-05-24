import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import StatCard from "@/components/shared/StatCard";
import {
  Users,
  Clock,
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCcw,
  CalendarOff,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const { role, userName, userId, userBranch, userDepartment } = useRole();
  const storedUser = getStoredUser();
  const navigate = useNavigate();

  const dashboardUserId = user?.user_id || userId || user?.id || storedUser?.user_id;

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  const [stats, setStats] = useState({
    leaveBalance: 14,
    pendingLeaves: 0,
    pendingApprovals: 0,
    todayStatus: "Absent",
    clockInTime: "--:--",
    clockOutTime: "--:--",
    todayStatusTime: "--:--",
    attendanceRate: 0,
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    lateArrivals: 0,
  });

  const [activities, setActivities] = useState<any[]>([]);
  const [whoOutToday, setWhoOutToday] = useState<any[]>([]);
  
  // Right Sidebar Data
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);

  const rawName = userName || user?.full_name || "User";
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    if (hour >= 17 && hour < 21) return "Good Evening";
    return "Good Night";
  };

  const applyAttendanceUpdate = useCallback(
    (update: any) => {
      if (!update || String(update.userId) !== String(dashboardUserId)) return;

      setStats((current) => ({
        ...current,
        todayStatus: update.todayStatus,
        clockInTime: update.activityStatus === "Clocked In" ? update.time : current.clockInTime,
        clockOutTime: update.activityStatus === "Clocked Out" ? update.time : current.clockOutTime,
        todayStatusTime: update.time,
        attendanceRate: Math.max(current.attendanceRate, current.attendanceRate > 0 ? current.attendanceRate : 1),
      }));

      setActivities((current) => [
        {
          name: update.name || rawName,
          action: "Attendance",
          status: update.activityStatus,
          time: update.time,
        },
        ...current,
      ].slice(0, 5));

      setLastUpdated("Updated a few seconds ago");
      setLoading(false);
    },
    [dashboardUserId, rawName]
  );

  const fetchDashboardData = useCallback(
    async (silent = false) => {
      if (!dashboardUserId) {
        const timer = setTimeout(() => setLoading(false), 2000);
        return () => clearTimeout(timer);
      }

      if (!silent) setIsRefreshing(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/dashboard-stats?userId=${dashboardUserId}&role=${role}&branch=${encodeURIComponent(userBranch || "")}&department=${encodeURIComponent(userDepartment || "")}`
        );

        if (!response.ok) throw new Error("Sync failed");

        const data = await response.json();

        if (data.success) {
          const latestUpdate = localStorage.getItem("latestAttendanceUpdate");
          let localUpdate = null;

          if (latestUpdate) {
            try {
              localUpdate = JSON.parse(latestUpdate);
            } catch {
              localStorage.removeItem("latestAttendanceUpdate");
            }
          }

          const serverHasNoAttendance =
            data.stats?.todayStatus === "Absent" &&
            (!data.recentActivities || data.recentActivities.length === 0);

          if (
            serverHasNoAttendance &&
            localUpdate &&
            String(localUpdate.userId) === String(dashboardUserId)
          ) {
            applyAttendanceUpdate(localUpdate);
          } else {
            setStats((current) => ({ ...current, ...(data.stats || {}) }));
            setActivities(data.recentActivities || []);
            setLastUpdated("Updated a few seconds ago");
          }
        }
      } catch (error) {
        console.error("Dashboard Sync Error:", error);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [applyAttendanceUpdate, dashboardUserId, role]
  );

  const fetchWhoOutToday = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/who-out-today`);
      const data = await response.json();
      if (data.success) {
        setWhoOutToday(data.employees || []);
      }
    } catch (err) {
      console.error("Who Out Today Error:", err);
    }
  }, []);

  const fetchRightSidebarData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!dashboardUserId || !token) return;
      const headers = { Authorization: `Bearer ${token}` };
      
      const [notesRes, holRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/personal-notes?userId=${dashboardUserId}`, { headers }),
        fetch(`${API_BASE_URL}/api/holidays`, { headers })
      ]);
      
      const notesData = await notesRes.json();
      const holData = await holRes.json();
      
      if (notesData.success) setNotes(notesData.notes);
      if (holData.success) setHolidays(holData.holidays);
    } catch (error) {
      console.error("Error fetching right sidebar data:", error);
    }
  }, [dashboardUserId]);

  // Initial fetch + refresh when focus + Custom Event Listener
  useEffect(() => {
    const latestUpdate = localStorage.getItem("latestAttendanceUpdate");
    if (latestUpdate) {
      try {
        applyAttendanceUpdate(JSON.parse(latestUpdate));
      } catch {
        localStorage.removeItem("latestAttendanceUpdate");
      }
    }

    fetchDashboardData();
    fetchRightSidebarData();
    if (["hr_admin", "branch_leader", "managing_director", "finance_manager", "head_of_department"].includes(role)) {
      fetchWhoOutToday();
    }

    const handleUpdate = (event: Event) => {
      const attendanceEvent = event as CustomEvent;
      if (attendanceEvent.detail) {
        applyAttendanceUpdate(attendanceEvent.detail);
      }
      fetchDashboardData(true);
    };

    window.addEventListener("focus", handleUpdate);
    // Listen for the custom event from Attendance.tsx
    window.addEventListener("attendanceUpdated", handleUpdate);

    return () => {
      window.removeEventListener("focus", handleUpdate);
      window.removeEventListener("attendanceUpdated", handleUpdate);
    };
  }, [applyAttendanceUpdate, fetchDashboardData]);

  // Auto refresh every 10 seconds (keeps dashboard synced)
  useEffect(() => {
    if (!dashboardUserId) return;

    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [dashboardUserId, fetchDashboardData]);

  // Refresh dashboard if Attendance.tsx updates localStorage (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "dashboardRefresh") {
        fetchDashboardData(true);
      }

      if (event.key === "latestAttendanceUpdate" && event.newValue) {
        try {
          applyAttendanceUpdate(JSON.parse(event.newValue));
        } catch {
          localStorage.removeItem("latestAttendanceUpdate");
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => window.removeEventListener("storage", handleStorageChange);
  }, [applyAttendanceUpdate, fetchDashboardData]);

  if (loading && !dashboardUserId) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-[#7B0099] w-12 h-12" />
        <p className="text-muted-foreground animate-pulse font-medium">
          Loading your workspace...
        </p>
      </div>
    );
  }

  const isPresent = stats.todayStatus === "Present";
  const isClockedOut = stats.todayStatus === "Clocked Out";
  const todayStatusSubtitle = isPresent
    ? `Clock in: ${stats.todayStatusTime || stats.clockInTime}`
    : isClockedOut
      ? `Clock out: ${stats.todayStatusTime || stats.clockOutTime}`
      : "Not clocked in today";

  const CustomDayContent = (props: any) => {
    const { date } = props;
    const dateStr = format(date, "yyyy-MM-dd");
    const hasNote = notes.some(n => n.date.startsWith(dateStr) && n.type === 'note');
    const hasReminder = notes.some(n => n.date.startsWith(dateStr) && n.type === 'reminder');
    const isHoliday = holidays.some(h => h.date === dateStr);
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span>{date.getDate()}</span>
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-[2px]">
          {isHoliday && <span className="w-1 h-1 rounded-full bg-rose-500" />}
          {hasNote && <span className="w-1 h-1 rounded-full bg-[#7B0099]" />}
          {hasReminder && <span className="w-1 h-1 rounded-full bg-amber-500" />}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      {/* LEFT COLUMN - Main Dashboard */}
      <div className="flex-1 space-y-4 sm:space-y-6 min-w-0">
        {/* Header - responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-responsive-2xl font-black tracking-tight text-foreground truncate uppercase">
              {getGreeting()}, {rawName}!
            </h1>
            <p className="text-muted-foreground font-medium mt-1 flex items-center gap-2 text-responsive-sm">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {isRefreshing && (
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData()}
            disabled={isRefreshing}
            className="rounded-xl border-border hover:bg-accent text-foreground gap-2 font-bold self-start sm:self-auto touch-target"
          >
            <RefreshCcw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Stat Cards - responsive grid */}
        <div className={`grid grid-cols-2 ${["managing_director", "head_of_department", "finance_manager", "hr_admin"].includes(role) ? "md:grid-cols-3 lg:grid-cols-5" : "md:grid-cols-2 lg:grid-cols-4"} gap-3 sm:gap-4`}>
          {role === "employee" || role === "branch_officer" ? (
            <>
              <StatCard
                icon={Clock}
                title="Today's Status"
                value={stats.todayStatus}
                subtitle={todayStatusSubtitle}
                variant={isPresent ? "success" : isClockedOut ? "default" : "maroon"}
              />
              <StatCard
                icon={CalendarCheck}
                title="Attendance"
                value={`${stats.attendanceRate}%`}
                progress={stats.attendanceRate}
                subtitle="Monthly Average"
                variant="gauge"
              />
              <StatCard
                icon={CalendarCheck}
                title="Leave Balance"
                value={`${stats.leaveBalance} days`}
                subtitle="Annual Leave"
                variant="success"
              />
              <StatCard
                icon={AlertTriangle}
                title="Pending"
                value={stats.pendingLeaves.toString()}
                subtitle="Leave Requests"
                variant="gold"
              />
            </>
          ) : (
            <>
              {["managing_director", "head_of_department", "finance_manager", "hr_admin"].includes(role) && (
                <StatCard
                  icon={Clock}
                  title="Today's Status"
                  value={stats.todayStatus}
                  subtitle={todayStatusSubtitle}
                  variant={isPresent ? "success" : isClockedOut ? "default" : "maroon"}
                />
              )}
              <div onClick={() => navigate("/employees")} className="cursor-pointer">
                <StatCard
                  icon={Users}
                  title="Total Employees"
                  value={String(stats.totalEmployees ?? 0)}
                  subtitle="Active Personnel"
                  variant="success"
                />
              </div>
              <StatCard
                icon={CheckCircle2}
                title="Present Today"
                value={String(stats.presentToday ?? 0)}
                subtitle="Clocked In Today"
                variant="success"
              />
              <StatCard
                icon={XCircle}
                title="On Leave"
                value={String(stats.onLeave ?? 0)}
                subtitle="Approved Leaves"
                variant="default"
              />
              <StatCard
                icon={AlertTriangle}
                title="Late Arrivals"
                value={String(stats.lateArrivals ?? 0)}
                subtitle="Action Required"
                variant="maroon"
              />
            </>
          )}
        </div>

        {/* Who's Out Today - admin roles only */}
        {["hr_admin", "branch_leader", "managing_director", "finance_manager", "head_of_department"].includes(role) && (
          <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-[24px] sm:rounded-[32px] overflow-hidden bg-card">
            <CardHeader className="border-b border-border/50 pb-4 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500/10 rounded-xl">
                    <CalendarOff className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-black text-foreground tracking-tight">
                      Who's Out Today
                    </CardTitle>
                    <p className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-0.5">
                      {whoOutToday.length} employee{whoOutToday.length !== 1 ? "s" : ""} currently on leave
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/leave/admin")}
                  className="text-[10px] sm:text-xs font-black text-[#7B0099] hover:text-[#7B0099] hover:bg-[#7B0099]/5 gap-1.5 uppercase tracking-widest self-start sm:self-auto px-3"
                >
                  View All History
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {whoOutToday.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {whoOutToday.map((emp) => {
                    const endDate = new Date(emp.end_date);
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    endDate.setHours(0,0,0,0);
                    const isSameDay = endDate.getTime() === today.getTime();
                    const endLabel = isSameDay
                      ? `${endDate.toLocaleDateString('en-MY', { month: 'short', day: '2-digit' })} Only`
                      : `Until ${endDate.toLocaleDateString('en-MY', { month: 'short', day: '2-digit' })}`;

                    const leaveTypeLabel: Record<string, { short: string; color: string }> = {
                      "Cuti Tahunan": { short: "ANNUAL/EMERGENCY", color: "bg-blue-500" },
                      "Annual/Emergency Leave": { short: "ANNUAL/EMERGENCY", color: "bg-blue-500" },
                      "Cuti Sakit": { short: "MC/SICK", color: "bg-rose-500" },
                      "Sick Leave": { short: "MC/SICK", color: "bg-rose-500" },
                      "Cuti Kecemasan": { short: "EMERGENCY", color: "bg-amber-500" },
                      "Cuti Ganti": { short: "REPLACEMENT", color: "bg-violet-500" },
                      "Replacement Leave": { short: "REPLACEMENT", color: "bg-violet-500" },
                      "Cuti Tanpa Gaji": { short: "UNPAID", color: "bg-slate-500" },
                      "Unpaid Leave": { short: "UNPAID", color: "bg-slate-500" },
                      "Cuti Ehsan": { short: "COMPASSIONATE", color: "bg-teal-500" },
                    };
                    const typeInfo = leaveTypeLabel[emp.leave_type] || { short: emp.leave_type?.toUpperCase(), color: "bg-gray-500" };

                    return (
                      <div
                        key={emp.leave_id}
                        onClick={() => navigate(`/leave/admin?leaveId=${emp.leave_id}`)}
                        className="cursor-pointer group rounded-[20px] border border-border/60 bg-card
                          hover:border-[#7B0099]/30 hover:shadow-lg transition-all duration-300 p-5"
                      >
                        {/* Top: Avatar + Info */}
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-[#7B0099]/10 flex items-center justify-center text-base font-black text-[#7B0099] group-hover:scale-110 transition-transform shrink-0">
                            {emp.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-foreground uppercase tracking-tight truncate group-hover:text-[#7B0099] transition-colors">
                              {emp.full_name}
                            </p>
                            <p className="text-xs font-medium text-muted-foreground mt-0.5">
                              {emp.leave_type} • {endLabel}
                            </p>
                          </div>
                        </div>
                        {/* Bottom: Badge + Branch */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
                          <Badge className={`${typeInfo.color} text-white text-[10px] font-black px-2.5 py-0.5 h-auto border-none rounded-full`}>
                            {typeInfo.short}
                          </Badge>
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            {emp.branch}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 sm:py-10 text-center">
                  <div className="bg-emerald-500/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-black text-foreground">All Hands on Deck!</p>
                  <p className="text-xs text-muted-foreground font-medium mt-1">No employees are on leave today.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Activity - responsive */}
        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-[24px] sm:rounded-[32px] overflow-hidden bg-card">
          <CardHeader className="border-b border-border/50 pb-4 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-base sm:text-lg font-black text-foreground uppercase tracking-wider">
                Recent Activity
              </CardTitle>
              <div className="flex items-center gap-2 sm:gap-4">
                {lastUpdated && (
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground">
                    {lastUpdated}
                  </span>
                )}
                <Badge
                  variant="outline"
                  className="rounded-lg font-bold border-border text-muted-foreground text-[10px]"
                >
                  Last 5 Events
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
            <div className="space-y-1">
              {activities && activities.length > 0 ? (
                activities.map((item, i) => (
                  <div
                    key={i}
                    className="group flex items-center gap-3 sm:gap-4 py-3 sm:py-4 px-2 rounded-2xl hover:bg-accent/50 transition-colors duration-200"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-card group-hover:shadow-sm transition-all shrink-0">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground truncate">
                        Today, {item.time}
                      </p>
                      <p className="text-xs font-bold text-muted-foreground truncate">
                        {item.status}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 sm:py-12 text-center">
                  <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground font-bold tracking-tight">
                    No activity recorded for this period.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* RIGHT COLUMN - Sidebar Widgets */}
      <div className="w-full xl:w-[350px] shrink-0 space-y-6">
        
        {/* Approvals Widget - Only for roles that can approve */}
        {["managing_director", "finance_manager", "head_of_department"].includes(role) && (
          <Card className="border-none shadow-xl bg-gradient-to-br from-[#7B0099] to-[#4A005C] rounded-[24px] overflow-hidden relative text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-black text-sm uppercase tracking-widest mb-1">Pending Approvals</h3>
                  <p className="text-xs text-white/70">Requires your review</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                  {stats.pendingApprovals || 0}
                </div>
              </div>
              <Button 
                onClick={() => navigate("/leave/admin")}
                className="w-full bg-white text-[#7B0099] hover:bg-white/90 font-black tracking-wider text-xs rounded-xl h-10"
              >
                VIEW REQUESTS
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Calendar Widget */}
        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-[24px] bg-card overflow-hidden">
          <CardHeader className="pb-2 pt-6 px-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Calendar
              </CardTitle>
              <span className="text-xs font-black text-[#7B0099]">{format(selectedDate, "MMM yyyy")}</span>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) {
                  setSelectedDate(d);
                  navigate('/calendar');
                }
              }}
              className="mx-auto bg-transparent border-none p-0"
              components={{
                DayContent: CustomDayContent
              }}
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4 w-full",
                caption: "hidden", // Hide default caption since we have custom one above
                table: "w-full border-collapse space-y-1",
                head_row: "flex w-full justify-between mb-2",
                head_cell: "text-muted-foreground font-bold text-[10px] uppercase w-9 h-9 flex items-center justify-center",
                row: "flex w-full mt-1 justify-between",
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: "h-9 w-9 p-0 font-bold hover:bg-accent hover:text-accent-foreground rounded-full transition-all text-foreground",
                day_selected: "bg-[#7B0099] text-white hover:bg-[#7B0099] hover:text-white focus:bg-[#7B0099] focus:text-white",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
              }}
            />
          </CardContent>
        </Card>

        {/* Upcoming Holidays Widget */}
        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-[24px] bg-card overflow-hidden">
          <CardHeader className="pb-4 px-6 pt-6 border-b border-border/50">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Upcoming Holidays
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 px-6">
            <div className="space-y-4">
              {holidays
                .filter(h => new Date(h.date) >= new Date(new Date().setHours(0,0,0,0)))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 3)
                .map((holiday, i) => {
                  const holDate = new Date(holiday.date);
                  return (
                    <div key={i} className="flex items-center gap-4 group">
                      <div className="bg-rose-500 rounded-2xl w-14 h-14 flex flex-col items-center justify-center shrink-0 shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform text-white">
                        <span className="text-[10px] font-black uppercase leading-none mb-0.5">{format(holDate, "MMM")}</span>
                        <span className="text-lg font-black leading-none">{format(holDate, "dd")}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-rose-500 transition-colors">{holiday.name}</h4>
                        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Public Holiday</p>
                      </div>
                    </div>
                  );
                })}
              {holidays.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground font-medium">
                  No upcoming holidays.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
