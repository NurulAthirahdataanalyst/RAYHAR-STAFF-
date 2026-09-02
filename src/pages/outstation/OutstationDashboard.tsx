import { useState, useEffect, useMemo, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Loader2, Plane, TrendingUp, RefreshCw, Clock, 
  MapPin, CheckCircle2, Search, Filter, MoreHorizontal, 
  AlertCircle, ChevronRight, ChevronLeft, Activity, Map, ArrowRight,
  User, CheckCircle, Calendar, Zap, Briefcase, Users, RotateCcw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, LineChart, Line, YAxis
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import PageHeader from "@/components/layout/PageHeader";
import PageActions from "@/components/layout/PageActions";
import { API_BASE_URL } from "../../config/api";

const OUTSTATION_ROLES = ["hr_admin", "managing_director", "operation_manager", "finance_manager", "branch_leader", "head_of_department"];

// Semantic Colors
const C_PURPLE =  "#942392]"; // Brand
const C_BLUE = "#2563eb";   // Info
const C_GREEN = "#16a34a";  // Completed
const C_ORANGE = "#ea580c"; // Upcoming
const C_RED = "#dc2626";    // Cancelled/Overdue
const C_GRAY = "#64748b";   // Inactive

function formatShortDate(dStr: string) {
  if (!dStr) return "-";
  return new Date(dStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
}

function calcProgress(start: string, end: string) {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = new Date().getTime();
  if (now < s) return 0;
  if (now > e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
}

function getStatusBadge(status: string) {
  switch (status) {
    case "Active":    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] font-bold shadow-none border-0 px-2 py-0.5">🟢 Active</Badge>;
    case "Upcoming":  return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-[10px] font-bold shadow-none border-0 px-2 py-0.5">🟡 Upcoming</Badge>;
    case "Completed": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] font-bold shadow-none border-0 px-2 py-0.5">🔵 Completed</Badge>;
    case "Cancelled": return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px] font-bold shadow-none border-0 px-2 py-0.5">🔴 Cancelled</Badge>;
    default:          return <Badge variant="outline" className="text-[10px] shadow-none">{status}</Badge>;
  }
}

