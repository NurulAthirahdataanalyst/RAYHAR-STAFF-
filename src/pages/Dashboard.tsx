import React from "react";
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
  FileText,
  Bell,
  Shield,
  UserCheck,
  TrendingUp,
  Activity,
  Building2,
  Scale,
  BarChart,
  Info,
  TrendingDown,
  ChevronRight,
  CalendarDays,
  MapPin,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

const getStoredUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("presenceSidebarCollapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    const handleSidebarChange = () => {
      setSidebarCollapsed(localStorage.getItem("presenceSidebarCollapsed") === "true");
    };
    window.addEventListener("presenceSidebarCollapsedChanged", handleSidebarChange);
    return () => {
      window.removeEventListener("presenceSidebarCollapsedChanged", handleSidebarChange);
    };
  }, []);

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
    activeCompanyLeave: null as any,
  });

  const [activities, setActivities] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<{ my: any[]; team: any[]; system: any[] }>({ my: [], team: [], system: [] });
  const [activeTab, setActiveTab] = useState<"my" | "team" | "system" | "all">("my");
  const [activityFilter, setActivityFilter] = useState<"all" | "attendance" | "leave" | "approval" | "system">("all");
  const [whoOutToday, setWhoOutToday] = useState<any[]>([]);

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
          const latestUpdate = sessionStorage.getItem("latestAttendanceUpdate");
          let localUpdate = null;

          if (latestUpdate) {
            try {
              localUpdate = JSON.parse(latestUpdate);
            } catch {
              sessionStorage.removeItem("latestAttendanceUpdate");
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
            if (data.activityFeed) {
              setActivityFeed(data.activityFeed);
            }
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
      const params = new URLSearchParams({
        role,
        branch: userBranch || "",
        department: userDepartment || "",
      });
      const response = await fetch(`${API_BASE_URL}/api/who-out-today?${params}`);
      const data = await response.json();
      if (data.success) {
        setWhoOutToday(data.employees || []);
      }
    } catch (err) {
      console.error("Who Out Today Error:", err);
    }
  }, [role, userBranch, userDepartment]);

  // Initial fetch + refresh when focus + Custom Event Listener
  useEffect(() => {
    const latestUpdate = sessionStorage.getItem("latestAttendanceUpdate");
    if (latestUpdate) {
      try {
        applyAttendanceUpdate(JSON.parse(latestUpdate));
      } catch {
        sessionStorage.removeItem("latestAttendanceUpdate");
      }
    }

    fetchDashboardData();
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

  // Auto refresh via SSE and 60-second fallback
  useEffect(() => {
    if (!dashboardUserId) return;

    // Fallback polling every 60 seconds
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 60000);

    // Real-time SSE updates
    const streamUrl = `${API_BASE_URL}/api/presence/stream`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type === 'presence-update' || 
          data.type === 'leave-status' || 
          data.type === 'leave-request' || 
          data.type === 'refresh'
        ) {
          // If the event is from another branch, ignore if role is restricted
          if (role === "branch_leader" || role === "branch_officer" || !["hr_admin", "managing_director", "finance_manager"].includes(role)) {
            if (data.branch && data.branch !== userBranch) return;
          }
          
          fetchDashboardData(true);
          if (["hr_admin", "branch_leader", "managing_director", "finance_manager", "head_of_department"].includes(role)) {
            fetchWhoOutToday();
          }
        }
      } catch (e) {}
    };

    return () => {
      clearInterval(interval);
      eventSource.close();
    };
  }, [dashboardUserId, fetchDashboardData, fetchWhoOutToday, role, userBranch]);

  // Refresh dashboard if Attendance.tsx updates sessionStorage (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "dashboardRefresh") {
        fetchDashboardData(true);
      }

      if (event.key === "latestAttendanceUpdate" && event.newValue) {
        try {
          applyAttendanceUpdate(JSON.parse(event.newValue));
        } catch {
          sessionStorage.removeItem("latestAttendanceUpdate");
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

  const isPresent = stats.todayStatus.includes("Present");
  const isClockedOut = stats.todayStatus.includes("Clocked Out");
  const isOnLeave = stats.todayStatus === "On Leave";
  const isCompanyLeave = stats.todayStatus === "Company Leave";
  const isElevatedRole = ["hr_admin", "branch_leader", "managing_director", "finance_manager", "head_of_department"].includes(role);
  const canSeeSystem = ["hr_admin", "managing_director", "finance_manager", "head_of_department"].includes(role);
  
  const displayStatus = stats.todayStatus
    .replace("Clocked In (Outstation)", "Outstation")
    .replace("Present (Outstation)", "Outstation");
  const todayStatusSubtitle = isPresent
    ? `Clock in: ${stats.todayStatusTime || stats.clockInTime}`
    : isClockedOut
      ? `Clock out: ${stats.todayStatusTime || stats.clockOutTime}`
      : isOnLeave
        ? "Enjoy your leave!"
        : isCompanyLeave
          ? "Company Leave Today"
          : `Clock in: ${stats.clockInTime || "--:--"}`;

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      {/* Header - responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-responsive-2xl font-black tracking-tight text-foreground truncate">
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
      </div>

      {/* Stat Cards - responsive grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 ${role === "employee" ? "lg:grid-cols-4" : (isCompanyLeave && stats.activeCompanyLeave && ["hr_admin", "managing_director", "finance_manager"].includes(role) ? "lg:grid-cols-4 xl:grid-cols-8" : "lg:grid-cols-3 xl:grid-cols-7")}`}>
        {role === "employee" ? (
          <>
            <StatCard
              icon={Clock}
              title="Today's Status"
              value={displayStatus}
              subtitle={todayStatusSubtitle}
              variant={isPresent ? "success" : isClockedOut ? "default" : (isOnLeave || isCompanyLeave) ? "purple" : "maroon"}
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
            {isCompanyLeave && stats.activeCompanyLeave && ["managing_director", "head_of_department", "finance_manager", "hr_admin", "branch_leader"].includes(role) ? (
              <>
                {["hr_admin", "managing_director", "finance_manager"].includes(role) ? (
                  <>
                    <div onClick={() => navigate("/calendar/company-leave")} className="cursor-pointer col-span-1 sm:col-span-2 lg:col-span-2 flex h-full">
                      <Card className="w-full border-none shadow-[0_2px_12px_rgba(0,0,0,0.06)] bg-white overflow-hidden flex flex-col relative group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-[20px] ring-1 ring-slate-100">
                        <CardContent className="p-4 sm:p-5 flex items-center justify-between h-full relative z-10 w-full">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-16 h-16 shrink-0 drop-shadow-sm transition-transform duration-500 group-hover:scale-105">
                              <div className="w-full h-full bg-white rounded-xl shadow-sm border border-purple-100 flex flex-col overflow-hidden">
                                <div className="bg-[#7B0099] py-1 flex justify-center items-center gap-2 relative">
                                  <span className="text-[9px] font-black text-white uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { month: 'short' })}</span>
                                </div>
                                <div className="flex-1 bg-gradient-to-b from-white to-purple-50 flex flex-col items-center justify-center">
                                  <span className="text-xl font-black text-[#1a0029] leading-none">{new Date().getDate()}</span>
                                  <span className="text-[7px] font-bold text-purple-900/50 mt-0.5">{new Date().getFullYear()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1 min-w-0">
                              <p className="text-[10px] font-black text-[#7B0099] uppercase tracking-widest truncate">Company Leave</p>
                              <h3 className="text-lg font-black text-slate-800 tracking-tighter truncate">
                                {stats.activeCompanyLeave.title || stats.activeCompanyLeave.leave_name || "COMPANY TRIP"}
                              </h3>
                              <Badge className="bg-[#7B0099] hover:bg-[#60007A] text-white uppercase text-[9px] tracking-wider font-black border-none shadow-sm rounded-full px-2.5 py-0.5 mt-1">
                                {(() => {
                                  const start = new Date(stats.activeCompanyLeave.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
                                  const end = stats.activeCompanyLeave.end_date ? new Date(stats.activeCompanyLeave.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase() : start;
                                  return start === end ? start : `${start} - ${end}`;
                                })()}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col items-end justify-between h-full py-1 shrink-0">
                            <CalendarDays className="w-5 h-5 text-[#7B0099]/40 mb-auto" />
                            <div className="flex items-center gap-1 text-[#7B0099] font-bold text-[10px] uppercase tracking-wider group-hover:gap-2 transition-all opacity-80 hover:opacity-100 mt-4">
                              View Details <ChevronRight className="w-3 h-3" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <StatCard
                      icon={CheckCircle2}
                      title="Present Today"
                      value={String(stats.presentToday ?? 0)}
                      subtitle="Clocked In Today"
                      variant="success"
                    />
                    <StatCard
                      icon={MapPin}
                      title="Outstation"
                      value={String(stats.outstationToday ?? 0)}
                      subtitle={`${stats.upcomingOutstation ?? 0} Upcoming`}
                      variant="purple"
                    />
                    <StatCard
                      icon={AlertTriangle}
                      title="Absent"
                      value={String(stats.absentToday ?? 0)}
                      subtitle="Not Clocked In"
                      variant="maroon"
                    />
                    <StatCard
                      icon={Users}
                      title="Affected By Company Leave"
                      value={String(stats.companyLeave ?? 0)}
                      subtitle="Employees Exempt"
                      variant="purple"
                    />
                    <StatCard
                      icon={Building2}
                      title="Applies To"
                      value={stats.activeCompanyLeave.applies_to === 'all' ? 'ALL STAFF' : stats.activeCompanyLeave.applies_to === 'branch' ? `BRANCH ${stats.activeCompanyLeave.branch_id}` : `DEPT ${stats.activeCompanyLeave.department_id}`}
                      subtitle="Coverage"
                      variant="purple"
                    />
                    <StatCard
                      icon={AlertTriangle}
                      title="Late Arrivals"
                      value={String(stats.lateArrivals ?? 0)}
                      subtitle="Action Required"
                      variant="maroon"
                    />
                  </>
                ) : (
                  <div onClick={() => navigate("/calendar/company-leave")} className="cursor-pointer col-span-1 sm:col-span-2 flex h-full">
                    <Card className="w-full border-none shadow-xl bg-gradient-to-br from-[#f8f5ff] to-[#f2ecfc] overflow-hidden flex flex-col relative group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 rounded-2xl ring-1 ring-white/60">
                      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-0"></div>
                      <CardContent className="p-4 sm:p-5 flex items-center justify-between h-full relative z-10 w-full">
                        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 drop-shadow-md transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3">
                            <div className="w-full h-full bg-white rounded-xl shadow-md border border-purple-100 flex flex-col overflow-hidden">
                              <div className="bg-[#7B0099] py-1 sm:py-1.5 flex justify-center items-center gap-3 relative overflow-hidden">
                                <div className="absolute inset-0 bg-white/10" />
                                <div className="w-1.5 h-1.5 rounded-full bg-white/80 shadow-sm z-10" />
                                <span className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-widest z-10">{new Date().toLocaleDateString('en-US', { month: 'short' })}</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-white/80 shadow-sm z-10" />
                              </div>
                              <div className="flex-1 bg-gradient-to-b from-white to-purple-50 flex flex-col items-center justify-center">
                                <span className="text-xl sm:text-3xl font-black text-[#1a0029] leading-none drop-shadow-sm">{new Date().getDate()}</span>
                                <span className="text-[7px] sm:text-[9px] font-bold text-purple-900/50 mt-0.5">{new Date().getFullYear()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1 sm:space-y-1.5 min-w-0">
                            <p className="text-[10px] sm:text-[11px] font-black text-[#5c0073] uppercase tracking-widest truncate">Company Leave</p>
                            <h3 className="text-lg sm:text-2xl font-black text-[#1a0029] tracking-tighter truncate drop-shadow-sm">
                              {stats.activeCompanyLeave.title || stats.activeCompanyLeave.leave_name || "COMPANY TRIP"}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-[#7B0099] hover:bg-[#60007A] text-white uppercase text-[9px] sm:text-[10px] tracking-wider font-black border-none shadow-sm rounded-full px-2.5 py-0.5">
                                {(() => {
                                  const start = new Date(stats.activeCompanyLeave.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
                                  const end = stats.activeCompanyLeave.end_date ? new Date(stats.activeCompanyLeave.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase() : start;
                                  return start === end ? start : `${start} - ${end}`;
                                })()}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between h-full py-1 shrink-0">
                          <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center shrink-0 shadow-sm border border-white">
                            <CalendarCheck className="w-4 h-4 text-[#7B0099]" />
                          </div>
                          <div className="flex flex-col items-end mt-1">
                            <p className="text-[9px] sm:text-[10px] font-semibold text-[#5c0073]/70 uppercase tracking-widest mb-0.5">Applies to</p>
                            <p className="text-[10px] sm:text-[11px] font-black text-[#7B0099] uppercase tracking-wider bg-white/50 px-2 py-0.5 rounded-md border border-white/50 shadow-sm">
                              {stats.activeCompanyLeave.applies_to === 'all' ? 'All Staff' : stats.activeCompanyLeave.applies_to === 'branch' ? `Branch: ${stats.activeCompanyLeave.branch_id}` : stats.activeCompanyLeave.applies_to === 'department' ? `Dept: ${stats.activeCompanyLeave.department_id}` : stats.activeCompanyLeave.applies_to}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-[#7B0099] font-bold text-[10px] sm:text-[11px] uppercase tracking-wider group-hover:gap-2 transition-all opacity-80 hover:opacity-100 mt-2">
                            View Details <ChevronRight className="w-3 h-3" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            ) : (
              <>
                {["managing_director", "head_of_department", "finance_manager", "hr_admin", "branch_leader"].includes(role) && (
                  <StatCard
                    icon={Clock}
                    title="Today's Status"
                    value={displayStatus}
                    subtitle={todayStatusSubtitle}
                    variant={isPresent ? "success" : isClockedOut ? "default" : (isOnLeave || isCompanyLeave) ? "purple" : "maroon"}
                  />
                )}
                {stats.activeCompanyLeave ? (
                  <div onClick={() => navigate("/calendar/company-leave")} className="cursor-pointer">
                    <Card className="border-none shadow-md bg-card overflow-hidden h-[120px] sm:h-[130px] flex flex-col relative group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                      <div className="absolute top-0 right-0 p-3 opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:opacity-20 text-[#7B0099]">
                        <CalendarCheck className="w-16 h-16 sm:w-20 sm:h-20" />
                      </div>
                      <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full flex-grow relative z-10">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] sm:text-[11px] font-black text-muted-foreground uppercase tracking-widest truncate">Company Leave</p>
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#7B0099]/10 flex items-center justify-center shrink-0">
                              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7B0099]" />
                            </div>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tighter truncate">
                              {stats.activeCompanyLeave.title || stats.activeCompanyLeave.leave_name || "Company Leave"}
                            </h3>
                          </div>
                          <div className="flex flex-col gap-1 mt-1">
                            <Badge variant="outline" className="w-fit border-[#7B0099]/20 text-[#7B0099] bg-[#7B0099]/5 uppercase text-[8px] tracking-wider font-black">
                              📅 {(() => {
                                const start = new Date(stats.activeCompanyLeave.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
                                const end = stats.activeCompanyLeave.end_date ? new Date(stats.activeCompanyLeave.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase() : start;
                                return start === end ? start : `${start} - ${end}`;
                              })()}
                            </Badge>
                            <Badge variant="outline" className="w-fit border-slate-500/20 text-slate-600 bg-slate-500/5 uppercase text-[8px] tracking-wider font-black truncate max-w-full">
                              👥 Applies To: {stats.activeCompanyLeave.applies_to === 'all' ? 'All Staff' : stats.activeCompanyLeave.applies_to === 'branch' ? `Branch: ${stats.activeCompanyLeave.branch_id}` : stats.activeCompanyLeave.applies_to === 'department' ? `Dept: ${stats.activeCompanyLeave.department_id}` : stats.activeCompanyLeave.applies_to}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div onClick={() => navigate("/employees")} className="cursor-pointer">
                    <StatCard
                      icon={Users}
                      title="Total Employees"
                      value={String(stats.totalEmployees ?? 0)}
                      subtitle="Active Personnel"
                      variant="success"
                    />
                  </div>
                )}
              </>
            )}
            {!(isCompanyLeave && stats.activeCompanyLeave && ["hr_admin", "managing_director", "finance_manager"].includes(role)) && (
              <>
                <StatCard
                  icon={CheckCircle2}
                  title="Present Today"
                  value={String(stats.presentToday ?? 0)}
                  subtitle="Clocked In Today"
                  variant="success"
                />
                <StatCard
                  icon={MapPin}
                  title="Outstation"
                  value={String(stats.outstationToday ?? 0)}
                  subtitle={`${stats.upcomingOutstation ?? 0} Upcoming`}
                  variant="purple"
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
                  title="Absent"
                  value={String(stats.absentToday ?? 0)}
                  subtitle="Not Clocked In"
                  variant="maroon"
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
          </>
        )}
      </div>

      {isCompanyLeave && stats.activeCompanyLeave && ["hr_admin", "managing_director", "finance_manager"].includes(role) && (
        <Card className="border-none shadow-[0_2px_12px_rgba(0,0,0,0.06)] rounded-[20px] overflow-hidden bg-white mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100 fill-mode-both">
          <CardHeader className="border-b border-border/50 pb-3 px-4 flex flex-col md:flex-row md:items-center justify-between bg-white gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#7B0099]/10 rounded-xl">
                <Scale className="w-5 h-5 text-[#7B0099]" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-slate-800 tracking-tight uppercase">
                  Attendance Comparison
                </CardTitle>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  See how today compares to a normal working day
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#7B0099]"></div>
                Today ({new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                Normal Working Day (Avg)
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 bg-slate-50/50">
            {(() => {
              const todayTotal = stats.totalEmployees || 0;
              const typicalTotal = todayTotal || 1;
              const typicalPresent = Math.round(todayTotal * 0.88);
              const typicalAffected = 0;
              const typicalLate = Math.round(todayTotal * 0.05);
              const todayPresent = stats.presentToday || 0;
              const todayAffected = stats.companyLeave || 0;
              const todayLate = stats.lateArrivals || 0;

              const todayAttendanceRate = ((todayPresent / todayTotal) * 100) || 0;
              const typicalAttendanceRate = ((typicalPresent / typicalTotal) * 100) || 0;

              const presentDiff = ((typicalPresent - todayPresent) / typicalPresent * 100).toFixed(1);
              const lateDiff = typicalLate > 0 ? ((typicalLate - todayLate) / typicalLate * 100).toFixed(0) : 0;
              const rateDiff = (typicalAttendanceRate - todayAttendanceRate).toFixed(1);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  {/* Total Employees */}
                  <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col relative h-[180px]">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Total Employees</span>
                      <Info className="w-3 h-3 text-slate-400 ml-auto" />
                    </div>
                    <div className="flex justify-between items-end mb-4 flex-1 px-2">
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-[#7B0099]">{todayTotal}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Today</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-slate-800">{typicalTotal}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Normal</span>
                      </div>
                    </div>
                    <div className="h-16 flex items-end justify-center gap-8 mt-auto px-4 border-b border-slate-200">
                      <div className="w-8 bg-[#7B0099] rounded-t-sm transition-all duration-1000 delay-300" style={{ height: '100%' }}></div>
                      <div className="w-8 bg-slate-300 rounded-t-sm transition-all duration-1000 delay-300" style={{ height: '100%' }}></div>
                    </div>
                    <div className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-emerald-400 rounded-b-xl"></div>
                  </div>

                  {/* Present */}
                  <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col relative h-[180px]">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Present <span className="hidden lg:inline">(Clocked In)</span></span>
                      <Info className="w-3 h-3 text-slate-400 ml-auto shrink-0" />
                    </div>
                    <div className="flex justify-between items-end mb-4 flex-1 px-2">
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-[#7B0099]">{todayPresent}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Today</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-slate-800">{typicalPresent}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Normal</span>
                      </div>
                    </div>
                    <div className="h-16 flex items-end justify-center gap-8 mt-auto px-4 border-b border-slate-200">
                      <div className="w-8 bg-[#7B0099] rounded-t-sm transition-all duration-1000 delay-300" style={{ height: typicalPresent ? `${(todayPresent/typicalPresent)*100}%` : '0%' }}></div>
                      <div className="w-8 bg-slate-300 rounded-t-sm transition-all duration-1000 delay-300" style={{ height: '100%' }}></div>
                    </div>
                    <div className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-red-400 rounded-b-xl"></div>
                    <div className="absolute bottom-1 left-0 right-0 flex justify-center translate-y-full pt-2">
                      <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-full">
                        <TrendingDown className="w-3 h-3" /> {presentDiff}% lower
                      </span>
                    </div>
                  </div>

                  {/* Affected By Company Leave */}
                  <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col relative h-[180px]">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-md bg-[#7B0099]/10 text-[#7B0099] flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-tight">Affected By<br/>Company Leave</span>
                      <Info className="w-3 h-3 text-slate-400 ml-auto shrink-0" />
                    </div>
                    <div className="flex justify-between items-end mb-4 flex-1 px-2">
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-[#7B0099]">{todayAffected}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Today</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-slate-800">{typicalAffected}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Normal</span>
                      </div>
                    </div>
                    <div className="h-16 flex items-end justify-center gap-8 mt-auto px-4 border-b border-slate-200">
                      <div className="w-8 bg-[#7B0099] rounded-t-sm transition-all duration-1000 delay-300" style={{ height: '100%' }}></div>
                      <div className="w-8 bg-slate-300 rounded-t-sm transition-all duration-1000 delay-300" style={{ height: '2%' }}></div>
                    </div>
                    <div className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-emerald-400 rounded-b-xl"></div>
                    <div className="absolute bottom-1 left-0 right-0 flex justify-center translate-y-full pt-2">
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <TrendingUp className="w-3 h-3" /> +{todayAffected} employees
                      </span>
                    </div>
                  </div>

                  {/* Attendance Rate */}
                  <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col relative h-[180px]">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <BarChart className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Attendance Rate</span>
                      <Info className="w-3 h-3 text-slate-400 ml-auto" />
                    </div>
                    <div className="flex justify-between items-end mb-4 flex-1 px-2">
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-[#7B0099]">{todayAttendanceRate.toFixed(1)}%</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Today</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-slate-800">{typicalAttendanceRate.toFixed(1)}%</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Normal</span>
                      </div>
                    </div>
                    <div className="h-16 flex items-end justify-center gap-8 mt-auto px-4 border-b border-slate-200">
                      <div className="w-8 bg-[#7B0099] rounded-t-sm transition-all duration-1000 delay-300" style={{ height: typicalAttendanceRate ? `${(todayAttendanceRate/typicalAttendanceRate)*100}%` : '0%' }}></div>
                      <div className="w-8 bg-slate-300 rounded-t-sm transition-all duration-1000 delay-300" style={{ height: '100%' }}></div>
                    </div>
                    <div className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-red-400 rounded-b-xl"></div>
                    <div className="absolute bottom-1 left-0 right-0 flex justify-center translate-y-full pt-2">
                      <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-full">
                        <TrendingDown className="w-3 h-3" /> {rateDiff}% lower
                      </span>
                    </div>
                  </div>

                  {/* Late Arrivals */}
                  <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col relative h-[180px]">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Late Arrivals</span>
                      <Info className="w-3 h-3 text-slate-400 ml-auto" />
                    </div>
                    <div className="flex justify-between items-end mb-4 flex-1 px-2">
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-[#7B0099]">{todayLate}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Today</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-slate-800">{typicalLate}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Normal</span>
                      </div>
                    </div>
                    <div className="h-16 flex items-end justify-center gap-8 mt-auto px-4 border-b border-slate-200">
                      <div className="w-8 bg-[#7B0099] rounded-t-sm transition-all duration-1000 delay-300" style={{ height: todayLate > 0 ? `${(todayLate/typicalLate)*100}%` : '2%' }}></div>
                      <div className="w-8 bg-slate-300 rounded-t-sm transition-all duration-1000 delay-300" style={{ height: '100%' }}></div>
                    </div>
                    <div className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-emerald-400 rounded-b-xl"></div>
                    <div className="absolute bottom-1 left-0 right-0 flex justify-center translate-y-full pt-2">
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <TrendingDown className="w-3 h-3" /> {lateDiff}% lower
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="mt-10 bg-gradient-to-r from-indigo-50/80 to-purple-50/50 rounded-xl p-3 sm:p-4 border border-indigo-100 flex items-start gap-3 sm:gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-indigo-100">
                <Info className="w-4 h-4 text-[#7B0099]" />
              </div>
              <div className="pt-0.5">
                <p className="text-xs font-black text-[#1a0029] mb-1">Why the difference?</p>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Today's attendance is lower because <span className="font-bold text-[#7B0099] bg-white px-1 py-0.5 rounded shadow-sm border border-slate-100">{stats.companyLeave || 0} employees</span> are on Company Leave (<span className="font-bold">{stats.activeCompanyLeave.title || "Company Trip"}</span>) which applies to <span className="font-bold text-[#7B0099] bg-white px-1 py-0.5 rounded shadow-sm border border-slate-100 uppercase">{stats.activeCompanyLeave.applies_to === 'all' ? 'ALL STAFF' : stats.activeCompanyLeave.applies_to === 'branch' ? `BRANCH ${stats.activeCompanyLeave.branch_id}` : `DEPT ${stats.activeCompanyLeave.department_id}`}</span>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left Column (Who's Out Today & Recent Activity) */}
        <div className="xl:col-span-2 space-y-4">
          {/* Who's Out Today - admin roles only */}
          {["hr_admin", "branch_leader", "managing_director", "finance_manager", "head_of_department"].includes(role) && (
            <Card className="border border-slate-200 shadow-none rounded-md overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-100 pb-3 px-4 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <CalendarOff className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-800 tracking-tight">
                        Who's Out Today
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {whoOutToday.length} employee{whoOutToday.length !== 1 ? "s" : ""} currently on leave / outstation
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/leave/admin")}
                    className="text-[10px] font-bold text-indigo-700 hover:text-indigo-800 hover:bg-transparent uppercase tracking-widest px-0 h-auto self-start"
                  >
                    VIEW ALL HISTORY →
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {whoOutToday.length > 0 ? (
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3`}>
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
                        "Cuti Tahunan": { short: "ANNUAL/EMERGENCY", color: "bg-blue-600" },
                        "Annual/Emergency Leave": { short: "ANNUAL/EMERGENCY", color: "bg-blue-600" },
                        "Cuti Sakit": { short: "MC/SICK", color: "bg-rose-600" },
                        "Sick Leave": { short: "MC/SICK", color: "bg-rose-600" },
                        "Cuti Kecemasan": { short: "EMERGENCY", color: "bg-amber-500" },
                        "Cuti Ganti": { short: "REPLACEMENT", color: "bg-violet-600" },
                        "Replacement Leave": { short: "REPLACEMENT", color: "bg-violet-600" },
                        "Cuti Tanpa Gaji": { short: "UNPAID", color: "bg-slate-600" },
                        "Unpaid Leave": { short: "UNPAID", color: "bg-slate-600" },
                        "Cuti Ehsan": { short: "COMPASSIONATE", color: "bg-teal-600" },
                        "Outstation": { short: "OUTSTATION", color: "bg-indigo-600" },
                      };
                      const typeInfo = leaveTypeLabel[emp.leave_type] || { short: emp.leave_type?.toUpperCase(), color: "bg-gray-600" };

                      return (
                        <div
                          key={emp.leave_id}
                          onClick={() => navigate(`/leave/admin?leaveId=${emp.leave_id}`)}
                          className="cursor-pointer group rounded-sm border border-slate-200 bg-white hover:border-indigo-300 transition-colors duration-200 p-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
                              {emp.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-slate-800 uppercase tracking-tight truncate">
                                {emp.full_name}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                {emp.leave_type} • {endLabel}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className={`text-[9px] font-bold text-white px-2 py-0.5 rounded-sm ${typeInfo.color}`}>
                                  {typeInfo.short}
                                </span>
                                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">
                                  {emp.branch}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <p className="text-sm font-bold text-slate-700">All Hands on Deck!</p>
                    <p className="text-xs text-slate-500">No employees are on leave today.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Enterprise Recent Activity Feed */}
          <Card className="border border-slate-200 shadow-none rounded-md overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 pb-0 px-4 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  <CardTitle className="text-lg font-bold text-slate-800">
                    Recent Activity
                  </CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  {lastUpdated && (
                    <span className="text-xs italic text-slate-500">Updated a few seconds ago</span>
                  )}
                  <div className="border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-slate-600">
                    Last 10 Events
                  </div>
                </div>
              </div>

              {/* Tab Strip */}
              <div className="flex gap-4 border-b border-slate-200">
                {([
                  { key: "my", label: "My Activity" },
                  ...(isElevatedRole ? [{ key: "team", label: "Team" }] : []),
                  ...(canSeeSystem ? [{ key: "system", label: "System" }] : []),
                  ...((role === "hr_admin" || role === "managing_director") ? [{ key: "all", label: "All" }] : []),
                ] as { key: "my" | "team" | "system" | "all"; label: string }[]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`pb-2 text-sm font-bold transition-all duration-200 border-b-2 ${
                      activeTab === tab.key
                        ? "border-indigo-700 text-indigo-700"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Filter Chips */}
              <div className="flex gap-2 my-3 flex-wrap">
                {([
                  { key: "all", label: "ALL" },
                  { key: "attendance", label: "ATTENDANCE" },
                  { key: "leave", label: "LEAVE" },
                  ...(isElevatedRole ? [{ key: "approval", label: "APPROVAL" }] : []),
                  ...(canSeeSystem ? [{ key: "system", label: "SYSTEM" }] : []),
                ] as { key: "all" | "attendance" | "leave" | "approval" | "system"; label: string }[]).map(chip => (
                  <button
                    key={chip.key}
                    onClick={() => setActivityFilter(chip.key)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all duration-200 ${
                      activityFilter === chip.key
                        ? "bg-indigo-700 text-white border-indigo-700"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {(() => {
                let feedItems: any[] = [];
                if (activeTab === "my") feedItems = activityFeed.my;
                else if (activeTab === "team") feedItems = activityFeed.team;
                else if (activeTab === "system") feedItems = activityFeed.system;
                else if (activeTab === "all") feedItems = [...activityFeed.my, ...activityFeed.team, ...activityFeed.system].sort((a, b) => 0);

                if (activityFilter !== "all") {
                  feedItems = feedItems.filter(item => item.type === activityFilter);
                }

                if (feedItems.length === 0) {
                  return (
                    <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                      <Activity className="w-6 h-6 text-slate-300" />
                      <p className="text-xs text-slate-500 font-medium">No activity found.</p>
                    </div>
                  );
                }

                return (
                  <div className="w-full text-left border-t border-slate-100">
                    <div className="grid grid-cols-12 px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                      <div className="col-span-2">Type</div>
                      <div className="col-span-3">Timestamp</div>
                      <div className="col-span-5">Description</div>
                      <div className="col-span-2 text-right">Status</div>
                    </div>
                    {feedItems.map((item, i) => {
                      const badgeColor: Record<string, string> = {
                        Present: "text-indigo-700 border-indigo-200",
                        "Clocked Out": "text-slate-600 border-slate-200",
                        Approved: "text-emerald-700 border-emerald-200",
                        Rejected: "text-red-700 border-red-200",
                        Late: "text-rose-700 border-rose-200",
                        Active: "text-violet-700 border-violet-200",
                        System: "text-blue-700 border-blue-200",
                        Reminder: "text-yellow-700 border-yellow-200",
                        Note: "text-slate-600 border-slate-200",
                      };
                      const badgeCls = badgeColor[item.badge] || "text-slate-500 border-slate-200";
                      
                      const typeIcon: Record<string, string> = {
                        attendance: "text-indigo-700",
                        leave: "text-indigo-700",
                        approval: "text-indigo-700",
                        system: "text-rose-600",
                      };

                      return (
                        <div
                          key={i}
                          className="grid grid-cols-12 px-4 py-3 border-b border-slate-50 items-center hover:bg-slate-50 transition-colors"
                        >
                          <div className="col-span-2 flex items-center gap-2 text-xs font-bold text-slate-700 capitalize">
                            <div className={`w-1.5 h-1.5 rounded-full bg-current ${typeIcon[item.type] || 'text-slate-400'}`}></div>
                            {item.type}
                          </div>
                          <div className="col-span-3 text-[11px] text-slate-600">
                            {item.time}
                          </div>
                          <div className="col-span-5 text-[11px] text-slate-800 truncate pr-4">
                            <span className="font-bold">{item.actor}</span> {item.action} {item.target && item.target}
                            {item.context && <span className="block text-slate-500 truncate">{item.context}</span>}
                          </div>
                          <div className="col-span-2 text-right">
                            <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${badgeCls}`}>
                              {item.badge}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="p-3 border-t border-slate-100 flex justify-center">
                <button
                  onClick={() => navigate("/attendance")}
                  className="text-[11px] font-bold text-indigo-700 hover:underline"
                >
                  Load More History
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="xl:col-span-1 space-y-4">
          
          {/* Quick Actions */}
          <Card className="border border-slate-200 shadow-none rounded-md overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 pb-3 px-4 pt-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
                  Quick Actions
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <div onClick={() => navigate("/attendance")} className="cursor-pointer flex flex-col items-center justify-center p-4 border border-slate-200 rounded-md hover:border-indigo-300 hover:bg-slate-50 transition-colors">
                  <Clock className="w-6 h-6 text-indigo-700 mb-2" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase text-center">Clock In/Out</span>
                </div>
                <div onClick={() => navigate("/leave/apply")} className="cursor-pointer flex flex-col items-center justify-center p-4 border border-slate-200 rounded-md hover:border-indigo-300 hover:bg-slate-50 transition-colors">
                  <CalendarCheck className="w-6 h-6 text-indigo-700 mb-2" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase text-center">Apply Leave</span>
                </div>
                {["hr_admin", "managing_director", "finance_manager", "head_of_department", "branch_leader"].includes(role) && (
                  <div onClick={() => navigate("/outstation")} className="cursor-pointer flex flex-col items-center justify-center p-4 border border-slate-200 rounded-md hover:border-indigo-300 hover:bg-slate-50 transition-colors col-span-2">
                    <MapPin className="w-6 h-6 text-indigo-700 mb-2" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase text-center">Outstation</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Outstation */}
          <Card className="border border-slate-200 shadow-none rounded-md overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 pb-3 px-4 pt-4 flex flex-row items-center justify-between">
              <CardTitle className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
                Upcoming Outstation
              </CardTitle>
              <span className="text-[10px] font-bold text-indigo-600 uppercase cursor-pointer hover:underline">
                Calendar
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex items-center gap-4 p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-indigo-50 rounded flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-indigo-700 uppercase">Jul</span>
                  <span className="text-lg font-black text-indigo-900 leading-none mt-0.5">09</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Site Audit - Zone B</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Kelantan Branch • 09:00 AM</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-indigo-50 rounded flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-indigo-700 uppercase">Jul</span>
                  <span className="text-lg font-black text-indigo-900 leading-none mt-0.5">12</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Client Meeting - HQ</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Kuala Lumpur • All Day</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Attendance Score */}
          <Card className="border-none shadow-none rounded-md overflow-hidden bg-indigo-800 text-white">
            <CardContent className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">
                Monthly Attendance Score
              </p>
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl font-black">{stats.attendanceRate}%</span>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-sm mb-1.5">
                  +1.2%
                </span>
              </div>
              <p className="text-[11px] opacity-80">
                Excellent performance this month!
              </p>
            </CardContent>
          </Card>

          {/* Server Status */}
          <Card className="border border-slate-200 shadow-none rounded-md overflow-hidden bg-white">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Server Status
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                  Operational
                </span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
