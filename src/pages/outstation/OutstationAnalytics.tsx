import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config/api";
import { Loader2, RefreshCw, MapPin, Users, Briefcase, Calendar, CheckCircle2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

const ALLOWED_ROLES = ["hr_admin", "managing_director", "finance_manager", "branch_leader", "head_of_department"];
const STATUS_COLORS: Record<string, string> = {
  Active: "#16a34a",
  Upcoming: "#f97316",
  Completed: "#2563eb",
  Cancelled: "#dc2626",
  Unknown: "#6b7280"
};

function formatShortDate(dStr: string) {
  if (!dStr) return "—";
  return new Date(dStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusBadge(status: string) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.Unknown;
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: color }}>
      {status}
    </span>
  );
}

export default function OutstationAnalytics() {
  const navigate = useNavigate();
  const { role, userBranch, userDepartment } = useRole();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Role authorization check
  useEffect(() => {
    if (role && !ALLOWED_ROLES.includes(role)) {
      navigate("/");
    }
  }, [role, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Build query params based on role
      const params = new URLSearchParams();
      if (role === "branch_leader") {
        params.append("role", "branch_leader");
        if (userBranch) params.append("branch", userBranch);
      } else if (role === "head_of_department") {
        params.append("role", "head_of_department");
        if (userDepartment) params.append("department", userDepartment);
      } else if (["hr_admin", "managing_director", "finance_manager"].includes(role || "")) {
        params.append("role", role);
      }

      const [statsRes, assignmentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/outstation/stats?${params.toString()}`),
        fetch(`${API_BASE_URL}/api/outstation?${params.toString()}`),
      ]);
      const statsData = await statsRes.json();
      const assignmentsData = await assignmentsRes.json();
      if (statsData.success) setStats(statsData.stats || {});
      if (assignmentsData.success) setAssignments(assignmentsData.assignments || []);
    } catch (e) {
      console.error("fetch outstation analytics", e);
    } finally {
      setLoading(false);
    }
  }, [role, userBranch, userDepartment]);

  useEffect(() => {
    void fetchData();

    const es = new EventSource(`${API_BASE_URL}/api/presence/stream`);
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload && (payload.type === "outstation" || payload.type === "company_leave" || payload.type === "refresh")) {
          void fetchData();
        }
      } catch (e) {
        void fetchData();
      }
    };
    es.onerror = (err) => { console.error("SSE error", err); };
    return () => es.close();
  }, [fetchData]);

  const totalAssignments = assignments.length;
  const activeStaffCount = useMemo(() => new Set(assignments.filter(a => a.status === "Active").map(a => a.user_id)).size, [assignments]);
  const totalDestinations = useMemo(() => new Set(assignments.map(a => a.destination || "Unknown")).size, [assignments]);
  const activeCount = stats.active || 0;
  const completedCount = stats.completed || 0;
  const upcomingCount = stats.upcoming || 0;

  const destinationData = useMemo(() => {
    const counts: Record<string, number> = {};
    assignments.forEach(a => {
      const destination = a.destination || "Unknown";
      counts[destination] = (counts[destination] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([destination, count]) => ({ destination, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [assignments]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { Active: 0, Upcoming: 0, Completed: 0, Cancelled: 0, Unknown: 0 };
    assignments.forEach(a => {
      counts[a.status || "Unknown"] = (counts[a.status || "Unknown"] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({ status, value })).filter(item => item.value > 0);
  }, [assignments]);

  const recentAssignments = useMemo(() => assignments
    .slice()
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
    .slice(0, 5),
  [assignments]);

  const upcomingGroups = useMemo(() => {
    const groups: Record<string, { destination: string; purpose: string; start_date: string; count: number }> = {};
    assignments.filter(a => a.status === "Upcoming").forEach(a => {
      const key = `${a.destination}_${a.purpose}_${a.start_date}`;
      if (!groups[key]) groups[key] = { destination: a.destination, purpose: a.purpose || a.project || "General", start_date: a.start_date, count: 0 };
      groups[key].count += 1;
    });
    return Object.values(groups).slice(0, 4);
  }, [assignments]);

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 pt-2 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.24em] text-slate-500">Outstation Insight</div>
            <h1 className="mt-2 text-3xl font-bold">Overview of outstation activities and staff on assignment.</h1>
          </div>
          <Button onClick={() => void fetchData()} className="h-11 px-5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
          <Card className="lg:col-span-1">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700 "><Briefcase className="h-6 w-6" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total Outstation</p>
                  <p className="mt-2 text-3xl font-bold">{totalAssignments}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-5 text-slate-500">Active outstation requests across all branches.</p>
            </CardContent>
          </Card>
          <Card className="lg:col-span-1">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Users className="h-7 w-7" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Staff on Outstation</p>
                  <p className="mt-2 text-3xl font-bold">{activeStaffCount}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">Unique team members currently away on assignment.</p>
            </CardContent>
          </Card>
          <Card className="lg:col-span-1">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><MapPin className="h-6 w-6" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Destinations</p>
                  <p className="mt-2 text-3xl font-bold">{totalDestinations}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">Distinct cities or sites visited by staff.</p>
            </CardContent>
          </Card>
          <Card className="lg:col-span-1">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Calendar className="h-6 w-5" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Ongoing</p>
                  <p className="mt-2 text-3xl font-bold">{activeCount}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">Assignments currently in progress.</p>
            </CardContent>
          </Card>
          <Card className="lg:col-span-1">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><CheckCircle2 className="h-6 w-5" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Completed</p>
                  <p className="mt-2 text-3xl font-bold">{completedCount}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">Assignments finished in your current scope.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr_0.9fr] mb-6">
          {/* Left: Destinations (bigger) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Top Destinations</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {destinationData.length === 0 ? (
                <div className="py-8 text-center text-slate-500">No destinations available.</div>
              ) : (
                <div className="space-y-3">
                  {destinationData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between gap-3">
                      <div className="min-w-[140px] text-sm font-medium text-slate-700">{item.destination}</div>
                      <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden mx-4">
                        <div className="h-3 rounded-full bg-violet-600" style={{ width: `${Math.min(100, (item.count / (destinationData[0]?.count || 1)) * 100)}%` }} />
                      </div>
                      <div className="w-12 text-right text-sm font-semibold text-slate-700">{item.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {totalDestinations > destinationData.length && (
              <div className="border-t border-slate-200 px-4 py-3 text-right text-sm text-slate-500">
                View All {totalDestinations} destinations
              </div>
            )}
          </Card>

          {/* Middle: Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Outstation Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {statusData.length === 0 ? (
                <div className="py-5 text-center text-slate-500">No data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="status" innerRadius={52} outerRadius={80} paddingAngle={2}>
                      {statusData.map(entry => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || STATUS_COLORS.Unknown} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number, name: string) => [`${value}`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                {statusData.map(item => (
                  <div key={item.status} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] || STATUS_COLORS.Unknown }} />
                    <span>{item.status}</span>
                    <strong className="ml-auto">{item.value}</strong>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Right: Quick summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid gap-3">
              <div className="rounded-md bg-slate-100 dark:bg-slate-800/50 p-3 text-sm">
                <div className="text-slate-500 dark:text-slate-400">Departures today</div>
                <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{stats.todayDepartures || 0}</div>
              </div>
              <div className="rounded-md bg-slate-100 dark:bg-slate-800/50 p-3 text-sm">
                <div className="text-slate-500 dark:text-slate-400">Returns today</div>
                <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{stats.todayReturns || 0}</div>
              </div>
              <div className="rounded-md bg-slate-100 dark:bg-slate-800/50 p-3 text-sm">
                <div className="text-slate-500 dark:text-slate-400">Upcoming assignments</div>
                <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{upcomingCount}</div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Map */}
        </div>

        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent Outstation</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 flex items-center justify-center"><Loader2 className="animate-spin w-6 h-6 text-purple-700" /></div>
              ) : recentAssignments.length === 0 ? (
                <div className="p-6 text-center text-slate-500">No recent outstations found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-500 text-xs uppercase tracking-[0.16em]">
                      <tr>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Destination</th>
                        <th className="px-4 py-3">Purpose</th>
                        <th className="px-4 py-3">Period</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recentAssignments.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="px-4 py-4 text-sm font-semibold">{item.full_name || item.user_id}</td>
                          <td className="px-4 py-4 text-sm">{item.destination || "-"}</td>
                          <td className="px-4 py-4 text-sm">{item.purpose || item.project || "-"}</td>
                          <td className="px-4 py-4 text-sm">{formatShortDate(item.start_date)} - {formatShortDate(item.end_date)}</td>
                          <td className="px-4 py-4 text-sm">{statusBadge(item.status || "Unknown")}</td>
                          <td className="px-4 py-4 text-sm">{item.total_days ? `${item.total_days} days` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Upcoming Outstation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingGroups.length === 0 ? (
                <div className="py-12 text-center text-slate-500">No upcoming assignments.</div>
              ) : upcomingGroups.map((group, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{group.destination || "Unknown"}</p>
                      <p className="text-xs text-slate-500">{group.purpose}</p>
                    </div>
                    <span className="text-3xl font-bold text-slate-900">{group.count}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Starting {formatShortDate(group.start_date)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}

