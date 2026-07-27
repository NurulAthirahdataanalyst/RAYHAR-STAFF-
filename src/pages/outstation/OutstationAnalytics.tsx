import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config/api";
import { Loader2, RefreshCw, MapPin, Users, Briefcase, Calendar, CheckCircle2, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

import PageActions from "@/components/layout/PageActions";

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
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      <PageActions>
        <Button onClick={() => void fetchData()} className="h-11 px-5 w-full sm:w-auto">
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
        </Button>
      </PageActions>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {/* 1. Total Outstation */}
          <Card className="rounded-[20px] border border-purple-200 dark:border-purple-900/60 shadow-sm bg-purple-50/60 dark:bg-purple-950/30 group transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform group-hover:scale-110 group-hover:rotate-6 duration-500 pointer-events-none">
              <Briefcase className="w-24 h-24 text-[#7B0099]" />
            </div>
            <CardContent className="p-4 relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#7B0099] shadow-xs"></div>
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Total Outstation</span>
                </div>
                <div className="my-1">
                  <span className="text-3xl font-black text-[#7B0099] dark:text-purple-300 leading-none">{totalAssignments}</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-purple-200/80 dark:border-purple-800/60">
                <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  Active outstation requests across all branches
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 2. Staff on Outstation */}
          <Card className="rounded-[20px] border border-emerald-200 dark:border-emerald-900/60 shadow-sm bg-emerald-50/60 dark:bg-emerald-950/30 group transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform group-hover:scale-110 group-hover:rotate-6 duration-500 pointer-events-none">
              <Users className="w-24 h-24 text-emerald-600" />
            </div>
            <CardContent className="p-4 relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs"></div>
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Staff on Outstation</span>
                </div>
                <div className="my-1">
                  <span className="text-3xl font-black text-emerald-700 dark:text-emerald-300 leading-none">{activeStaffCount}</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-emerald-200/80 dark:border-emerald-800/60">
                <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  Unique team members currently away
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Destinations */}
          <Card className="rounded-[20px] border border-blue-200 dark:border-blue-900/60 shadow-sm bg-blue-50/60 dark:bg-blue-950/30 group transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform group-hover:scale-110 group-hover:rotate-6 duration-500 pointer-events-none">
              <MapPin className="w-24 h-24 text-blue-600" />
            </div>
            <CardContent className="p-4 relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs"></div>
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Destinations</span>
                </div>
                <div className="my-1">
                  <span className="text-3xl font-black text-blue-700 dark:text-blue-300 leading-none">{totalDestinations}</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-blue-200/80 dark:border-blue-800/60">
                <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  Distinct cities or sites visited
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 4. Ongoing */}
          <Card className="rounded-[20px] border border-orange-200 dark:border-orange-900/60 shadow-sm bg-orange-50/60 dark:bg-orange-950/30 group transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform group-hover:scale-110 group-hover:rotate-6 duration-500 pointer-events-none">
              <Clock className="w-24 h-24 text-orange-600" />
            </div>
            <CardContent className="p-4 relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-xs"></div>
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Ongoing</span>
                </div>
                <div className="my-1">
                  <span className="text-3xl font-black text-orange-700 dark:text-orange-300 leading-none">{activeCount}</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-orange-200/80 dark:border-orange-800/60">
                <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  Assignments currently in progress
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 5. Completed */}
          <Card className="rounded-[20px] border border-purple-200 dark:border-purple-900/60 shadow-sm bg-purple-50/60 dark:bg-purple-950/30 group transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform group-hover:scale-110 group-hover:rotate-6 duration-500 pointer-events-none">
              <CheckCircle2 className="w-24 h-24 text-purple-600" />
            </div>
            <CardContent className="p-4 relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-xs"></div>
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Completed</span>
                </div>
                <div className="my-1">
                  <span className="text-3xl font-black text-purple-700 dark:text-purple-300 leading-none">{completedCount}</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-purple-200/80 dark:border-purple-800/60">
                <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  Assignments finished in scope
                </p>
              </div>
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
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
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
                    <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-[0.16em] border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Destination</th>
                        <th className="px-4 py-3">Purpose</th>
                        <th className="px-4 py-3">Period</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {recentAssignments.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-slate-800 dark:text-slate-200">
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

          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Upcoming Outstation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingGroups.length === 0 ? (
                <div className="py-12 text-center text-slate-500">No upcoming assignments.</div>
              ) : upcomingGroups.map((group, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/80 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{group.destination || "Unknown"}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{group.purpose}</p>
                    </div>
                    <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{group.count}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Starting {formatShortDate(group.start_date)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}

