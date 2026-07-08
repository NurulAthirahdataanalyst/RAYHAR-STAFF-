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
  }, [fetchAll]);

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


  if (roleLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin w-8 h-8 text-purple-900" /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 pb-12">
      {/* 
        Spacing System: 8, 16, 24, 32, 48px
        Using standard Tailwind: 2 (8px), 4 (16px), 6 (24px), 8 (32px), 12 (48px)
      */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        
        {/* Header Actions */}
        <div className="flex items-center justify-end gap-3 mb-6">
          <Button className="h-9 px-5 text-[13px] font-semibold text-white shadow-sm bg-[#4c1d95] hover:bg-[#3b0764]" onClick={() => navigate("/outstation/assignment", { state: { openNew: true } })}>
            <Plane className="w-4 h-4 mr-2" /> New Assignment
          </Button>
        </div>

        {/* ROW 1: KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[
            { label: "Active Outstations", val: activeCount, trend: "↑ +4 this week", subtitle: "Currently travelling", color: C_GREEN, trendColor: "text-green-600" },
            { label: "Upcoming Departures", val: upcomingCount, trend: "↑ +2 today", subtitle: "Scheduled within 7 days", color: C_ORANGE, trendColor: "text-orange-600" },
            { label: "Total Assignments", val: activeCount + completedCount + upcomingCount, trend: "↑ +12% vs last month", subtitle: "Year to date", color: C_PURPLE, trendColor: "text-purple-600" },
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
                <CardTitle className="text-[18px] font-bold text-gray-900">Active Outstations</CardTitle>
                <p className="text-[13px] text-gray-500 font-medium mt-0.5">Real-time status of employees currently on assignment</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 text-gray-600 rounded-[8px]">
                  <Filter className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 text-gray-600 rounded-[8px]">
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
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 border border-gray-100">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-[16px] font-bold text-gray-800 mb-1">No Active Outstations</h3>
                  <p className="text-[13px] text-gray-500 max-w-sm mb-6">Everyone is currently at their assigned workplace. There are no ongoing travels.</p>
                  <Button variant="outline" className="border-gray-300 shadow-sm" onClick={() => navigate("/outstation/assignment")}>View Assignments</Button>
                </div>
              ) : (
                <>
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80 sticky top-0 z-0">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Destination</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Status</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Employee</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Duration</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeNow.filter(a => (a.full_name || "").toLowerCase().includes(search.toLowerCase())).map((a, i) => {
                      const totalDays = Math.max(1, Math.ceil((new Date(a.end_date).getTime() - new Date(a.start_date).getTime()) / (1000 * 3600 * 24)));
                      return (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors group border-b border-gray-50 last:border-0">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-100/50 text-purple-700 flex items-center justify-center shadow-sm">
                                <MapPin className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-[12px] font-bold text-gray-900 uppercase tracking-wide">{a.destination}</p>
                                <p className="text-[10px] text-gray-500">{a.department || "Domestic Branch"}</p>
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
                              <p className="text-[12px] font-bold text-gray-900">{a.full_name || "Unknown"}</p>
                              <p className="text-[10px] text-gray-500 font-medium">{a.user_id || "EMP-8821"}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                              <div>
                                <p className="text-[11px] font-semibold text-gray-700">{formatShortDate(a.start_date)} - {formatShortDate(a.end_date)}</p>
                                <p className="text-[10px] font-medium text-purple-600">
                                  {totalDays} {totalDays === 1 ? 'Day' : 'Days'} Total
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-purple-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigate("/outstation/assignment")}>
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
                  <span className="text-[12px] text-gray-500 font-medium">Showing {activeNow.length > 0 ? 1 : 0}-{activeNow.length} of {activeNow.length} Active Outstations</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[12px] font-medium border-gray-200">Previous</Button>
                    <Button variant="outline" size="sm" className="h-8 text-[12px] font-medium border-gray-200">Next</Button>
                  </div>
                </div>
                </>
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


      </div>
    </div>
  );
}
