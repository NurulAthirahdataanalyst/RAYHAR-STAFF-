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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const { role, userName, userId, userBranch } = useRole();
  const storedUser = getStoredUser();

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

  const rawName = userName || user?.full_name || "User";
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 21) return "Good evening";
    return "Good night";
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
          `https://rayhar-staff-production.up.railway.app/api/dashboard-stats?userId=${dashboardUserId}&role=${role}&branch=${encodeURIComponent(userBranch || "")}`
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
        <Loader2 className="animate-spin text-[#800000] w-12 h-12" />
        <p className="text-slate-500 animate-pulse font-medium">
          Loading your workspace...
        </p>
      </div>
    );
  }

  /**
   * UPDATED: Strict Status Check
   * We now rely directly on what the server says. 
   * If server says "Present", it means user is currently clocked in.
   */
  const isPresent = stats.todayStatus === "Present";
  const isClockedOut = stats.todayStatus === "Clocked Out";
  const todayStatusSubtitle = isPresent
    ? `Clock in: ${stats.todayStatusTime || stats.clockInTime}`
    : isClockedOut
      ? `Clock out: ${stats.todayStatusTime || stats.clockOutTime}`
      : "Not clocked in today";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            {getGreeting()}, {rawName}!
          </h1>
          <p className="text-muted-foreground font-medium mt-1 flex items-center gap-2">
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
          className="rounded-xl border-border hover:bg-accent text-foreground gap-2 font-bold"
        >
          <RefreshCcw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${["managing_director", "head_of_department", "finance_manager", "hr_admin"].includes(role) ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-4`}>
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
            <StatCard
              icon={Users}
              title="Total Employees"
              value={String(stats.totalEmployees ?? 0)}
              subtitle="Active Personnel"
              variant="success"
            />
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

      <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] rounded-[32px] overflow-hidden bg-card">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-black text-foreground uppercase tracking-wider">
              Recent Activity
            </CardTitle>
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <span className="text-[11px] font-bold text-muted-foreground">
                  {lastUpdated}
                </span>
              )}
              <Badge
                variant="outline"
                className="rounded-lg font-bold border-border text-muted-foreground"
              >
                Last 5 Events
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-1">
            {activities && activities.length > 0 ? (
              activities.map((item, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-4 py-4 px-2 rounded-2xl hover:bg-accent/50 transition-colors duration-200"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-card group-hover:shadow-sm transition-all">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">
                      Today, {item.time}
                    </p>
                    <p className="text-xs font-bold text-muted-foreground">
                      {item.status}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400 font-bold tracking-tight">
                  No activity recorded for this period.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
