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
  ChevronRight,
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
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 ${role === "employee" || role === "branch_officer" ? "lg:grid-cols-4" : "lg:grid-cols-5"}`}>
        {role === "employee" || role === "branch_officer" ? (
          <>
            <StatCard
              icon={Clock}
              title="Today's Status"
              value={stats.todayStatus}
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
            {["managing_director", "head_of_department", "finance_manager", "hr_admin", "branch_leader"].includes(role) && (
              <StatCard
                icon={Clock}
                title="Today's Status"
                value={stats.todayStatus}
                subtitle={todayStatusSubtitle}
                variant={isPresent ? "success" : isClockedOut ? "default" : (isOnLeave || isCompanyLeave) ? "purple" : "maroon"}
              />
            )}
            {isCompanyLeave && stats.activeCompanyLeave ? (
              <div onClick={() => navigate("/leave")} className="cursor-pointer">
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
                          📅 {new Date(stats.activeCompanyLeave.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
        <Card className="border-none shadow-[0_2px_12px_rgba(0,0,0,0.06)] rounded-[20px] overflow-hidden bg-card">
          <CardHeader className="border-b border-border/50 pb-3 px-3 sm:px-4">
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
          <CardContent className="p-3 sm:p-3">
            {whoOutToday.length > 0 ? (
              <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3`}>
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
                      className="cursor-pointer group rounded-[20px] border border-border/60 bg-card hover:border-[#7B0099]/30 hover:shadow-lg transition-all duration-300 p-3.5"
                    >
                      {/* Top: Avatar + Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-md bg-[#7B0099]/10 flex items-center justify-center text-base font-black text-[#7B0099] group-hover:scale-110 transition-transform shrink-0">
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
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/40">
                        <Badge className={`${typeInfo.color} text-white text-[10px] font-black px-2.5 py-0.5 h-auto border-none rounded-md`}>
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
              <div className="py-3 text-center flex items-center justify-center gap-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 max-w-md mx-auto my-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-foreground">All Hands on Deck! No employees are on leave today.</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enterprise Recent Activity Feed */}
      <Card className="border-none shadow-[0_2px_12px_rgba(0,0,0,0.06)] rounded-[20px] overflow-hidden bg-card">
        <CardHeader className="border-b border-border/50 pb-3 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#7B0099]" />
              <CardTitle className="text-base sm:text-lg font-black text-foreground uppercase tracking-wider">
                Recent Activity
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-[10px] font-bold text-muted-foreground">{lastUpdated}</span>
              )}
              <Badge variant="outline" className="rounded-lg font-bold border-border text-muted-foreground text-[10px]">
                Last 10 Events
              </Badge>
            </div>
          </div>

          {/* Tab Strip */}
          <div className="flex gap-1 mt-3 bg-muted/40 rounded-xl p-1">
            {([
              { key: "my", label: "My Activity" },
              ...(isElevatedRole ? [{ key: "team", label: "Team" }] : []),
              ...(canSeeSystem ? [{ key: "system", label: "System" }] : []),
              ...((role === "hr_admin" || role === "managing_director") ? [{ key: "all", label: "All" }] : []),
            ] as { key: "my" | "team" | "system" | "all"; label: string }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-[#7B0099] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filter Chips */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {([
              { key: "all", label: "All" },
              { key: "attendance", label: "Attendance" },
              { key: "leave", label: "Leave" },
              ...(isElevatedRole ? [{ key: "approval", label: "Approval" }] : []),
              ...(canSeeSystem ? [{ key: "system", label: "System" }] : []),
            ] as { key: "all" | "attendance" | "leave" | "approval" | "system"; label: string }[]).map(chip => (
              <button
                key={chip.key}
                onClick={() => setActivityFilter(chip.key)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all duration-200 ${
                  activityFilter === chip.key
                    ? "bg-[#7B0099]/10 text-[#7B0099] border-[#7B0099]/30"
                    : "border-border/50 text-muted-foreground hover:border-[#7B0099]/30"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-3 px-3">
          {(() => {
            // Determine which feed to show
            let feedItems: any[] = [];
            if (activeTab === "my") feedItems = activityFeed.my;
            else if (activeTab === "team") feedItems = activityFeed.team;
            else if (activeTab === "system") feedItems = activityFeed.system;
            else if (activeTab === "all") feedItems = [...activityFeed.my, ...activityFeed.team, ...activityFeed.system].sort((a, b) => 0);

            // Apply type filter
            if (activityFilter !== "all") {
              feedItems = feedItems.filter(item => item.type === activityFilter);
            }

            if (feedItems.length === 0) {
              return (
                <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                  <Activity className="w-6 h-6 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground font-bold">No activity found for this view.</p>
                </div>
              );
            }

            return (
              <div className="space-y-1">
                {feedItems.map((item, i) => {
                  // Icon + colour by type
                  const typeConfig: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
                    attendance: { icon: <Clock className="w-4 h-4" />, bg: "bg-[#7B0099]/10", text: "text-[#7B0099]" },
                    leave: { icon: <CalendarCheck className="w-4 h-4" />, bg: "bg-amber-500/10", text: "text-amber-600" },
                    approval: { icon: <CheckCircle2 className="w-4 h-4" />, bg: "bg-emerald-500/10", text: "text-emerald-600" },
                    system: { icon: <Shield className="w-4 h-4" />, bg: "bg-blue-500/10", text: "text-blue-600" },
                    note: { icon: <FileText className="w-4 h-4" />, bg: "bg-slate-500/10", text: "text-slate-600" },
                  };
                  const cfg = typeConfig[item.type] || typeConfig.attendance;

                  // Badge colour by badge value
                  const badgeColor: Record<string, string> = {
                    Present: "bg-[#7B0099]/10 text-[#7B0099]",
                    "Clocked Out": "bg-slate-100 text-slate-600",
                    Approved: "bg-emerald-100 text-emerald-700",
                    Rejected: "bg-red-100 text-red-700",
                    Late: "bg-rose-100 text-rose-700",
                    Active: "bg-violet-100 text-violet-700",
                    System: "bg-blue-100 text-blue-700",
                    Reminder: "bg-yellow-100 text-yellow-700",
                    Note: "bg-slate-100 text-slate-600",
                  };
                  const badgeCls = badgeColor[item.badge] || "bg-muted text-muted-foreground";

                  return (
                    <div
                      key={i}
                      className="group flex items-start gap-3 py-2.5 px-3 rounded-2xl hover:bg-accent/50 transition-colors duration-200"
                    >
                      {/* Type icon */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg} ${cfg.text}`}>
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground leading-tight">
                              <span className="text-[#7B0099]">{item.actor}</span>
                              {" "}
                              <span className="text-foreground font-semibold">{item.action}</span>
                              {item.target && (
                                <>
                                  {" → "}
                                  <span className="font-bold">{item.target}</span>
                                </>
                              )}
                            </p>
                            {item.context && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.context}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">{item.time}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide ${badgeCls}`}>
                              {item.badge}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* View All footer */}
          <div className="mt-3 pt-3 border-t border-border/40 flex justify-center">
            <button
              onClick={() => navigate("/attendance")}
              className="flex items-center gap-1.5 text-xs font-bold text-[#7B0099] hover:underline transition-all"
            >
              View All Activity
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