// Skeleton Component
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export default function OutstationDashboard() {
  const { role, userBranch, userDepartment, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({ active: 0, upcoming: 0, completed: 0, cancelled: 0, todayDepartures: 0, todayReturns: 0 });
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Table state
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!roleLoading && !OUTSTATION_ROLES.includes(role)) navigate("/");
  }, [role, roleLoading, navigate]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const scopeParams = new URLSearchParams({ role, branch: userBranch || "", department: userDepartment || "" });
      const [statsRes, listRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/outstation/stats?${scopeParams}`),
        fetch(`${API_BASE_URL}/api/outstation?${scopeParams}`),
      ]);
      const statsData = await statsRes.json();
      const listData = await listRes.json();
      if (statsData.success && statsData.stats) setStats((prev: any) => ({ ...prev, ...statsData.stats }));
      if (listData.success) setAssignments(listData.assignments || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [role, userBranch, userDepartment]);

  useEffect(() => { 
    void fetchAll(); 

    // Establish real-time EventSource connection
    const streamUrl = `${API_BASE_URL}/api/presence/stream`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        // Refetch on any event to keep outstation status in sync
        void fetchAll();
      } catch (err) {
        void fetchAll();
      }
    };

    eventSource.onerror = (err) => {
      console.error("Presence stream connection error:", err);
    };

    const interval = setInterval(() => {
      void fetchAll();
    }, 5 * 60 * 1000); // 5 min fallback polling

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [fetchAll]);

  const activeNowGrouped = useMemo(() => {
    const active = assignments.filter(a => a.status === "Active");
    const groups: Record<string, {
      destination: string; department: string; project: string; purpose?: string; start_date: string; end_date: string; status: string;
      employees: any[];
    }> = {};

    active.forEach(a => {
      const key = `${a.destination}_${a.start_date}_${a.end_date}_${a.status}`;
      if (!groups[key]) {
        groups[key] = {
          destination: a.destination,
          project: a.project || '',
          department: a.department,
          start_date: a.start_date,
          end_date: a.end_date,
          status: a.status,
          employees: []
        };
      }
      groups[key].employees.push(a);
    });

    return Object.values(groups);
  }, [assignments]);

  const upcomingGrouped = useMemo(() => {
    const upcomingList = assignments.filter(a => a.status === "Upcoming");
    const groups: Record<string, {
      destination: string; department: string; project: string; purpose?: string; start_date: string; end_date: string; status: string;
      employees: any[];
    }> = {};

    upcomingList.forEach(a => {
      const key = `${a.destination}_${a.start_date}_${a.end_date}_${a.status}`;
      if (!groups[key]) {
        groups[key] = {
          destination: a.destination,
          project: a.project || '',
          department: a.department,
          start_date: a.start_date,
          end_date: a.end_date,
          status: a.status,
          employees: []
        };
      }
      groups[key].employees.push(a);
    });

    return Object.values(groups);
  }, [assignments]);

  const activeNow = useMemo(() => assignments.filter(a => a.status === "Active"), [assignments]);
  const upcoming = useMemo(() => assignments.filter(a => a.status === "Upcoming"), [assignments]);
  const returns = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return assignments.filter(a => a.status === "Active" && a.end_date && a.end_date.startsWith(today));
  }, [assignments]);

  const activeCount = Number(stats.active || 0);
  const completedCount = Number(stats.completed || 0);
  const upcomingCount = Number(stats.upcoming || 0);
  const cancelledCount = Number(stats.cancelled || 0);

  const dynamicTrends = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const currentWeekStart = new Date(today);
    const day = currentWeekStart.getDay();
    const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
    currentWeekStart.setDate(diff);

    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    let startedThisWeek = 0;
    let departingToday = 0;
    let thisMonthCount = 0;
    let lastMonthCount = 0;
    let thisMonthCompleted = 0;
    let lastMonthCompleted = 0;
    let thisMonthCancelled = 0;
    let lastMonthCancelled = 0;

    assignments.forEach(a => {
      if (!a.start_date) return;
      const startDate = new Date(a.start_date);
      startDate.setHours(0,0,0,0);
      const m = startDate.getMonth();
      const y = startDate.getFullYear();
      
      if (a.status === 'Active' && startDate >= currentWeekStart && startDate <= today) {
        startedThisWeek++;
      }
      if (a.status === 'Upcoming' && startDate.getTime() === today.getTime()) {
        departingToday++;
      }

      if (y === thisYear && m === thisMonth) {
        thisMonthCount++;
        if (a.status === 'Completed') thisMonthCompleted++;
        if (a.status === 'Cancelled') thisMonthCancelled++;
      } else if (y === lastMonthYear && m === lastMonth) {
        lastMonthCount++;
        if (a.status === 'Completed') lastMonthCompleted++;
        if (a.status === 'Cancelled') lastMonthCancelled++;
      }
    });

    const totalFinished = completedCount + cancelledCount;
    const rate = totalFinished > 0 ? Math.round((completedCount / totalFinished) * 100) : 100;

    let monthDiff = 0;
    if (lastMonthCount > 0) {
      monthDiff = Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
    } else if (thisMonthCount > 0) {
      monthDiff = 100;
    }

    const thisMonthFinished = thisMonthCompleted + thisMonthCancelled;
    const lastMonthFinished = lastMonthCompleted + lastMonthCancelled;
    let rateDiff = 0;
    if (lastMonthFinished > 0) {
      const thisMonthRate = thisMonthFinished > 0 ? (thisMonthCompleted / thisMonthFinished) * 100 : 0;
      const lastMonthRate = lastMonthFinished > 0 ? (lastMonthCompleted / lastMonthFinished) * 100 : 0;
      rateDiff = Math.round(thisMonthRate - lastMonthRate);
    } else {
       rateDiff = thisMonthFinished > 0 ? 100 : 0;
    }

    return {
      active: startedThisWeek > 0 ? `↑ +${startedThisWeek} this week` : `- 0 this week`,
      activeColor: startedThisWeek > 0 ? "text-green-600" : "text-foreground",
      upcoming: departingToday > 0 ? `↑ +${departingToday} today` : `- 0 today`,
      upcomingColor: departingToday > 0 ? "text-orange-600" : "text-foreground",
      total: monthDiff > 0 ? `↑ +${monthDiff}% vs last month` : (monthDiff < 0 ? `↓ ${monthDiff}% vs last month` : `- 0% vs last month`),
      totalColor: monthDiff > 0 ? "text-purple-600" : (monthDiff < 0 ? "text-red-500" : "text-foreground"),
      completionValue: `${rate}%`,
      completionTrend: rateDiff > 0 ? `↑ +${rateDiff}% vs last month` : (rateDiff < 0 ? `↓ ${rateDiff}% vs last month` : `- 0% vs last month`),
      completionColor: rateDiff > 0 ? "text-green-600" : (rateDiff < 0 ? "text-red-500" : "text-foreground")
    };
  }, [assignments, completedCount, cancelledCount]);

  // Derived Analytics Data
  const monthlyTrendData = useMemo(() => [
    { name: "Jan", val: 12 }, { name: "Feb", val: 19 }, { name: "Mar", val: 15 },
    { name: "Apr", val: 22 }, { name: "May", val: 30 }, { name: "Jun", val: 28 },
    { name: "Jul", val: activeCount + completedCount }
  ], [activeCount, completedCount]);

  const statusData = useMemo(() => [
    { name: "Completed", value: completedCount || 45, color: C_BLUE },
    { name: "Active", value: activeCount || 1, color: C_GREEN },
    { name: "Upcoming", value: upcomingCount || 1, color: C_ORANGE },
    { name: "Cancelled", value: cancelledCount || 2, color: C_RED },
  ], [activeCount, completedCount, upcomingCount, cancelledCount]);

  const deptData = useMemo(() => [
    { name: "IT", value: 35 }, { name: "Sales", value: 28 },
    { name: "HR", value: 15 }, { name: "Finance", value: 10 },
  ], []);

  // NEW KPI CALCULATIONS
  const eventGroups = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const groups: Record<string, any> = {};
    assignments.forEach(a => {
      const eventName = (a.project && a.project !== '-') ? a.project : (a.purpose && a.purpose !== '-') ? a.purpose : 'General';
      if (!groups[eventName]) {
        groups[eventName] = {
          eventName,
          destination: a.destination,
          project: a.project || '',
          startDate: a.start_date,
          endDate: a.end_date,
          status: "Upcoming",
          assignments: []
        };
      }
      const g = groups[eventName];
      g.assignments.push(a);
      if (!g.startDate || a.start_date < g.startDate) g.startDate = a.start_date;
      if (!g.endDate || a.end_date > g.endDate) g.endDate = a.end_date;
    });

    return Object.values(groups).map(g => {
      const s = g.startDate?.slice(0, 10) || today;
      const e = g.endDate?.slice(0, 10) || today;
      if (today > e) g.status = "Completed";
      else if (today >= s && today <= e) g.status = "Active";
      else g.status = "Upcoming";
      return g;
    });
  }, [assignments]);

  const totalEventsCount = eventGroups.length > 0 ? eventGroups.length : (assignments.length > 0 ? assignments.length : 0);
  const completedEventsCount = eventGroups.filter(e => e.status === "Completed").length;

  const activeDomestic = activeNow.filter(a => !a.destination.toLowerCase().includes("singapore") && !a.destination.toLowerCase().includes("indonesia") && !a.destination.toLowerCase().includes("overseas")).length;
  const activeInternational = activeCount - activeDomestic;

  const todayStr = new Date().toISOString().slice(0, 10);
  const departingTodayList = assignments.filter(a => a.status === "Upcoming" && a.start_date && a.start_date.startsWith(todayStr));
  const departingTodayCount = departingTodayList.length;
  const departingDomestic = departingTodayList.filter(a => !a.destination.toLowerCase().includes("singapore") && !a.destination.toLowerCase().includes("indonesia") && !a.destination.toLowerCase().includes("overseas")).length;
  const departingInternational = departingTodayCount - departingDomestic;

  const returningTodayCount = returns.length;

  const upcomingNext7Days = assignments.filter(a => {
    if (a.status !== "Upcoming" || !a.start_date) return false;
    const start = new Date(a.start_date).getTime();
    const now = new Date().getTime();
    const diffDays = (start - now) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 7;
  });

  const upcomingGroupedNext7Days = useMemo(() => {
    const groups: Record<string, any[]> = {};
    upcomingNext7Days.forEach(a => {
      const key = `${a.destination}_${a.start_date}_${a.end_date}_${a.status}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    return Object.values(groups);
  }, [upcomingNext7Days]);

  const upcomingAssignmentsCount = upcomingGroupedNext7Days.length;
  const employeesScheduledCount = upcomingNext7Days.length;
  const approvalPendingCount = 8; // mock

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900/50"><Loader2 className="animate-spin w-8 h-8 text-purple-900" /></div>;

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      <div className="py-2">
        <PageActions>
          <Button className="h-10 px-5 text-[14px] font-semibold text-white shadow-sm bg-[#942392] hover:bg-[#3b0764] w-full sm:w-auto" onClick={() => navigate("/outstation/assignment", { state: { openNew: true } })}>
            <Plane className="w-4 h-4 mr-2" /> New Assignment 
          </Button>
        </PageActions>

        {/* ROW 1: Enterprise Analytics-Style KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {/* 1. Total Outstation */}
            <Card className="border border-purple-200 dark:border-purple-900/60 shadow-[0_6px_16px_-2px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_16px_-2px_rgba(0,0,0,0.4)] bg-purple-50/60 dark:bg-purple-950/30 group relative overflow-hidden flex flex-col justify-between rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
              <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform duration-500 ease-out group-hover:scale-115 group-hover:rotate-6 group-hover:-translate-y-1.5 pointer-events-none">
                <Briefcase className="w-24 h-24 text-[#942392]" />
              </div>
              <CardContent className="p-4 relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2.5 h-2.5 shrink-0 rounded-full bg-[#942392] shadow-xs"></div>
                    <span className="text-[11px] font-extrabold text-foreground dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Total Outstation</span>
                  </div>
                  {loading ? (
                    <Skeleton className="h-[36px] w-16 my-2" />
                  ) : (
                    <div className="my-1">
                      <span className="text-3xl font-black text-[#942392] dark:text-purple-300 leading-none">{totalEventsCount}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2.5 border-t border-purple-200/80 dark:border-purple-800/60">
                  <p className="text-[10px] font-semibold text-foreground dark:text-foreground whitespace-nowrap">
                    {completedEventsCount} Completed
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* 2. Active Outstation */}
            <Card className="border border-emerald-200 cursor-pointer group relative overflow-hidden flex flex-col justify-between rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]" onClick={() => navigate('/outstation/my?tab=Active')}>
              <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform duration-500 ease-out group-hover:scale-115 group-hover:rotate-6 group-hover:-translate-y-1.5 pointer-events-none">
                <Plane className="w-24 h-24 text-emerald-600" />
              </div>
              <CardContent className="p-4 relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2.5 h-2.5 shrink-0 rounded-full bg-emerald-500 shadow-xs"></div>
                    <span className="text-[11px] font-extrabold text-foreground dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Active Outstation</span>
                  </div>
                  {loading ? (
                    <Skeleton className="h-[36px] w-16 my-2" />
                  ) : (
                    <div className="my-1">
                      <span className="text-3xl font-black text-emerald-700 dark:text-emerald-300 leading-none">{activeCount}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2.5 border-t border-emerald-200/80 dark:border-emerald-800/60">
                  <p className="text-[10px] font-semibold text-foreground dark:text-foreground whitespace-nowrap">
                    Currently Away
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 3. Departing Today */}
            <Card className="border border-orange-200 cursor-pointer group relative overflow-hidden flex flex-col justify-between rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]" onClick={() => navigate('/outstation/my?tab=Upcoming')}>
              <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform duration-500 ease-out group-hover:scale-115 group-hover:rotate-6 group-hover:-translate-y-1.5 pointer-events-none">
                <Clock className="w-24 h-24 text-orange-600" />
              </div>
              <CardContent className="p-4 relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2.5 h-2.5 shrink-0 rounded-full bg-orange-500 shadow-xs"></div>
                    <span className="text-[11px] font-extrabold text-foreground dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Departing Today</span>
                  </div>
                  {loading ? (
                    <Skeleton className="h-[36px] w-16 my-2" />
                  ) : (
                    <div className="my-1">
                      <span className="text-3xl font-black text-orange-700 dark:text-orange-300 leading-none">{departingTodayCount}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2.5 border-t border-orange-200/80 dark:border-orange-800/60">
                  <p className="text-[10px] font-semibold text-foreground dark:text-foreground whitespace-nowrap">
                    Starts Today
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 4. Returning Today */}
            <Card className="border border-blue-200 dark:border-blue-900/60 shadow-[0_6px_16px_-2px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_16px_-2px_rgba(0,0,0,0.4)] bg-blue-50/60 dark:bg-blue-950/30 group relative overflow-hidden flex flex-col justify-between rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
              <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform duration-500 ease-out group-hover:scale-115 group-hover:rotate-6 group-hover:-translate-y-1.5 pointer-events-none">
                <RotateCcw className="w-24 h-24 text-blue-600" />
              </div>
              <CardContent className="p-4 relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2.5 h-2.5 shrink-0 rounded-full bg-blue-500 shadow-xs"></div>
                    <span className="text-[11px] font-extrabold text-foreground dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Returning Today</span>
                  </div>
                  {loading ? (
                    <Skeleton className="h-[36px] w-16 my-2" />
                  ) : (
                    <div className="my-1">
                      <span className="text-3xl font-black text-blue-700 dark:text-blue-300 leading-none">{returningTodayCount}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2.5 border-t border-blue-200/80 dark:border-blue-800/60">
                  <p className="text-[10px] font-semibold text-foreground dark:text-foreground whitespace-nowrap">
                    Expected Back
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 5. Upcoming Events */}
            <Card className="border border-purple-200 dark:border-purple-900/60 shadow-[0_6px_16px_-2px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_16px_-2px_rgba(0,0,0,0.4)] bg-purple-50/60 dark:bg-purple-950/30 group relative overflow-hidden flex flex-col justify-between rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
              <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform duration-500 ease-out group-hover:scale-115 group-hover:rotate-6 group-hover:-translate-y-1.5 pointer-events-none">
                <Calendar className="w-24 h-24 text-purple-600" />
              </div>
              <CardContent className="p-4 relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2.5 h-2.5 shrink-0 rounded-full bg-purple-500 shadow-xs"></div>
                    <span className="text-[11px] font-extrabold text-foreground dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Upcoming Events</span>
                  </div>
                  {loading ? (
                    <Skeleton className="h-[36px] w-16 my-2" />
                  ) : (
                    <div className="my-1">
                      <span className="text-3xl font-black text-purple-700 dark:text-purple-300 leading-none">{upcomingAssignmentsCount}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2.5 border-t border-purple-200/80 dark:border-purple-800/60">
                  <p className="text-[10px] font-semibold text-foreground dark:text-foreground whitespace-nowrap">
                    Next 7 Days
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 6. Employees Scheduled */}
            <Card className="border border-amber-200 dark:border-amber-900/60 shadow-[0_6px_16px_-2px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_16px_-2px_rgba(0,0,0,0.4)] bg-amber-50/60 dark:bg-amber-950/30 group relative overflow-hidden flex flex-col justify-between rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
              <div className="absolute -right-3 -top-3 opacity-15 dark:opacity-25 transition-transform duration-500 ease-out group-hover:scale-115 group-hover:rotate-6 group-hover:-translate-y-1.5 pointer-events-none">
                <Users className="w-24 h-24 text-amber-600" />
              </div>
              <CardContent className="p-4 relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2.5 h-2.5 shrink-0 rounded-full bg-amber-500 shadow-xs"></div>
                    <span className="text-[11px] font-extrabold text-foreground dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Employees Scheduled</span>
                  </div>
                  {loading ? (
                    <Skeleton className="h-[36px] w-16 my-2" />
                  ) : (
                    <div className="my-1">
                      <span className="text-3xl font-black text-amber-700 dark:text-amber-300 leading-none">{employeesScheduledCount}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2.5 border-t border-amber-200/80 dark:border-amber-800/60">
                  <p className="text-[10px] font-semibold text-foreground dark:text-foreground whitespace-nowrap">
                    Across Upcoming Trips
                  </p>
                </div>
              </CardContent>
            </Card>
        </div>

        {/* ROW 2: Active Outstations (8) & Sidebar (4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          
          {/* Outstations Tables Column */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Active Outstations Table */}
            <Card className="border-0 bg-white dark:bg-card overflow-hidden flex flex-col rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
              <CardHeader className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-card flex flex-row flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
              <div>
                <CardTitle className="text-base font-bold text-foreground dark:text-slate-200">Active Outstations</CardTitle>
                <p className="text-[13px] text-foreground dark:text-foreground font-medium mt-0.5">Real-time status of employees currently on assignment</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 dark:border-slate-800 text-foreground dark:text-gray-300 rounded-[8px]">
                  <Filter className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 dark:border-slate-800 text-foreground dark:text-gray-300 rounded-[8px]">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-x-auto">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[1,2,3,4].map(n => <Skeleton key={n} className="h-12 w-full rounded-[8px]" />)}
                </div>
              ) : activeNow.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-foreground text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-900/50 flex items-center justify-center mb-4 border border-gray-100 dark:border-slate-800">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-sm font-bold text-muted-foreground mb-1">No Active Outstations</h3>
                  <p className="text-[12px] text-muted-foreground max-w-sm mb-6">Everyone is currently at their assigned workplace. There are no ongoing travels.</p>
                  <Button variant="outline" className="border-gray-300 shadow-sm" onClick={() => navigate("/outstation/assignment")}>View Assignments</Button>
                </div>
              ) : (
                <>
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80 sticky top-0 z-0">
                    <tr>
                      <th className="px-4 py-3 text-[11px] dark: border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Event Name</th>
                      <th className="px-4 py-3 text-[11px] dark: border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 text-[11px] dark: border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Employee</th>
                      <th className="px-4 py-3 text-[11px] dark: border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Duration</th>
                      <th className="px-4 py-3 text-[11px] dark: border-b border-gray-100 dark:border-slate-800 text-right text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeNowGrouped.filter(g => g.destination.toLowerCase().includes(search.toLowerCase()) || g.employees.some(e => (e.full_name || "").toLowerCase().includes(search.toLowerCase()))).map((g, i) => {
                      const totalDays = Math.round((new Date(g.end_date).getTime() - new Date(g.start_date).getTime()) / (1000 * 3600 * 24)) + 1;
                      return (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors group border-b border-gray-50 last:border-0">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-100/50 text-purple-700 flex items-center justify-center shadow-sm">
                                <MapPin className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                  <p className="text-[12px] font-bold text-foreground dark:text-gray-100 uppercase tracking-wide">{g.project || g.destination}</p>
                                  <p className="text-[10px] text-foreground dark:text-foreground flex items-center gap-1 mt-0.5 whitespace-nowrap"><MapPin className="w-3 h-3 text-foreground" /> {g.destination}</p>
                                </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="bg-green-50/50 text-green-600 border-green-200 text-[10px] font-bold shadow-none px-2 py-0.5 gap-1 uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-[12px] font-bold text-foreground dark:text-gray-100">
                                {g.employees.length} Employee{g.employees.length !== 1 ? 's' : ''}
                              </p>
                              {g.employees.length === 1 && (
                                <p className="text-[10px] text-foreground dark:text-foreground font-medium">{g.employees[0].user_id || "EMP-8821"}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <Calendar className="w-3.5 h-3.5 text-foreground mt-0.5" />
                              <div>
                                <p className="text-[11px] font-semibold text-foreground dark:text-gray-200">{formatShortDate(g.start_date)} - {formatShortDate(g.end_date)}</p>
                                <p className="text-[10px] font-medium text-purple-600">
                                  {totalDays} {totalDays === 1 ? 'Day' : 'Days'} Total
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md">
                                  View Details
                                </Button>
                              </DialogTrigger>
                              
                                <DialogContent className="max-w-lg w-[95vw] sm:w-full rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
                                    {/* Header (Fixed) */}
                                    <div className="bg-[#942392] px-6 py-5 text-white shrink-0">
                                      <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-white/20 shrink-0">
                                          <Plane className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Outstation Assignment</p>
                                          <DialogTitle className="text-lg font-black text-white leading-tight">
                                            {g.project || g.purpose || "Outstation Trip"}
                                          </DialogTitle>
                                          <p className="text-[11px] text-white/80 mt-1">The outstation details below.</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Body (Scrollable) */}
                                    <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
                                      {/* Trip Information */}
                                      <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                                          <MapPin className="w-3.5 h-3.5" /> Trip Information
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="col-span-2 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                                            <p className="text-[10px] text-black dark:text-white font-bold uppercase">Destination</p>
                                            <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{g.destination}</p>
                                          </div>
                                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                                            <p className="text-[10px] text-black dark:text-white font-bold uppercase">Event Name</p>
                                            <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{g.project || g.purpose || "Outstation Trip"}</p>
                                          </div>
                                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                                            <p className="text-[10px] text-black dark:text-white font-bold uppercase">Status</p>
                                            <div className="mt-1">
                                              <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${ g.employees[0]?.status === 'Upcoming' ? 'bg-orange-100 text-orange-700' : g.employees[0]?.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700' }`}>
                                                {g.employees[0]?.status || 'Active'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Duration */}
                                      <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                                          <Calendar className="w-3.5 h-3.5" /> Duration
                                        </p>
                                        <div className="grid grid-cols-3 gap-3">
                                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                                            <p className="text-[10px] text-black dark:text-white font-bold uppercase">Start Date</p>
                                            <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{formatShortDate(g.start_date)}</p>
                                          </div>
                                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                                            <p className="text-[10px] text-black dark:text-white font-bold uppercase">End Date</p>
                                            <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{formatShortDate(g.end_date)}</p>
                                          </div>
                                          <div className="bg-[#942392]/5 rounded-xl p-3 border border-[#942392]/20">
                                            <p className="text-[10px] text-[#942392] font-bold uppercase">Total Days</p>
                                            <p className="text-lg font-black text-[#942392] mt-0.5">
                                              {g.employees[0]?.total_days || 0} {g.employees[0]?.total_days === 1 ? 'Day' : 'Days'}
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Employees Assigned */}
                                      <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                                          <Users className="w-3.5 h-3.5" /> Employees Assigned ({g.employees.length})
                                        </p>
                                        <div className="space-y-2">
                                          {g.employees.map((emp: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#942392]/20 to-pink-200 flex items-center justify-center text-[10px] font-black text-[#942392] shrink-0">
                                                {(emp.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-bold text-foreground dark:text-gray-100 truncate">{emp.full_name}</p>
                                                <p className="text-[10px] text-foreground">{emp.user_id}</p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Footer (Fixed) */}
                                    <div className="px-6 pb-5 flex justify-end">
                                      <Button variant="outline" onClick={() => {
                                        const printWindow = window.open("", "_blank");
                                        if (!printWindow) return;
                                        const html = `
                                          <html>
                                            <head>
                                              <title>Outstation Assignment - ${ g.project || g.purpose || "Trip" }</title>
                                              <style>
                                                body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                                                h1 { color: #942392; font-size: 24px; margin-bottom: 5px; }
                                                h2 { font-size: 16px; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                                                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                                                .info-box { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
                                                .label { font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                                                .value { font-size: 14px; font-weight: bold; }
                                                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                                                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; }
                                                th { font-weight: bold; color: #666; text-transform: uppercase; font-size: 10px; }
                                              </style>
                                            </head>
                                            <body>
                                              <h1>${ g.project || g.purpose || "Outstation Trip" }</h1>
                                              <p style="color: #666; margin-top: 0;">Outstation Assignment Details</p>
                                              
                                              <h2>Trip Information</h2>
                                              <div class="info-grid">
                                                <div class="info-box" style="grid-column: span 2;">
                                                  <div class="label">Destination</div>
                                                  <div class="value">${ g.destination }</div>
                                                </div>
                                                <div class="info-box">
                                                  <div class="label">Status</div>
                                                  <div class="value">${ g.employees[0]?.status || 'Active' }</div>
                                                </div>
                                                <div class="info-box">
                                                  <div class="label">Total Days</div>
                                                  <div class="value">${ g.employees[0]?.total_days || 0 } Days (${ formatShortDate(g.start_date) } - ${ formatShortDate(g.end_date) })</div>
                                                </div>
                                              </div>

                                              <h2>Employees Assigned (${ g.employees.length })</h2>
                                              <table>
                                                <tr>
                                                  <th>Name</th>
                                                  <th>Employee ID</th>
                                                </tr>
                                                ${ g.employees.map((a: any) => `
                                                  <tr>
                                                    <td style="font-weight: bold;">${a.full_name}</td>
                                                    <td>${a.user_id}</td>
                                                  </tr>
                                                `).join('') }
                                              </table>
                                              
                                              <div style="margin-top: 40px; font-size: 10px; color: #999; text-align: center;">
                                                Generated from Rayhar Employee Portal
                                              </div>
                                            </body>
                                          </html>
                                        `;
                                        printWindow.document.write(html);
                                        printWindow.document.close();
                                        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
                                      }} className="rounded-xl font-black text-[11px] border-purple-200 text-purple-700 hover:bg-purple-50">
                                        Export to PDF
                                      </Button>
                                    </div>
                                </DialogContent>

                            </Dialog>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-card">
                  <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                      <span>TOTAL SHOWING {activeNowGrouped.length > 0 ? 1 : 0} TO {activeNowGrouped.length} OF {activeNowGrouped.length} ENTRIES</span>
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <Select 
                    value={pageSize.toString()} 
                    onValueChange={(val) => { setPageSize(Number(val)); setPage(1); }}
                  >
                    <SelectTrigger className="h-7 text-[10px] font-bold rounded border-border w-[60px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            
                    </div>
                  <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" disabled className="h-7 px-2 text-[10px] font-bold rounded">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <div className="flex items-center gap-1 overflow-x-auto max-w-[150px] sm:max-w-none scrollbar-hide">
                        <Button variant="default" size="sm" className="h-7 w-7 p-0 text-[10px] font-bold rounded bg-pink-500 text-white border-pink-500 hover:bg-pink-600">1</Button>
                      </div>
                      <Button variant="outline" size="sm" disabled className="h-7 px-2 text-[10px] font-bold rounded">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                </div>
                </>
              )}
            </CardContent>
            </Card>

            {/* Upcoming Outstations Table */}
            <Card className="border-0 bg-white dark:bg-card overflow-hidden flex flex-col rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
              <CardHeader className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-card flex flex-row flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
                <div>
                  <CardTitle className="text-base font-bold text-foreground dark:text-slate-200">Upcoming Outstations</CardTitle>
                  <p className="text-[13px] text-foreground dark:text-foreground font-medium mt-0.5">Scheduled travels and assignments</p>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-x-auto">
                {loading ? (
                  <div className="p-6 space-y-4">
                    {[1,2,3,4].map(n => <Skeleton key={n} className="h-12 w-full rounded-[8px]" />)}
                  </div>
                ) : upcomingGrouped.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-foreground text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-900/50 flex items-center justify-center mb-4 border border-gray-100 dark:border-slate-800">
                      <Calendar className="w-8 h-8 text-orange-500" />
                    </div>
                    <h3 className="text-sm font-bold text-muted-foreground mb-1">No Upcoming Outstations</h3>
                    <p className="text-[12px] text-muted-foreground max-w-sm mb-6">There are no scheduled travels.</p>
                  </div>
                ) : (
                  <>
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/80 sticky top-0 z-0">
                      <tr>
                        <th className="px-4 py-3 text-[11px] dark: border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Event Name</th>
                        <th className="px-4 py-3 text-[11px] dark: border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-[11px] dark: border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Employee</th>
                        <th className="px-4 py-3 text-[11px] dark: border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Duration</th>
                        <th className="px-4 py-3 text-[11px] dark: border-b border-gray-100 dark:border-slate-800 text-right text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {upcomingGrouped.filter(g => g.destination.toLowerCase().includes(search.toLowerCase()) || g.employees.some(e => (e.full_name || "").toLowerCase().includes(search.toLowerCase()))).map((g, i) => {
                        const totalDays = Math.round((new Date(g.end_date).getTime() - new Date(g.start_date).getTime()) / (1000 * 3600 * 24)) + 1;
                        return (
                          <tr key={i} className="hover:bg-gray-50/50 transition-colors group border-b border-gray-50 last:border-0">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-100/50 text-orange-700 flex items-center justify-center shadow-sm">
                                  <MapPin className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                  <p className="text-[12px] font-bold text-foreground dark:text-gray-100 uppercase tracking-wide">{g.project || g.destination}</p>
                                  <p className="text-[10px] text-foreground dark:text-foreground flex items-center gap-1 mt-0.5 whitespace-nowrap"><MapPin className="w-3 h-3 text-foreground" /> {g.destination}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="bg-orange-50/50 text-orange-600 border-orange-200 text-[10px] font-bold shadow-none px-2 py-0.5 gap-1 uppercase tracking-wider">
                                <Clock className="w-3 h-3" /> Upcoming
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-[12px] font-bold text-foreground dark:text-gray-100">
                                  {g.employees.length} Employee{g.employees.length !== 1 ? 's' : ''}
                                </p>
                                {g.employees.length === 1 && (
                                  <p className="text-[10px] text-foreground dark:text-foreground font-medium">{g.employees[0].user_id || "EMP-8821"}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-2">
                                <Calendar className="w-3.5 h-3.5 text-foreground mt-0.5" />
                                <div>
                                  <p className="text-[11px] font-semibold text-foreground dark:text-gray-200">{formatShortDate(g.start_date)} - {formatShortDate(g.end_date)}</p>
                                  <p className="text-[10px] font-medium text-orange-600">
                                    {totalDays} {totalDays === 1 ? 'Day' : 'Days'} Total
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-md">
                                    View Details
                                  </Button>
                                </DialogTrigger>
                                
                                <DialogContent className="max-w-lg w-[95vw] sm:w-full rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
                                    {/* Header (Fixed) */}
                                    <div className="bg-[#942392] px-6 py-5 text-white shrink-0">
                                      <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-white/20 shrink-0">
                                          <Plane className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Outstation Assignment</p>
                                          <DialogTitle className="text-lg font-black text-white leading-tight">
                                            {g.project || g.purpose || "Outstation Trip"}
                                          </DialogTitle>
                                          <p className="text-[11px] text-white/80 mt-1">The outstation details below.</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Body (Scrollable) */}
                                    <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
                                      {/* Trip Information */}
                                      <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                                          <MapPin className="w-3.5 h-3.5" /> Trip Information
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="col-span-2 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                                            <p className="text-[10px] text-black dark:text-white font-bold uppercase">Destination</p>
                                            <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{g.destination}</p>
                                          </div>
                                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                                            <p className="text-[10px] text-black dark:text-white font-bold uppercase">Event Name</p>
                                            <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{g.project || g.purpose || "Outstation Trip"}</p>
                                          </div>
                                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                                            <p className="text-[10px] text-black dark:text-white font-bold uppercase">Status</p>
                                            <div className="mt-1">
                                              <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${ g.employees[0]?.status === 'Upcoming' ? 'bg-orange-100 text-orange-700' : g.employees[0]?.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700' }`}>
                                                {g.employees[0]?.status || 'Active'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Duration */}
                                      <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                                          <Calendar className="w-3.5 h-3.5" /> Duration
                                        </p>
                                        <div className="grid grid-cols-3 gap-3">
                                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                                            <p className="text-[10px] text-black dark:text-white font-bold uppercase">Start Date</p>
                                            <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{formatShortDate(g.start_date)}</p>
                                          </div>
                                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                                            <p className="text-[10px] text-black dark:text-white font-bold uppercase">End Date</p>
                                            <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{formatShortDate(g.end_date)}</p>
                                          </div>
                                          <div className="bg-[#942392]/5 rounded-xl p-3 border border-[#942392]/20">
                                            <p className="text-[10px] text-[#942392] font-bold uppercase">Total Days</p>
                                            <p className="text-lg font-black text-[#942392] mt-0.5">
                                              {g.employees[0]?.total_days || 0} {g.employees[0]?.total_days === 1 ? 'Day' : 'Days'}
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Employees Assigned */}
                                      <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                                          <Users className="w-3.5 h-3.5" /> Employees Assigned ({g.employees.length})
                                        </p>
                                        <div className="space-y-2">
                                          {g.employees.map((emp: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#942392]/20 to-pink-200 flex items-center justify-center text-[10px] font-black text-[#942392] shrink-0">
                                                {(emp.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-bold text-foreground dark:text-gray-100 truncate">{emp.full_name}</p>
                                                <p className="text-[10px] text-foreground">{emp.user_id}</p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Footer (Fixed) */}
                                    <div className="px-6 pb-5 flex justify-end">
                                      <Button variant="outline" onClick={() => {
                                        const printWindow = window.open("", "_blank");
                                        if (!printWindow) return;
                                        const html = `
                                          <html>
                                            <head>
                                              <title>Outstation Assignment - ${ g.project || g.purpose || "Trip" }</title>
                                              <style>
                                                body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                                                h1 { color: #942392; font-size: 24px; margin-bottom: 5px; }
                                                h2 { font-size: 16px; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                                                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                                                .info-box { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
                                                .label { font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                                                .value { font-size: 14px; font-weight: bold; }
                                                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                                                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; }
                                                th { font-weight: bold; color: #666; text-transform: uppercase; font-size: 10px; }
                                              </style>
                                            </head>
                                            <body>
                                              <h1>${ g.project || g.purpose || "Outstation Trip" }</h1>
                                              <p style="color: #666; margin-top: 0;">Outstation Assignment Details</p>
                                              
                                              <h2>Trip Information</h2>
                                              <div class="info-grid">
                                                <div class="info-box" style="grid-column: span 2;">
                                                  <div class="label">Destination</div>
                                                  <div class="value">${ g.destination }</div>
                                                </div>
                                                <div class="info-box">
                                                  <div class="label">Status</div>
                                                  <div class="value">${ g.employees[0]?.status || 'Active' }</div>
                                                </div>
                                                <div class="info-box">
                                                  <div class="label">Total Days</div>
                                                  <div class="value">${ g.employees[0]?.total_days || 0 } Days (${ formatShortDate(g.start_date) } - ${ formatShortDate(g.end_date) })</div>
                                                </div>
                                              </div>

                                              <h2>Employees Assigned (${ g.employees.length })</h2>
                                              <table>
                                                <tr>
                                                  <th>Name</th>
                                                  <th>Employee ID</th>
                                                </tr>
                                                ${ g.employees.map((a: any) => `
                                                  <tr>
                                                    <td style="font-weight: bold;">${a.full_name}</td>
                                                    <td>${a.user_id}</td>
                                                  </tr>
                                                `).join('') }
                                              </table>
                                              
                                              <div style="margin-top: 40px; font-size: 10px; color: #999; text-align: center;">
                                                Generated from Rayhar Employee Portal
                                              </div>
                                            </body>
                                          </html>
                                        `;
                                        printWindow.document.write(html);
                                        printWindow.document.close();
                                        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
                                      }} className="rounded-xl font-black text-[11px] border-purple-200 text-purple-700 hover:bg-purple-50">
                                        Export to PDF
                                      </Button>
                                    </div>
                                </DialogContent>

                              </Dialog>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-card">
                    <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                      <span>TOTAL SHOWING {upcomingGrouped.length > 0 ? 1 : 0} TO {upcomingGrouped.length} OF {upcomingGrouped.length} ENTRIES</span>
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <Select 
                    value={pageSize.toString()} 
                    onValueChange={(val) => { setPageSize(Number(val)); setPage(1); }}
                  >
                    <SelectTrigger className="h-7 text-[10px] font-bold rounded border-border w-[60px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            
                    </div>
                  </div>
                  </>
                )}
              </CardContent>
            </Card>

          </div>
          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Alerts & Upcoming List */}
            <Card className="border-0 bg-white dark:bg-card overflow-hidden flex-1 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
              <CardHeader className="px-5 py-4 border-b border-gray-50">
                <CardTitle className="text-base font-bold text-foreground dark:text-slate-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" /> Alerts & Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex flex-col divide-y divide-gray-50">
                <div className="p-5">
                  <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest mb-3">Departing Soon</h4>
                  {loading ? <Skeleton className="h-10 w-full rounded" /> : upcoming.length === 0 ? <p className="text-[12px] text-muted-foreground">No upcoming departures</p> : upcoming.slice(0, 3).map((a, i) => (
                    <div key={i} className="flex items-center gap-3 mb-3 last:mb-0">
                      <div className="w-8 h-8 rounded-md bg-orange-50 flex items-center justify-center flex-shrink-0 border border-orange-100">
                        <Plane className="w-4 h-4 text-orange-600 transform rotate-45" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-foreground dark:text-gray-100 truncate">{a.full_name}</p>
                        <p className="text-[10px] text-foreground dark:text-foreground truncate">{a.destination} • {formatShortDate(a.start_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-5">
                  <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest mb-3">Returning Today</h4>
                  {loading ? <Skeleton className="h-10 w-full rounded" /> : returns.length === 0 ? <p className="text-[12px] text-muted-foreground">No returns expected today</p> : returns.slice(0, 3).map((a, i) => (
                    <div key={i} className="flex items-center gap-3 mb-3 last:mb-0">
                      <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
                        <Plane className="w-4 h-4 text-blue-600 transform -rotate-45" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-foreground dark:text-gray-100 truncate">{a.full_name}</p>
                        <p className="text-[10px] text-foreground dark:text-foreground truncate">From {a.destination}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-card overflow-hidden rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
              <CardHeader className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center gap-2">
                <Zap className="w-4 h-4 text-[#942392]" />
                <CardTitle className="text-[11px] font-bold text-foreground dark:text-slate-100 uppercase tracking-widest">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div onClick={() => navigate("/outstation/assignment")} className="cursor-pointer flex flex-col items-center justify-center p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-purple-500 hover:ring-1 hover:ring-purple-500 hover:bg-purple-50/50 dark:hover:bg-slate-900/50 transition-all duration-200">
                    <Plane className="w-6 h-6 text-[#942392] mb-2" />
                    <span className="text-[10px] font-bold text-foreground dark:text-slate-300 uppercase text-center">New Assignment</span>
                  </div>
                  <div onClick={() => navigate("/outstation/calendar")} className="cursor-pointer flex flex-col items-center justify-center p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-purple-500 hover:ring-1 hover:ring-purple-500 hover:bg-purple-50/50 dark:hover:bg-slate-900/50 transition-all duration-200">
                    <Calendar className="w-6 h-6 text-[#942392] mb-2" />
                    <span className="text-[10px] font-bold text-foreground dark:text-slate-300 uppercase text-center">Calendar View</span>
                  </div>
                  <div onClick={() => navigate("/outstation/analytics")} className="cursor-pointer flex flex-col items-center justify-center p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-purple-500 hover:ring-1 hover:ring-purple-500 hover:bg-purple-50/50 dark:hover:bg-slate-900/50 transition-all duration-200">
                    <Activity className="w-6 h-6 text-[#942392] mb-2" />
                    <span className="text-[10px] font-bold text-foreground dark:text-slate-300 uppercase text-center">Analytics</span>
                  </div>
                  <div onClick={() => navigate("/outstation/reports")} className="cursor-pointer flex flex-col items-center justify-center p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-purple-500 hover:ring-1 hover:ring-purple-500 hover:bg-purple-50/50 dark:hover:bg-slate-900/50 transition-all duration-200">
                    <Map className="w-6 h-6 text-[#942392] mb-2" />
                    <span className="text-[10px] font-bold text-foreground dark:text-slate-300 uppercase text-center">Reports</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>


      </div>
    </div>
  );
}



