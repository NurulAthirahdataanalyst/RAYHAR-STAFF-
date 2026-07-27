import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config/api";
import { Loader2, RefreshCw, MapPin, Users, Briefcase, Calendar, CheckCircle2, Clock, Filter } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, Legend
} from "recharts";

import PageActions from "@/components/layout/PageActions";

const ALLOWED_ROLES = ["hr_admin", "managing_director", "finance_manager", "branch_leader", "head_of_department"];
const STATUS_COLORS: Record<string, string> = {
  Active: "#16a34a",
  Upcoming: "#f97316",
  Completed: "#2563eb",
  Cancelled: "#dc2626",
  Unknown: "#6b7280"
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

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
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Role authorization check
  useEffect(() => {
    if (role && !ALLOWED_ROLES.includes(role)) {
      navigate("/");
    }
  }, [role, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
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

  // Monthly Outstation Tracker data
  const monthlyTrackerData = useMemo(() => {
    const monthsData = MONTH_SHORT.map((name, index) => ({
      name,
      monthIndex: index,
      totalEvents: 0,
      completedEvents: 0,
    }));

    assignments.forEach(a => {
      if (!a.start_date) return;
      const startDate = new Date(a.start_date);
      const m = startDate.getMonth();
      if (m >= 0 && m < 12) {
        monthsData[m].totalEvents += 1;
        if (a.status === "Completed") {
          monthsData[m].completedEvents += 1;
        }
      }
    });

    return monthsData;
  }, [assignments]);

  // Summary Metrics above the chart for the selected month
  const trackerSummary = useMemo(() => {
    if (selectedMonth === "all") {
      const total = monthlyTrackerData.reduce((sum, item) => sum + item.totalEvents, 0);
      const completed = monthlyTrackerData.reduce((sum, item) => sum + item.completedEvents, 0);
      return { total, completed };
    }
    const mIdx = parseInt(selectedMonth, 10);
    const mData = monthlyTrackerData[mIdx] || { totalEvents: 0, completedEvents: 0 };
    return { total: mData.totalEvents, completed: mData.completedEvents };
  }, [monthlyTrackerData, selectedMonth]);

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

      {/* TOP KPI CARDS - No changes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {/* 1. Total Outstation */}
        <Card className="rounded-[20px] border border-purple-200 dark:border-purple-900/60 shadow-[0_6px_16px_-2px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_16px_-2px_rgba(0,0,0,0.4)] bg-purple-50/60 dark:bg-purple-950/30 group relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform duration-500 ease-out group-hover:scale-115 group-hover:rotate-6 group-hover:-translate-y-1.5 pointer-events-none">
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
        <Card className="rounded-[20px] border border-emerald-200 dark:border-emerald-900/60 shadow-[0_6px_16px_-2px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_16px_-2px_rgba(0,0,0,0.4)] bg-emerald-50/60 dark:bg-emerald-950/30 group relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform duration-500 ease-out group-hover:scale-115 group-hover:rotate-6 group-hover:-translate-y-1.5 pointer-events-none">
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
        <Card className="rounded-[20px] border border-blue-200 dark:border-blue-900/60 shadow-[0_6px_16px_-2px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_16px_-2px_rgba(0,0,0,0.4)] bg-blue-50/60 dark:bg-blue-950/30 group relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform duration-500 ease-out group-hover:scale-115 group-hover:rotate-6 group-hover:-translate-y-1.5 pointer-events-none">
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
        <Card className="rounded-[20px] border border-orange-200 dark:border-orange-900/60 shadow-[0_6px_16px_-2px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_16px_-2px_rgba(0,0,0,0.4)] bg-orange-50/60 dark:bg-orange-950/30 group relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform duration-500 ease-out group-hover:scale-115 group-hover:rotate-6 group-hover:-translate-y-1.5 pointer-events-none">
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
        <Card className="rounded-[20px] border border-purple-200 dark:border-purple-900/60 shadow-[0_6px_16px_-2px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_16px_-2px_rgba(0,0,0,0.4)] bg-purple-50/60 dark:bg-purple-950/30 group relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform duration-500 ease-out group-hover:scale-115 group-hover:rotate-6 group-hover:-translate-y-1.5 pointer-events-none">
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

      {/* INSIGHTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* Left Column: Monthly Outstation Tracker */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-[16px] bg-white dark:bg-card flex flex-col h-full">
            <CardHeader className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-row flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">Monthly Outstation Tracker</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track total outstation events and completions by month</p>
              </div>

              {/* Month Filter Selector */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-9 px-3 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7B0099] cursor-pointer shadow-xs"
                >
                  <option value="all">All Months (Jan - Dec)</option>
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx.toString()}>{name}</option>
                  ))}
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-6 flex-1 flex flex-col justify-between">
              {/* Summary Metrics Above Chart */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">Total Events</p>
                    <p className="text-2xl font-black text-purple-950 dark:text-purple-100 mt-1">{trackerSummary.total}</p>
                    <p className="text-[10px] text-purple-600/80 dark:text-purple-400 mt-0.5">
                      {selectedMonth === "all" ? "Across entire year" : `For ${MONTH_NAMES[parseInt(selectedMonth, 10)]}`}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-[#7B0099] dark:text-purple-300 shadow-xs">
                    <Briefcase className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Total Completed Events</p>
                    <p className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">{trackerSummary.completed}</p>
                    <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400 mt-0.5">
                      {selectedMonth === "all" ? "Across entire year" : `For ${MONTH_NAMES[parseInt(selectedMonth, 10)]}`}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-300 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrackerData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      cursor={{ fill: 'rgba(123, 0, 153, 0.05)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Bar dataKey="totalEvents" name="Total Events" fill="#7B0099" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="completedEvents" name="Total Completed Events" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Side Grid without fixed height or width constraints */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Outstation Status Card */}
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-[16px] bg-white dark:bg-card">
            <CardHeader className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Outstation Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {statusData.length === 0 ? (
                <div className="py-5 text-center text-slate-500 text-xs">No status data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="status" innerRadius={48} outerRadius={72} paddingAngle={2}>
                      {statusData.map(entry => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || STATUS_COLORS.Unknown} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number, name: string) => [`${value}`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
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

          {/* Top Destinations Card */}
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-[16px] bg-white dark:bg-card">
            <CardHeader className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Top Destinations</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {destinationData.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-xs">No destinations available.</div>
              ) : (
                destinationData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between gap-3 text-xs">
                    <div className="w-28 font-medium text-slate-700 dark:text-slate-300 truncate">{item.destination}</div>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="h-2.5 rounded-full bg-[#7B0099]" style={{ width: `${Math.min(100, (item.count / (destinationData[0]?.count || 1)) * 100)}%` }} />
                    </div>
                    <div className="w-8 text-right font-bold text-slate-700 dark:text-slate-300">{item.count}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Summary Card */}
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-[16px] bg-white dark:bg-card">
            <CardHeader className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Quick Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid gap-3">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-xs flex justify-between items-center">
                <div className="text-slate-500 dark:text-slate-400 font-medium">Departures today</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats.todayDepartures || 0}</div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-xs flex justify-between items-center">
                <div className="text-slate-500 dark:text-slate-400 font-medium">Returns today</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats.todayReturns || 0}</div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-xs flex justify-between items-center">
                <div className="text-slate-500 dark:text-slate-400 font-medium">Upcoming assignments</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{upcomingCount}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* BOTTOM TABLES SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Outstation */}
        <div className="lg:col-span-8">
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-[16px] bg-white dark:bg-card">
            <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Outstation</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 flex items-center justify-center"><Loader2 className="animate-spin w-6 h-6 text-[#7B0099]" /></div>
              ) : recentAssignments.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">No recent outstations found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Destination</th>
                        <th className="px-4 py-3">Purpose</th>
                        <th className="px-4 py-3">Period</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {recentAssignments.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{item.full_name || item.user_id}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.destination || "-"}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.purpose || item.project || "-"}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatShortDate(item.start_date)} - {formatShortDate(item.end_date)}</td>
                          <td className="px-4 py-3">{statusBadge(item.status || "Unknown")}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{item.total_days ? `${item.total_days} days` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Outstation */}
        <div className="lg:col-span-4">
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-[16px] bg-white dark:bg-card">
            <CardHeader className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Upcoming Outstation</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {upcomingGroups.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">No upcoming assignments.</div>
              ) : upcomingGroups.map((group, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{group.destination || "Unknown"}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{group.purpose}</p>
                    </div>
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-200">{group.count}</span>
                  </div>
                  <p className="mt-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Starting {formatShortDate(group.start_date)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
