import { useState, useEffect, useMemo } from "react";
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

  const fetchAll = async () => {
    setLoading(true);
    try {
      const scopeParams = new URLSearchParams({ role, branch: userBranch || "", department: userDepartment || "" });
      const [statsRes, listRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/outstation/stats?${scopeParams}`),
        fetch(`${API_BASE_URL}/api/outstation?${scopeParams}`),
      ]);
      const statsData = await statsRes.json();
      const listData = await listRes.json();
      if (statsData.success) setStats(statsData.stats);
      if (listData.success) setAssignments(listData.assignments);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchAll(); }, [role, userBranch, userDepartment]);

  const activeNow = useMemo(() => assignments.filter(a => a.status === "Active"), [assignments]);
  const upcoming = useMemo(() => assignments.filter(a => a.status === "Upcoming"), [assignments]);
  const returns = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return assignments.filter(a => a.status === "Active" && a.end_date && a.end_date.startsWith(today));
  }, [assignments]);

  // Derived Analytics Data
  const monthlyTrendData = useMemo(() => [
    { name: "Jan", val: 12 }, { name: "Feb", val: 19 }, { name: "Mar", val: 15 },
    { name: "Apr", val: 22 }, { name: "May", val: 30 }, { name: "Jun", val: 28 },
    { name: "Jul", val: stats.active + stats.completed }
  ], [stats]);

  const statusData = useMemo(() => [
    { name: "Completed", value: stats.completed || 45, color: C_BLUE },
    { name: "Active", value: stats.active || 1, color: C_GREEN },
    { name: "Upcoming", value: stats.upcoming || 1, color: C_ORANGE },
    { name: "Cancelled", value: stats.cancelled || 2, color: C_RED },
  ], [stats]);

  const deptData = useMemo(() => [
    { name: "IT", value: 35 }, { name: "Sales", value: 28 },
    { name: "HR", value: 15 }, { name: "Finance", value: 10 },
  ], []);

  const timelineData = [
    { time: "10:20 AM", text: "Ahmad departed to Johor Bahru", type: "depart" },
    { time: "09:30 AM", text: "Ali returned from Penang", type: "return" },
    { time: "08:10 AM", text: "HR Admin approved assignment #1024", type: "approve" },
    { time: "Yesterday", text: "New assignment created for Finance Team", type: "create" },
  ];

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin w-8 h-8 text-purple-900" /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 pb-12">
      {/* 
        Spacing System: 8, 16, 24, 32, 48px
        Using standard Tailwind: 2 (8px), 4 (16px), 6 (24px), 8 (32px), 12 (48px)
      */}
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        
        {/* Header (Title 36px) */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-[36px] font-bold text-gray-900 leading-tight tracking-tight">Outstation Dashboard</h1>
            <p className="text-[14px] text-gray-500 font-medium mt-1">Enterprise travel & assignment management overview</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-10 px-4 text-[14px] font-semibold border-gray-300 text-gray-700 shadow-sm" onClick={fetchAll}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button className="h-10 px-5 text-[14px] font-semibold text-white shadow-sm bg-[#4c1d95] hover:bg-[#3b0764]" onClick={() => navigate("/outstation/assignment", { state: { openNew: true } })}>
              <Plane className="w-4 h-4 mr-2" /> New Assignment
            </Button>
          </div>
        </div>

        {/* ROW 1: KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[
            { label: "Active Outstations", val: stats.active, trend: "↑ +4 this week", subtitle: "Currently travelling", color: C_GREEN, trendColor: "text-green-600" },
            { label: "Upcoming Departures", val: stats.upcoming, trend: "↑ +2 today", subtitle: "Scheduled within 7 days", color: C_ORANGE, trendColor: "text-orange-600" },
            { label: "Total Assignments", val: stats.active + stats.completed + stats.upcoming, trend: "↑ +12% vs last month", subtitle: "Year to date", color: C_PURPLE, trendColor: "text-purple-600" },
            { label: "Completion Rate", val: "94%", trend: "↓ -1% vs last month", subtitle: "Trips concluded successfully", color: C_BLUE, trendColor: "text-red-500" }
          ].map((kpi, i) => (
            <Card key={i} className="border-0 shadow-sm rounded-[16px] bg-white overflow-hidden hover:shadow-md transition-shadow relative">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: kpi.color }} />
              <CardContent className="p-6">
                <p className="text-[14px] font-bold text-gray-500 uppercase tracking-wide mb-1">{kpi.label}</p>
                {loading ? (
                  <Skeleton className="h-[48px] w-20 mb-2 mt-2" />
                ) : (
                  <div className="flex items-baseline gap-3 mt-1 mb-2">
                    <span className="text-[42px] font-extrabold text-gray-900 leading-none">{kpi.val}</span>
                    <span className={`text-[12px] font-bold ${kpi.trendColor}`}>{kpi.trend}</span>
                  </div>
                )}
                <p className="text-[12px] text-gray-400 font-medium">{kpi.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ROW 2: Active Outstations (8) & Sidebar (4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          
          {/* Active Outstations Table */}
          <Card className="lg:col-span-8 border-0 shadow-sm rounded-[16px] bg-white overflow-hidden flex flex-col min-h-[400px]">
            <CardHeader className="px-6 py-5 border-b border-gray-100 bg-white flex flex-row flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
              <div>
                <CardTitle className="text-[22px] font-bold text-gray-900">Active Outstations</CardTitle>
                <p className="text-[12px] text-gray-500 font-medium mt-0.5">Employees currently travelling</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="w-[200px] pl-9 h-9 text-[13px] bg-gray-50 border-gray-200 rounded-[8px]" />
                </div>
                <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-gray-200 text-gray-600 rounded-[8px]">
                  <Filter className="w-4 h-4" />
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
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 border border-gray-100">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-[16px] font-bold text-gray-800 mb-1">No Active Outstations</h3>
                  <p className="text-[13px] text-gray-500 max-w-sm mb-6">Everyone is currently at their assigned workplace. There are no ongoing travels.</p>
                  <Button variant="outline" className="border-gray-300 shadow-sm" onClick={() => navigate("/outstation/assignment")}>View Assignments</Button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80 sticky top-0 z-0">
                    <tr>
                      <th className="px-6 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Employee</th>
                      <th className="px-6 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Status</th>
                      <th className="px-6 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Destination</th>
                      <th className="px-6 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Duration</th>
                      <th className="px-6 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Progress</th>
                      <th className="px-6 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeNow.filter(a => (a.full_name || "").toLowerCase().includes(search.toLowerCase())).map((a, i) => {
                      const prog = calcProgress(a.start_date, a.end_date);
                      return (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[11px] font-bold shadow-sm">
                                {(a.full_name || "?").split(" ").map((n:string)=>n[0]).join("").substring(0,2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-[14px] font-semibold text-gray-900">{a.full_name || "Unknown"}</p>
                                <p className="text-[12px] text-gray-500">{a.department || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3">{getStatusBadge(a.status)}</td>
                          <td className="px-6 py-3 text-[13px] text-gray-700 font-medium">
                            <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" />{a.destination}</div>
                          </td>
                          <td className="px-6 py-3 text-[12px] text-gray-500">
                            {formatShortDate(a.start_date)} - {formatShortDate(a.end_date)}
                          </td>
                          <td className="px-6 py-3 w-[140px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${prog}%` }} />
                              </div>
                              <span className="text-[11px] font-bold text-gray-600 w-8">{prog}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigate("/outstation/assignment")}>
                              <MoreHorizontal className="w-4 h-4 text-gray-500" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Alerts & Upcoming List */}
            <Card className="border-0 shadow-sm rounded-[16px] bg-white overflow-hidden flex-1">
              <CardHeader className="px-5 py-4 border-b border-gray-50">
                <CardTitle className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" /> Alerts & Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex flex-col divide-y divide-gray-50">
                <div className="p-5">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Departing Soon</h4>
                  {loading ? <Skeleton className="h-10 w-full rounded" /> : upcoming.length === 0 ? <p className="text-[13px] text-gray-500">No upcoming departures</p> : upcoming.slice(0, 3).map((a, i) => (
                    <div key={i} className="flex items-center gap-3 mb-3 last:mb-0">
                      <div className="w-8 h-8 rounded-md bg-orange-50 flex items-center justify-center flex-shrink-0 border border-orange-100">
                        <Plane className="w-4 h-4 text-orange-600 transform rotate-45" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-900 truncate">{a.full_name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{a.destination} • {formatShortDate(a.start_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-5">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Returning Today</h4>
                  {loading ? <Skeleton className="h-10 w-full rounded" /> : returns.length === 0 ? <p className="text-[13px] text-gray-500">No returns expected today</p> : returns.slice(0, 3).map((a, i) => (
                    <div key={i} className="flex items-center gap-3 mb-3 last:mb-0">
                      <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
                        <Plane className="w-4 h-4 text-blue-600 transform -rotate-45" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-900 truncate">{a.full_name}</p>
                        <p className="text-[11px] text-gray-500 truncate">From {a.destination}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm rounded-[16px] bg-white">
              <CardHeader className="px-5 py-4 border-b border-gray-50">
                <CardTitle className="text-[16px] font-bold text-gray-900">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-2 grid grid-cols-2 gap-2">
                {[
                  { label: "New Assignment", icon: Plane, path: "/outstation/assignment" },
                  { label: "Calendar View", icon: Calendar, path: "/outstation/calendar" },
                  { label: "Analytics", icon: Activity, path: "/outstation/analytics" },
                  { label: "Reports", icon: Map, path: "/outstation/reports" },
                ].map((action, i) => (
                  <Button key={i} variant="ghost" className="h-12 justify-start px-3 text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:text-purple-700 rounded-[12px] group transition-colors" onClick={() => navigate(action.path)}>
                    <action.icon className="w-4 h-4 mr-2 text-gray-400 group-hover:text-purple-600" /> {action.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* ROW 3: Monthly Trend (8) & Status Distribution (4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <Card className="lg:col-span-8 border-0 shadow-sm rounded-[16px] bg-white overflow-hidden">
            <CardHeader className="px-6 py-5 border-b border-gray-50 flex flex-row items-center justify-between">
              <CardTitle className="text-[18px] font-bold text-gray-900">Monthly Trend</CardTitle>
              <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 shadow-none text-[11px]">2026</Badge>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 'bold' }} />
                    <Bar dataKey="val" fill={C_PURPLE} radius={[4, 4, 0, 0]} barSize={24} name="Trips" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4 border-0 shadow-sm rounded-[16px] bg-white overflow-hidden">
            <CardHeader className="px-6 py-5 border-b border-gray-50 flex flex-row items-center justify-between">
              <CardTitle className="text-[18px] font-bold text-gray-900">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[180px] w-full relative mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} stroke="none" paddingAngle={5}>
                      {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 'bold' }} />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                  <span className="text-[28px] font-extrabold text-gray-900 leading-none">{stats.active + stats.completed + stats.upcoming}</span>
                  <span className="text-[10px] font-bold tracking-[0.1em] text-gray-400 uppercase mt-1">Total</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                {statusData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-[13px] font-semibold text-gray-700">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="flex-1">{d.name}</span>
                    <span className="text-gray-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ROW 4: Destination Map/Heatmap (6) & Department (6) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="border-0 shadow-sm rounded-[16px] bg-white">
            <CardHeader className="px-6 py-5 border-b border-gray-50 flex flex-row items-center justify-between">
              <CardTitle className="text-[18px] font-bold text-gray-900 flex items-center gap-2"><Map className="w-5 h-5 text-blue-500" /> Geographic Heatmap</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Mock Map / Heatmap implementation */}
              <div className="w-full h-[200px] bg-[#f1f5f9] rounded-[12px] border border-gray-100 flex items-center justify-center relative overflow-hidden">
                <p className="text-gray-400 text-[13px] font-bold uppercase tracking-widest absolute z-0 opacity-50">Map Visualization</p>
                {/* Mock pins */}
                <div className="absolute top-[30%] left-[20%] flex flex-col items-center animate-bounce duration-1000">
                  <div className="w-3 h-3 rounded-full bg-purple-600 shadow-[0_0_0_4px_rgba(124,58,237,0.2)]" />
                  <span className="text-[10px] font-bold text-gray-700 mt-1">KL</span>
                </div>
                <div className="absolute top-[50%] left-[40%] flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-pink-500" />
                  <span className="text-[10px] font-bold text-gray-700 mt-1">Johor</span>
                </div>
                <div className="absolute top-[20%] left-[35%] flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.2)] flex items-center justify-center"><div className="w-1.5 h-1.5 bg-white rounded-full"/></div>
                  <span className="text-[10px] font-bold text-gray-700 mt-1">Penang</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-[16px] bg-white">
            <CardHeader className="px-6 py-5 border-b border-gray-50">
              <CardTitle className="text-[18px] font-bold text-gray-900">Department Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 mt-2">
                {deptData.map((d, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-semibold text-gray-700">{d.name}</span>
                      <span className="font-bold text-gray-900">{d.value} <span className="text-gray-400 font-medium ml-1">trips</span></span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: `${(d.value / 35) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ROW 5: Recent Activity Timeline (12) */}
        <Card className="border-0 shadow-sm rounded-[16px] bg-white overflow-hidden">
          <CardHeader className="px-6 py-5 border-b border-gray-50">
            <CardTitle className="text-[18px] font-bold text-gray-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative pl-4 space-y-6 before:absolute before:inset-0 before:ml-[23px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
              {timelineData.map((item, idx) => (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-gray-100 text-gray-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    {item.type === "depart" ? <Plane className="w-3.5 h-3.5" /> : 
                     item.type === "return" ? <MapPin className="w-3.5 h-3.5" /> : 
                     item.type === "approve" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : 
                     <User className="w-3.5 h-3.5" />}
                  </div>
                  {/* Content */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white border border-gray-100 p-4 rounded-[12px] shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-purple-600 uppercase tracking-widest">{item.time}</span>
                    </div>
                    <p className="text-[14px] font-medium text-gray-700">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
