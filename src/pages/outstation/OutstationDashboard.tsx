import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Loader2, Plane, TrendingUp, RefreshCw, Clock, 
  MapPin, CheckCircle2, Search, Filter, MoreHorizontal, 
  AlertCircle, ChevronRight, Activity, Map, ArrowRight,
  User, CheckCircle, Calendar
} from "lucide-react";
import {
  BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, LineChart, Line, YAxis
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { API_BASE_URL } from "../../config/api";

const OUTSTATION_ROLES = ["hr_admin", "managing_director", "finance_manager", "branch_leader", "head_of_department"];

// Semantic Colors
const C_PURPLE = "#4c1d95"; // Brand
const C_BLUE = "#2563eb";   // Info
const C_GREEN = "#16a34a";  // Completed
const C_ORANGE = "#ea580c"; // Upcoming
const C_RED = "#dc2626";    // Cancelled/Overdue
const C_GRAY = "#64748b";   // Inactive

function formatShortDate(dStr: string) {
  if (!dStr) return "—";
  return new Date(dStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
      destination: string; department: string; start_date: string; end_date: string; status: string;
      employees: any[];
    }> = {};

    active.forEach(a => {
      const key = `${a.destination}_${a.start_date}_${a.end_date}_${a.status}`;
      if (!groups[key]) {
        groups[key] = {
          destination: a.destination,
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
      destination: string; department: string; start_date: string; end_date: string; status: string;
      employees: any[];
    }> = {};

    upcomingList.forEach(a => {
      const key = `${a.destination}_${a.start_date}_${a.end_date}_${a.status}`;
      if (!groups[key]) {
        groups[key] = {
          destination: a.destination,
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
      activeColor: startedThisWeek > 0 ? "text-green-600" : "text-gray-400",
      upcoming: departingToday > 0 ? `↑ +${departingToday} today` : `- 0 today`,
      upcomingColor: departingToday > 0 ? "text-orange-600" : "text-gray-400",
      total: monthDiff > 0 ? `↑ +${monthDiff}% vs last month` : (monthDiff < 0 ? `↓ ${monthDiff}% vs last month` : `- 0% vs last month`),
      totalColor: monthDiff > 0 ? "text-purple-600" : (monthDiff < 0 ? "text-red-500" : "text-gray-400"),
      completionValue: `${rate}%`,
      completionTrend: rateDiff > 0 ? `↑ +${rateDiff}% vs last month` : (rateDiff < 0 ? `↓ ${rateDiff}% vs last month` : `- 0% vs last month`),
      completionColor: rateDiff > 0 ? "text-green-600" : (rateDiff < 0 ? "text-red-500" : "text-gray-400")
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
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 dark:text-gray-100 pb-12">
      {/* 
        Spacing System: 8, 16, 24, 32, 48px
        Using standard Tailwind: 2 (8px), 4 (16px), 6 (24px), 8 (32px), 12 (48px)
      */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <p className="text-[14px] text-gray-500 dark:text-gray-400">Monitor employee business travel across all branches.</p>
          <Button className="h-10 px-5 text-[14px] font-semibold text-white shadow-sm bg-[#4c1d95] hover:bg-[#3b0764]" onClick={() => navigate("/outstation/assignment", { state: { openNew: true } })}>
            <Plane className="w-4 h-4 mr-2" /> New Assignment
          </Button>
        </div>

        {/* ROW 1: Enterprise KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            {/* 1. Active Outstation */}
            <Card className="border-0 shadow-sm rounded-[16px] bg-white dark:bg-card overflow-hidden hover:shadow-md transition-shadow relative flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-1 bg-green-500" />
              <CardContent className="p-4 flex flex-col flex-1">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Active Outstation</p>
                {loading ? (
                  <Skeleton className="h-[36px] w-16 mb-2 mt-2" />
                ) : (
                  <div className="flex flex-col mt-1 mb-3">
                    <span className="text-[28px] font-extrabold text-gray-900 dark:text-gray-100 leading-none">{activeCount}</span>
                    <span className="text-[11px] font-bold text-green-600 mt-1">↑ +3 vs Yesterday</span>
                  </div>
                )}
                <div className="mt-auto pt-3 border-t border-gray-50 dark:border-slate-800/50">
                  <p className="text-[11px] text-gray-500 font-medium flex justify-between">
                    <span>Domestic</span> <span className="font-bold text-gray-900 dark:text-gray-100">{activeDomestic}</span>
                  </p>
                  <p className="text-[11px] text-gray-500 font-medium flex justify-between mt-1">
                    <span>International</span> <span className="font-bold text-gray-900 dark:text-gray-100">{activeInternational}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 2. Departing Today */}
            <Card className="border-0 shadow-sm rounded-[16px] bg-white dark:bg-card overflow-hidden hover:shadow-md transition-shadow relative flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />
              <CardContent className="p-4 flex flex-col flex-1">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Departing Today</p>
                {loading ? (
                  <Skeleton className="h-[36px] w-16 mb-2 mt-2" />
                ) : (
                  <div className="flex flex-col mt-1 mb-3">
                    <span className="text-[28px] font-extrabold text-gray-900 dark:text-gray-100 leading-none">{departingTodayCount}</span>
                    <span className="text-[11px] font-medium text-gray-500 mt-1">Starts Today</span>
                  </div>
                )}
                <div className="mt-auto pt-3 border-t border-gray-50 dark:border-slate-800/50">
                  <p className="text-[11px] text-gray-500 font-medium flex justify-between">
                    <span>Domestic</span> <span className="font-bold text-gray-900 dark:text-gray-100">{departingDomestic}</span>
                  </p>
                  <p className="text-[11px] text-gray-500 font-medium flex justify-between mt-1">
                    <span>Overseas</span> <span className="font-bold text-gray-900 dark:text-gray-100">{departingInternational}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 3. Returning Today */}
            <Card className="border-0 shadow-sm rounded-[16px] bg-white dark:bg-card overflow-hidden hover:shadow-md transition-shadow relative flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <CardContent className="p-4 flex flex-col flex-1">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Returning Today</p>
                {loading ? (
                  <Skeleton className="h-[36px] w-16 mb-2 mt-2" />
                ) : (
                  <div className="flex flex-col mt-1 mb-3">
                    <span className="text-[28px] font-extrabold text-gray-900 dark:text-gray-100 leading-none">{returningTodayCount}</span>
                    <span className="text-[11px] font-medium text-gray-500 mt-1">Expected Back</span>
                  </div>
                )}
                <div className="mt-auto pt-3 border-t border-gray-50 dark:border-slate-800/50">
                  <p className="text-[11px] font-bold text-blue-600 flex items-center">
                    <Clock className="w-3 h-3 mr-1" /> Before 6 PM
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 4. Upcoming Events */}
            <Card className="border-0 shadow-sm rounded-[16px] bg-white dark:bg-card overflow-hidden hover:shadow-md transition-shadow relative flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
              <CardContent className="p-4 flex flex-col flex-1">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Upcoming Events</p>
                {loading ? (
                  <Skeleton className="h-[36px] w-16 mb-2 mt-2" />
                ) : (
                  <div className="flex flex-col mt-1 mb-3">
                    <span className="text-[28px] font-extrabold text-gray-900 dark:text-gray-100 leading-none">{upcomingAssignmentsCount}</span>
                    <span className="text-[11px] font-medium text-gray-500 mt-1">Next 7 Days</span>
                  </div>
                )}
                <div className="mt-auto pt-3 border-t border-gray-50 dark:border-slate-800/50">
                  <p className="text-[11px] text-gray-500 font-medium">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric'})} - {new Date(Date.now() + 7 * 24 * 3600 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 5. Employees Scheduled */}
            <Card className="border-0 shadow-sm rounded-[16px] bg-white dark:bg-card overflow-hidden hover:shadow-md transition-shadow relative flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-500" />
              <CardContent className="p-4 flex flex-col flex-1">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 whitespace-nowrap">Employees Scheduled</p>
                {loading ? (
                  <Skeleton className="h-[36px] w-16 mb-2 mt-2" />
                ) : (
                  <div className="flex flex-col mt-1 mb-3">
                    <span className="text-[28px] font-extrabold text-gray-900 dark:text-gray-100 leading-none">{employeesScheduledCount}</span>
                    <span className="text-[11px] font-medium text-gray-500 mt-1 whitespace-nowrap">Across Upcoming Trips</span>
                  </div>
                )}
                <div className="mt-auto pt-3 border-t border-gray-50 dark:border-slate-800/50">
                  <p className="text-[11px] text-gray-500 font-medium flex justify-between">
                    <span>Assignments</span> <span className="font-bold text-gray-900 dark:text-gray-100">{upcomingAssignmentsCount}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 6. Approval Pending */}
            <Card className="border-0 shadow-sm rounded-[16px] bg-white dark:bg-card overflow-hidden hover:shadow-md transition-shadow relative flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
              <CardContent className="p-4 flex flex-col flex-1">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-500" /> Approval Pending
                </p>
                {loading ? (
                  <Skeleton className="h-[36px] w-16 mb-2 mt-2" />
                ) : (
                  <div className="flex flex-col mt-1 mb-2">
                    <span className="text-[28px] font-extrabold text-gray-900 dark:text-gray-100 leading-none">{approvalPendingCount}</span>
                    <span className="text-[11px] font-medium text-gray-500 mt-1">Waiting Approval</span>
                  </div>
                )}
                <div className="mt-auto pt-2 border-t border-gray-50 dark:border-slate-800/50 grid grid-cols-3 gap-1">
                  <div className="text-center bg-red-50/50 rounded py-1">
                    <p className="text-[9px] text-gray-500 uppercase">HR</p>
                    <p className="text-[11px] font-bold text-gray-900">4</p>
                  </div>
                  <div className="text-center bg-red-50/50 rounded py-1">
                    <p className="text-[9px] text-gray-500 uppercase">HOD</p>
                    <p className="text-[11px] font-bold text-gray-900">3</p>
                  </div>
                  <div className="text-center bg-red-50/50 rounded py-1">
                    <p className="text-[9px] text-gray-500 uppercase">MD</p>
                    <p className="text-[11px] font-bold text-gray-900">1</p>
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>

        {/* ROW 2: Active Outstations (8) & Sidebar (4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          
          {/* Outstations Tables Column */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Active Outstations Table */}
            <Card className="border-0 shadow-sm rounded-[16px] bg-white dark:bg-card overflow-hidden flex flex-col min-h-[400px]">
              <CardHeader className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-card flex flex-row flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
              <div>
                <CardTitle className="text-[18px] font-bold text-gray-900 dark:text-gray-100">Active Outstations</CardTitle>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Real-time status of employees currently on assignment</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-300 rounded-[8px]">
                  <Filter className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-300 rounded-[8px]">
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
                <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400 text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-900/50 flex items-center justify-center mb-4 border border-gray-100 dark:border-slate-800">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-[16px] font-bold text-gray-800 dark:text-gray-100 mb-1">No Active Outstations</h3>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 max-w-sm mb-6">Everyone is currently at their assigned workplace. There are no ongoing travels.</p>
                  <Button variant="outline" className="border-gray-300 shadow-sm" onClick={() => navigate("/outstation/assignment")}>View Assignments</Button>
                </div>
              ) : (
                <>
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80 sticky top-0 z-0">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">Destination</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">Status</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">Employee</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">Duration</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeNowGrouped.filter(g => g.destination.toLowerCase().includes(search.toLowerCase()) || g.employees.some(e => (e.full_name || "").toLowerCase().includes(search.toLowerCase()))).map((g, i) => {
                      const totalDays = Math.max(1, Math.ceil((new Date(g.end_date).getTime() - new Date(g.start_date).getTime()) / (1000 * 3600 * 24)));
                      return (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors group border-b border-gray-50 last:border-0">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-100/50 text-purple-700 flex items-center justify-center shadow-sm">
                                <MapPin className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-[12px] font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">{g.destination}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{g.department || "Domestic Branch"}</p>
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
                              <p className="text-[12px] font-bold text-gray-900 dark:text-gray-100">
                                {g.employees.length} Employee{g.employees.length !== 1 ? 's' : ''}
                              </p>
                              {g.employees.length === 1 && (
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{g.employees[0].user_id || "EMP-8821"}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                              <div>
                                <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">{formatShortDate(g.start_date)} - {formatShortDate(g.end_date)}</p>
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
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle className="uppercase tracking-wider">{g.destination}</DialogTitle>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Assigned Employees ({g.employees.length})</p>
                                </DialogHeader>
                                <div className="py-2 space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                  {g.employees.map((e, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-gray-50/80 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                                      <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-purple-100/80 text-purple-700 flex items-center justify-center font-bold text-xs shadow-sm">
                                          {e.full_name ? e.full_name.substring(0, 2).toUpperCase() : "U"}
                                        </div>
                                        <div>
                                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight mb-0.5">{e.full_name || "Unknown"}</p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{e.user_id || "EMP-8821"}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
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
                  <span className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">Showing {activeNowGrouped.length > 0 ? 1 : 0}-{activeNowGrouped.length} of {activeNowGrouped.length} Active Outstations</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[12px] font-medium border-gray-200 dark:border-slate-800">Previous</Button>
                    <Button variant="outline" size="sm" className="h-8 text-[12px] font-medium border-gray-200 dark:border-slate-800">Next</Button>
                  </div>
                </div>
                </>
              )}
            </CardContent>
            </Card>

            {/* Upcoming Outstations Table */}
            <Card className="border-0 shadow-sm rounded-[16px] bg-white dark:bg-card overflow-hidden flex flex-col min-h-[400px]">
              <CardHeader className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-card flex flex-row flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
                <div>
                  <CardTitle className="text-[18px] font-bold text-gray-900 dark:text-gray-100">Upcoming Outstations</CardTitle>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Scheduled travels and assignments</p>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-x-auto">
                {loading ? (
                  <div className="p-6 space-y-4">
                    {[1,2,3,4].map(n => <Skeleton key={n} className="h-12 w-full rounded-[8px]" />)}
                  </div>
                ) : upcomingGrouped.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400 text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-900/50 flex items-center justify-center mb-4 border border-gray-100 dark:border-slate-800">
                      <Calendar className="w-8 h-8 text-orange-500" />
                    </div>
                    <h3 className="text-[16px] font-bold text-gray-800 dark:text-gray-100 mb-1">No Upcoming Outstations</h3>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 max-w-sm mb-6">There are no scheduled travels.</p>
                  </div>
                ) : (
                  <>
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/80 sticky top-0 z-0">
                      <tr>
                        <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">Destination</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">Status</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">Employee</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">Duration</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {upcomingGrouped.filter(g => g.destination.toLowerCase().includes(search.toLowerCase()) || g.employees.some(e => (e.full_name || "").toLowerCase().includes(search.toLowerCase()))).map((g, i) => {
                        const totalDays = Math.max(1, Math.ceil((new Date(g.end_date).getTime() - new Date(g.start_date).getTime()) / (1000 * 3600 * 24)));
                        return (
                          <tr key={i} className="hover:bg-gray-50/50 transition-colors group border-b border-gray-50 last:border-0">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-100/50 text-orange-700 flex items-center justify-center shadow-sm">
                                  <MapPin className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                  <p className="text-[12px] font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">{g.destination}</p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{g.department || "Domestic Branch"}</p>
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
                                <p className="text-[12px] font-bold text-gray-900 dark:text-gray-100">
                                  {g.employees.length} Employee{g.employees.length !== 1 ? 's' : ''}
                                </p>
                                {g.employees.length === 1 && (
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{g.employees[0].user_id || "EMP-8821"}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-2">
                                <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                                <div>
                                  <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">{formatShortDate(g.start_date)} - {formatShortDate(g.end_date)}</p>
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
                                <DialogContent className="sm:max-w-[425px]">
                                  <DialogHeader>
                                    <DialogTitle className="uppercase tracking-wider">{g.destination}</DialogTitle>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Assigned Employees ({g.employees.length})</p>
                                  </DialogHeader>
                                  <div className="py-2 space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                    {g.employees.map((e, idx) => (
                                      <div key={idx} className="flex items-center justify-between bg-gray-50/80 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                          <div className="w-9 h-9 rounded-full bg-orange-100/80 text-orange-700 flex items-center justify-center font-bold text-xs shadow-sm">
                                            {e.full_name ? e.full_name.substring(0, 2).toUpperCase() : "U"}
                                          </div>
                                          <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight mb-0.5">{e.full_name || "Unknown"}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{e.user_id || "EMP-8821"}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
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
                    <span className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">Showing {upcomingGrouped.length > 0 ? 1 : 0}-{upcomingGrouped.length} of {upcomingGrouped.length} Upcoming Outstations</span>
                  </div>
                  </>
                )}
              </CardContent>
            </Card>

          </div>
          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Alerts & Upcoming List */}
            <Card className="border-0 shadow-sm rounded-[16px] bg-white dark:bg-card overflow-hidden flex-1">
              <CardHeader className="px-5 py-4 border-b border-gray-50">
                <CardTitle className="text-[16px] font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" /> Alerts & Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex flex-col divide-y divide-gray-50">
                <div className="p-5">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Departing Soon</h4>
                  {loading ? <Skeleton className="h-10 w-full rounded" /> : upcoming.length === 0 ? <p className="text-[13px] text-gray-500 dark:text-gray-400">No upcoming departures</p> : upcoming.slice(0, 3).map((a, i) => (
                    <div key={i} className="flex items-center gap-3 mb-3 last:mb-0">
                      <div className="w-8 h-8 rounded-md bg-orange-50 flex items-center justify-center flex-shrink-0 border border-orange-100">
                        <Plane className="w-4 h-4 text-orange-600 transform rotate-45" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 truncate">{a.full_name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{a.destination} • {formatShortDate(a.start_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-5">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Returning Today</h4>
                  {loading ? <Skeleton className="h-10 w-full rounded" /> : returns.length === 0 ? <p className="text-[13px] text-gray-500 dark:text-gray-400">No returns expected today</p> : returns.slice(0, 3).map((a, i) => (
                    <div key={i} className="flex items-center gap-3 mb-3 last:mb-0">
                      <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
                        <Plane className="w-4 h-4 text-blue-600 transform -rotate-45" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 truncate">{a.full_name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">From {a.destination}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm rounded-[16px] bg-white dark:bg-card">
              <CardHeader className="px-5 py-4 border-b border-gray-50">
                <CardTitle className="text-[16px] font-bold text-gray-900 dark:text-gray-100">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-2 grid grid-cols-2 gap-2">
                {[
                  { label: "New Assignment", icon: Plane, path: "/outstation/assignment" },
                  { label: "Calendar View", icon: Calendar, path: "/outstation/calendar" },
                  { label: "Analytics", icon: Activity, path: "/outstation/analytics" },
                  { label: "Reports", icon: Map, path: "/outstation/reports" },
                ].map((action, i) => (
                  <Button key={i} variant="ghost" className="h-12 justify-start px-3 text-[13px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-slate-900/50 hover:text-purple-700 rounded-[12px] group transition-colors" onClick={() => navigate(action.path)}>
                    <action.icon className="w-4 h-4 mr-2 text-gray-400 group-hover:text-purple-600" /> {action.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

          </div>
        </div>


      </div>
    </div>
  );
}

