import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config/api";
import {
  Loader2, RefreshCw, MapPin, Users, Briefcase, Calendar, CheckCircle2, Clock, Filter,
  Check, X, Hourglass, ChevronRight, TrendingUp, ArrowUpRight
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, Legend
} from "recharts";

import { TablePagination } from "@/components/common/TablePagination";
import { MonthPicker } from "@/components/shared/MonthPicker";
import PageActions from "@/components/layout/PageActions";

const ALLOWED_ROLES = ["hr_admin", "managing_director", "operation_manager", "finance_manager", "branch_leader", "head_of_department"];
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
  return new Date(dStr).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [recentPage, setRecentPage] = useState(1);
  const [recentLimit, setRecentLimit] = useState(10);
  const [destinationLimit, setDestinationLimit] = useState(5);

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

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      if (!a.start_date) return false;
      if (!a.start_date.startsWith(selectedYear)) return false;
        if (selectedMonth !== "all") {
          const m = (parseInt(selectedMonth, 10) + 1).toString().padStart(2, '0');
          if (!a.start_date.startsWith(`${selectedYear}-${m}`)) return false;
        }
      return true;
    });
  }, [assignments, selectedYear, selectedMonth]);

  // Group individual employee assignments into distinct Outstation Events
  const eventGroups = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const groups: Record<string, {
      key: string;
      destination: string;
      project: string;
      purpose: string;
      start_date: string;
      end_date: string;
      status: string;
      assignments: any[];
    }> = {};

    filteredAssignments.forEach(a => {
      const projectOrPurpose = (a.project && a.project !== '-') ? a.project : (a.purpose && a.purpose !== '-') ? a.purpose : 'General';
      const startDateStr = a.start_date ? a.start_date.slice(0, 10) : today;
      const endDateStr = a.end_date ? a.end_date.slice(0, 10) : today;
      
      const key = `${a.destination}_${startDateStr}_${endDateStr}_${projectOrPurpose}`;
      
      if (!groups[key]) {
        let eventStatus = a.status || "Upcoming";
        if (endDateStr < today && eventStatus !== "Cancelled") {
          eventStatus = "Completed";
        }

        groups[key] = {
          key,
          destination: a.destination,
          project: a.project,
          purpose: a.purpose,
          start_date: a.start_date,
          end_date: a.end_date,
          status: eventStatus,
          assignments: []
        };
      }
      groups[key].assignments.push(a);
    });

    return Object.values(groups);
  }, [filteredAssignments]);

  const totalEventsCount = eventGroups.length > 0 ? eventGroups.length : filteredAssignments.length;
  const activeStaffCount = useMemo(() => new Set(filteredAssignments.filter(a => a.status === "Active").map(a => a.user_id)).size, [filteredAssignments]);
  const totalDestinations = useMemo(() => new Set(filteredAssignments.map(a => a.destination || "Unknown")).size, [filteredAssignments]);
  const activeCount = eventGroups.filter(e => e.status === "Active").length;
  const completedCount = eventGroups.filter(e => e.status === "Completed").length;
  const upcomingCount = eventGroups.filter(e => e.status === "Upcoming").length;

  // Monthly Outstation Tracker data (grouped by Unique Events)
  const monthlyTrackerData = useMemo(() => {
    const monthsData = MONTH_SHORT.map((name, index) => ({
      name,
      monthIndex: index,
      totalEvents: 0,
      completedEvents: 0,
    }));

    eventGroups.forEach(e => {
      if (!e.start_date) return;
      const startDate = new Date(e.start_date);
      const m = startDate.getMonth();
      if (m >= 0 && m < 12) {
        monthsData[m].totalEvents += 1;
        if (e.status === "Completed") {
          monthsData[m].completedEvents += 1;
        }
      }
    });

    return monthsData;
  }, [eventGroups]);

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
    filteredAssignments.forEach(a => {
      const destination = a.destination || "Unknown";
      counts[destination] = (counts[destination] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([destination, count]) => ({ destination, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredAssignments]);

  // Detailed Outstation Status Summary for Redesigned Card
  const statusSummary = useMemo(() => {
    let completed = 0;
    let ongoing = 0;
    let pending = 0;
    let cancelled = 0;

    const items = eventGroups.length > 0 ? eventGroups : filteredAssignments;

    items.forEach((item: any) => {
      const st = (item.status || "").toLowerCase();
      if (st === "completed") {
        completed += 1;
      } else if (st === "active" || st === "ongoing") {
        ongoing += 1;
      } else if (st === "upcoming" || st === "pending") {
        pending += 1;
      } else if (st === "cancelled" || st === "canceled") {
        cancelled += 1;
      } else {
        completed += 1;
      }
    });

    const total = completed + ongoing + pending + cancelled;
    const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const ongoingPct = total > 0 ? Math.round((ongoing / total) * 100) : 0;
    const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;
    const cancelledPct = total > 0 ? Math.round((cancelled / total) * 100) : 0;

    let totalDays = 0;
    let daysCount = 0;
    filteredAssignments.forEach((a: any) => {
      if (a.total_days && !isNaN(Number(a.total_days)) && Number(a.total_days) > 0) {
        totalDays += Number(a.total_days);
        daysCount += 1;
      } else if (a.start_date && a.end_date) {
        const d1 = new Date(a.start_date).getTime();
        const d2 = new Date(a.end_date).getTime();
        const diff = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
        totalDays += diff;
        daysCount += 1;
      }
    });
    const avgDuration = daysCount > 0 ? (totalDays / daysCount).toFixed(1) : "3.4";
    const onScheduleRate = total > 0 ? Math.round(((completed + ongoing) / total) * 100) : 100;

    return {
      completed,
      ongoing,
      pending,
      cancelled,
      total,
      completedPct,
      ongoingPct,
      pendingPct,
      cancelledPct,
      avgDuration,
      onScheduleRate,
    };
  }, [eventGroups, filteredAssignments]);

  const donutData = useMemo(() => {
    const list = [
      { name: "Completed", value: statusSummary.completed, color: "#2563eb" },
      { name: "Ongoing", value: statusSummary.ongoing, color: "#06b6d4" },
      { name: "Pending", value: statusSummary.pending, color: "#f59e0b" },
      { name: "Cancelled", value: statusSummary.cancelled, color: "#94a3b8" },
    ].filter(item => item.value > 0);

    if (list.length === 0) {
      return [{ name: "No Trips", value: 1, color: "#e2e8f0" }];
    }
    return list;
  }, [statusSummary]);

  const statusDateSubtitle = useMemo(() => {
    if (selectedMonth === "all") {
      return `Jan - Dec ${selectedYear} · ${statusSummary.total} Total Trips`;
    }
    const mName = MONTH_NAMES[parseInt(selectedMonth, 10)] || "";
    return `${mName} ${selectedYear} · ${statusSummary.total} Total Trips`;
  }, [selectedMonth, selectedYear, statusSummary.total]);

  const allRecentAssignments = useMemo(() => filteredAssignments
    .slice()
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()),
  [filteredAssignments]);

  const paginatedRecentAssignments = useMemo(() => {
    const start = (recentPage - 1) * recentLimit;
    return allRecentAssignments.slice(start, start + recentLimit);
  }, [allRecentAssignments, recentPage, recentLimit]);

  const upcomingGroups = useMemo(() => {
    const groups: Record<string, { destination: string; purpose: string; start_date: string; count: number }> = {};
    filteredAssignments.filter(a => a.status === "Upcoming").forEach(a => {
      const key = `${a.destination}_${a.purpose}_${a.start_date}`;
      if (!groups[key]) groups[key] = { destination: a.destination, purpose: a.purpose || a.project || "General", start_date: a.start_date, count: 0 };
      groups[key].count += 1;
    });
    return Object.values(groups).slice(0, 4);
  }, [filteredAssignments]);


  const handleMonthYearChange = (val: string) => {
    if (val.endsWith("-all")) {
      setSelectedYear(val.split("-")[0]);
      setSelectedMonth("all");
    } else {
      const [y, m] = val.split("-");
      setSelectedYear(y);
      setSelectedMonth((parseInt(m, 10) - 1).toString());
    }
  };
  
  const monthYearVal = selectedMonth === "all" ? `${selectedYear}-all` : `${selectedYear}-${(parseInt(selectedMonth, 10) + 1).toString().padStart(2, '0')}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      <PageActions>
        <div className="flex items-center gap-3">
          <MonthPicker
            monthYear={monthYearVal}
            onSelectMonthYear={handleMonthYearChange}
            className="h-10"
          />
          <Button onClick={() => void fetchData()} className="h-10 px-5 w-full sm:w-auto">
            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
          </Button>
        </div>
      </PageActions>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {/* 1. Total Outstation */}
        <Card className="rounded-[20px] border border-purple-200 dark:border-purple-900/60 shadow-[0_6px_16px_-2px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_16px_-2px_rgba(0,0,0,0.4)] bg-purple-50/60 dark:bg-purple-950/30 group relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform duration-500 ease-out group-hover:scale-115 group-hover:rotate-6 group-hover:-translate-y-1.5 pointer-events-none">
            <Briefcase className="w-24 h-24 text-[#942392]" />
          </div>
          <CardContent className="p-4 relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#942392] shadow-xs"></div>
                <span className="text-[11px] font-extrabold text-foreground dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Total Outstation</span>
              </div>
              <div className="my-1">
                <span className="text-3xl font-black text-[#942392] dark:text-purple-300 leading-none">{totalEventsCount}</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-purple-200/80 dark:border-purple-800/60">
              <p className="text-[10px] font-semibold text-foreground dark:text-foreground">
                Total outstation events created
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
                <span className="text-[11px] font-extrabold text-foreground dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Staff on Outstation</span>
              </div>
              <div className="my-1">
                <span className="text-3xl font-black text-emerald-700 dark:text-emerald-300 leading-none">{activeStaffCount}</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-emerald-200/80 dark:border-emerald-800/60">
              <p className="text-[10px] font-semibold text-foreground dark:text-foreground">
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
                <span className="text-[11px] font-extrabold text-foreground dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Destinations</span>
              </div>
              <div className="my-1">
                <span className="text-3xl font-black text-blue-700 dark:text-blue-300 leading-none">{totalDestinations}</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-blue-200/80 dark:border-blue-800/60">
              <p className="text-[10px] font-semibold text-foreground dark:text-foreground">
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
                <span className="text-[11px] font-extrabold text-foreground dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Ongoing</span>
              </div>
              <div className="my-1">
                <span className="text-3xl font-black text-orange-700 dark:text-orange-300 leading-none">{activeCount}</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-orange-200/80 dark:border-orange-800/60">
              <p className="text-[10px] font-semibold text-foreground dark:text-foreground">
                Events currently in progress
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
                <span className="text-[11px] font-extrabold text-foreground dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Completed</span>
              </div>
              <div className="my-1">
                <span className="text-3xl font-black text-purple-700 dark:text-purple-300 leading-none">{completedCount}</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-purple-200/80 dark:border-purple-800/60">
              <p className="text-[10px] font-semibold text-foreground dark:text-foreground">
                Events finished in scope
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 1: Tracker (8 cols) & Outstation Status Donut (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* Monthly Outstation Tracker */}
        <div className="lg:col-span-7 flex flex-col">
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-[16px] bg-white dark:bg-card h-full flex flex-col justify-between">
            <CardHeader className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-row flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-foreground dark:text-slate-100">Monthly Outstation Tracker</CardTitle>
                <p className="text-xs text-foreground dark:text-foreground mt-0.5">Track total outstation events and completions by month</p>
              </div>

              {/* Month Filter Selector */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-foreground" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-9 px-3 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-foreground dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#942392] cursor-pointer shadow-xs"
                >
                  <option value="all">All Months (Jan - Dec)</option>
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx.toString()}>{name}</option>
                  ))}
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Summary Metrics Above Chart */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">Total Events</p>
                    <p className="text-2xl font-black text-purple-950 dark:text-purple-100 mt-1">{trackerSummary.total}</p>
                    <p className="text-[10px] text-purple-600/80 dark:text-purple-400 mt-0.5">
                      {selectedMonth === "all" ? `Across ${selectedYear}` : `For ${MONTH_NAMES[parseInt(selectedMonth, 10)]}`}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-[#942392] dark:text-purple-300 shadow-xs">
                    <Briefcase className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Total Completed Events</p>
                    <p className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">{trackerSummary.completed}</p>
                    <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400 mt-0.5">
                      {selectedMonth === "all" ? `Across ${selectedYear}` : `For ${MONTH_NAMES[parseInt(selectedMonth, 10)]}`}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-300 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Compact Bar Chart */}
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrackerData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      cursor={{ fill: 'rgba(123, 0, 153, 0.05)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Bar dataKey="totalEvents" name="Total Events" fill="#942392" radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar dataKey="completedEvents" name="Total Completed Events" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outstation Status Card (Redesigned from Mockup) */}
        <div className="lg:col-span-5 flex flex-col">
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-[20px] bg-white dark:bg-card h-full flex flex-col justify-between p-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
                  <MapPin className="w-5 h-5 fill-blue-600/20" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">Outstation Status</h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-foreground dark:text-foreground mt-0.5">
                    Monitor the current status of all outstation assignments
                  </p>
                </div>
              </div>

              {/* Filter Button (Opens native month selector) */}
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  aria-label="Filter Outstation Status by month"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                >
                  <option value="all">All Months (Jan - Dec)</option>
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx.toString()}>{name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="w-9 h-9 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
                  title="Filter by Month"
                >
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Donut Chart with Center Total & Badge */}
            <div className="relative w-full flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height={205}>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={donutData.length > 1 ? 4 : 0}
                    stroke="none"
                  >
                    {donutData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  {statusSummary.total > 0 && (
                    <RechartsTooltip
                      formatter={(value: number, name: string) => [
                        `${value} Trip${value > 1 ? "s" : ""} (${Math.round((value / statusSummary.total) * 100)}%)`,
                        name
                      ]}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '12px'
                      }}
                    />
                  )}
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  {statusSummary.total}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                  TOTAL TRIPS
                </span>
                <span className="mt-1.5 inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  {statusSummary.completedPct}%
                </span>
              </div>
            </div>

            {/* 2x2 Grid of 4 Status Cards */}
            <div className="grid grid-cols-2 gap-3 w-full my-2">
              {/* Completed */}
              <div className="bg-[#eff6ff] dark:bg-blue-950/30 border border-blue-100/90 dark:border-blue-900/40 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-2xs shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Completed</span>
                  </div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{statusSummary.completedPct}%</span>
                </div>
                <div className="flex items-end justify-between mt-2.5">
                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">{statusSummary.completed}</div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">trips</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 mb-0.5" />
                </div>
              </div>

              {/* Ongoing */}
              <div className="bg-[#ecfeff] dark:bg-cyan-950/30 border border-cyan-100/90 dark:border-cyan-900/40 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-white shadow-2xs shrink-0">
                      <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Ongoing</span>
                  </div>
                  <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">{statusSummary.ongoingPct}%</span>
                </div>
                <div className="flex items-end justify-between mt-2.5">
                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">{statusSummary.ongoing}</div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">active</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 mb-0.5" />
                </div>
              </div>

              {/* Pending */}
              <div className="bg-[#fffbeb] dark:bg-amber-950/30 border border-amber-100/90 dark:border-amber-900/40 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-2xs shrink-0">
                      <Hourglass className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Pending</span>
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{statusSummary.pendingPct}%</span>
                </div>
                <div className="flex items-end justify-between mt-2.5">
                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">{statusSummary.pending}</div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">in review</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 mb-0.5" />
                </div>
              </div>

              {/* Cancelled */}
              <div className="bg-[#f8fafc] dark:bg-slate-900/40 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-400 flex items-center justify-center text-white shadow-2xs shrink-0">
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Cancelled</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{statusSummary.cancelledPct}%</span>
                </div>
                <div className="flex items-end justify-between mt-2.5">
                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">{statusSummary.cancelled}</div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">closed</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 mb-0.5" />
                </div>
              </div>
            </div>

            {/* Bottom Banner: On-schedule rate & Avg duration */}
            <div className="bg-[#f0f7ff]/70 dark:bg-blue-950/20 border border-blue-100/90 dark:border-blue-900/30 rounded-2xl p-3 flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-2xs shrink-0">
                  <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-xs text-slate-800 dark:text-slate-200 leading-tight">
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{statusSummary.onScheduleRate}%</strong>{" "}
                    <span className="text-slate-600 dark:text-slate-400 font-medium">on-schedule rate</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                    Avg duration: {statusSummary.avgDuration} days
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/outstation/assignment")}
                className="px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center gap-1 shadow-2xs transition-colors shrink-0"
              >
                View Details
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        </div>

      </div>

      {/* ROW 2: Top Destinations (6 cols) & Quick Summary (6 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Top Destinations */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-[16px] bg-white dark:bg-card flex flex-col h-full">
          <CardHeader className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground dark:text-slate-100">Top Destinations</CardTitle>
              <p className="text-xs text-foreground dark:text-foreground mt-0.5">View the most visited outstation destinations by staff</p>
            </div>
            <select
              value={destinationLimit}
              onChange={e => setDestinationLimit(Number(e.target.value))}
              className="h-8 px-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-foreground dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#942392] cursor-pointer shadow-xs"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col justify-between">
            {destinationData.length === 0 ? (
              <div className="py-4 text-center text-foreground text-xs">No destinations available.</div>
            ) : (
              <>
                <div className="space-y-3">
                  {destinationData.slice(0, destinationLimit).map((item, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 text-xs">
                      <div className="w-32 font-medium text-foreground dark:text-slate-300 truncate">{item.destination}</div>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className="h-2.5 rounded-full bg-[#942392]" style={{ width: `${Math.min(100, (item.count / (destinationData[0]?.count || 1)) * 100)}%` }} />
                      </div>
                      <div className="w-16 text-right font-bold text-foreground dark:text-slate-300">{item.count} Staff</div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-yellow-600 dark:text-yellow-500 font-bold uppercase tracking-wider">
                    TOTAL DESTINATION - {destinationData.length}
                  </div>
                  <Button variant="link" className="text-[11px] h-auto p-0 text-[#942392] dark:text-purple-400 font-bold hover:no-underline" onClick={() => navigate(`/outstation/assignment?month=${selectedMonth}&year=${selectedYear}`)}>
                    VIEW ALL OUTSTATION
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Summary */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-[16px] bg-white dark:bg-card flex flex-col h-full">
          <CardHeader className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold text-foreground dark:text-slate-100">Quick Summary</CardTitle>
            <p className="text-xs text-foreground dark:text-foreground mt-0.5">Get a quick overview of today’s and upcoming outstation activity</p>
          </CardHeader>
          <CardContent className="p-4 grid gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-xs flex justify-between items-center">
              <div className="text-foreground dark:text-foreground font-medium">Departures today</div>
              <div className="text-lg font-bold text-foreground dark:text-slate-100">{stats.todayDepartures || 0}</div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-xs flex justify-between items-center">
              <div className="text-foreground dark:text-foreground font-medium">Returns today</div>
              <div className="text-lg font-bold text-foreground dark:text-slate-100">{stats.todayReturns || 0}</div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-xs flex justify-between items-center">
              <div className="text-foreground dark:text-foreground font-medium">Upcoming assignments</div>
              <div className="text-lg font-bold text-foreground dark:text-slate-100">{upcomingCount}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: Recent Outstation (8 cols) & Upcoming Outstation (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Outstation */}
        <div className="lg:col-span-8">
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-[16px] bg-white dark:bg-card">
            <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-foreground dark:text-slate-100">Recent Outstation</CardTitle>
              <p className="text-xs text-foreground dark:text-foreground mt-0.5">View the latest outstation assignments and their status</p>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 flex items-center justify-center"><Loader2 className="animate-spin w-6 h-6 text-[#942392]" /></div>
              ) : allRecentAssignments.length === 0 ? (
                <div className="p-6 text-center text-foreground text-xs">No recent outstations found.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-foreground dark:text-foreground text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Employee</th>
                          <th className="px-4 py-3 text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Destination</th>
                          <th className="px-4 py-3 text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Purpose</th>
                          <th className="px-4 py-3 text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Period</th>
                          <th className="px-4 py-3 text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Status</th>
                          <th className="px-4 py-3 text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {paginatedRecentAssignments.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-foreground dark:text-slate-100">{item.full_name || item.user_id}</td>
                            <td className="px-4 py-3 text-foreground dark:text-slate-300">{item.destination || "-"}</td>
                            <td className="px-4 py-3 text-foreground dark:text-slate-300">{item.purpose || item.project || "-"}</td>
                            <td className="px-4 py-3 text-foreground dark:text-foreground">{formatShortDate(item.start_date)} - {formatShortDate(item.end_date)}</td>
                            <td className="px-4 py-3">{statusBadge(item.status || "Unknown")}</td>
                            <td className="px-4 py-3 text-foreground dark:text-foreground">{item.total_days ? `${item.total_days} days` : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <TablePagination
                    currentPage={recentPage}
                    totalItems={allRecentAssignments.length}
                    pageSize={recentLimit}
                    onPageChange={setRecentPage}
                    onPageSizeChange={setRecentLimit}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Outstation */}
        <div className="lg:col-span-4">
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-[16px] bg-white dark:bg-card">
            <CardHeader className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-foreground dark:text-slate-100">Upcoming Outstation</CardTitle>
              <p className="text-xs text-foreground dark:text-foreground mt-0.5">Monitor upcoming outstation assignments and scheduled trips</p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {upcomingGroups.length === 0 ? (
                <div className="py-8 text-center text-foreground text-xs">No upcoming assignments.</div>
              ) : upcomingGroups.map((group, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-foreground dark:text-slate-100">{group.destination || "Unknown"}</p>
                      <p className="text-[11px] text-foreground dark:text-foreground mt-0.5">{group.purpose}</p>
                    </div>
                    <span className="text-2xl font-black text-foreground dark:text-slate-200">{group.count}</span>
                  </div>
                  <p className="mt-2 text-[10px] font-semibold text-foreground uppercase tracking-wider">Starting {formatShortDate(group.start_date)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}


