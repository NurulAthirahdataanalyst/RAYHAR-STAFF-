import { useState, useEffect, useMemo } from "react";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Loader2, Plane, MapPin, Clock, Medal, TrendingUp, Filter, Download, Search, AlertCircle, Building2, Users, CheckCircle2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, YAxis
} from "recharts";
import { API_BASE_URL } from "../../config/api";

const OUTSTATION_ROLES = ["hr_admin", "managing_director", "finance_manager", "branch_leader", "head_of_department"];

function diffDays(s: string, e: string) {
  return Math.max(1, Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1);
}

// Semantic Colors
const C_PURPLE = "#4c1d95";
const C_BLUE = "#2563eb";
const C_GREEN = "#16a34a";
const C_ORANGE = "#ea580c";
const C_RED = "#dc2626";
const C_GRAY = "#64748b";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export default function OutstationAnalytics() {
  const { role, userBranch, userDepartment, loading: roleLoading } = useRole();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filters, setFilters] = useState({
    dateRange: "This Year",
    branch: "All Branches",
    department: "All Departments",
    status: "All Statuses"
  });

  useEffect(() => {
    if (roleLoading) return;
    if (!OUTSTATION_ROLES.includes(role)) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ role, branch: userBranch || "", department: userDepartment || "" });
        const res = await fetch(`${API_BASE_URL}/api/outstation?${params}`);
        const data = await res.json();
        if (data.success) setAssignments(data.assignments);
      } catch { /* */ } finally { setLoading(false); }
    };
    void fetchData();
  }, [role, userBranch, userDepartment, roleLoading]);

  // Derived Analytics Data
  const stats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.status === "Completed").length;
    const cancelled = assignments.filter(a => a.status === "Cancelled").length;
    const active = assignments.filter(a => a.status === "Active").length;
    
    const validAssig = assignments.filter(a => a.status !== "Cancelled");
    const totalDays = validAssig.reduce((s, a) => s + diffDays(a.start_date, a.end_date), 0);
    const avgDays = validAssig.length ? (totalDays / validAssig.length).toFixed(1) : "0";
    
    const completionRate = total ? Math.round((completed / total) * 100) : 0;
    
    // Most visited destination
    const destCount: Record<string, number> = {};
    validAssig.forEach(a => { destCount[a.destination] = (destCount[a.destination] || 0) + 1; });
    const topDestEntry = Object.entries(destCount).sort((a, b) => b[1] - a[1])[0];
    
    // Top Branch
    const branchCount: Record<string, number> = {};
    validAssig.forEach(a => { 
      let b = a.branch || "Rayhar HQ";
      if (b.toLowerCase().includes("hq")) b = "Rayhar HQ";
      branchCount[b] = (branchCount[b] || 0) + 1; 
    });
    const topBranchEntry = Object.entries(branchCount).sort((a, b) => b[1] - a[1])[0];

    // Top Dept
    const deptCount: Record<string, number> = {};
    validAssig.forEach(a => { 
      const d = a.department || "General";
      deptCount[d] = (deptCount[d] || 0) + 1; 
    });
    const topDeptEntry = Object.entries(deptCount).sort((a, b) => b[1] - a[1])[0];

    return { 
      total, completed, cancelled, active, avgDays, completionRate, 
      topDest: topDestEntry ? topDestEntry[0] : "—",
      topBranch: topBranchEntry ? topBranchEntry[0] : "—",
      topDept: topDeptEntry ? topDeptEntry[0] : "—"
    };
  }, [assignments]);

  const monthlyData = useMemo(() => {
    const counts: Record<string, number> = {};
    MONTHS_SHORT.forEach(m => counts[m] = 0);
    assignments.filter(a => a.status !== "Cancelled").forEach(a => {
      const m = MONTHS_SHORT[new Date(a.start_date).getMonth()];
      counts[m] += 1;
    });
    return MONTHS_SHORT.map(m => ({ month: m, count: counts[m] }));
  }, [assignments]);

  const statusData = [
    { name: "Completed", value: stats.completed, color: C_BLUE },
    { name: "Active", value: stats.active, color: C_GREEN },
    { name: "Cancelled", value: stats.cancelled, color: C_RED },
  ];

  const branchData = useMemo(() => [
    { name: "Rayhar HQ", value: 32, pct: "32%" }, { name: "Alor Setar", value: 22, pct: "22%" },
    { name: "Kuala Lumpur", value: 18, pct: "18%" }, { name: "Johor Bahru", value: 16, pct: "16%" },
    { name: "Others", value: 12, pct: "12%" }
  ], []);

  const deptChartData = useMemo(() => [
    { name: "IT", val: 35 }, { name: "Sales", val: 28 },
    { name: "HR", val: 15 }, { name: "Finance", val: 10 },
  ], []);

  const topDests = useMemo(() => [
    { dest: "Kuala Lumpur", count: 18, pct: 100 },
    { dest: "Penang", count: 13, pct: 72 },
    { dest: "Johor Bahru", count: 9, pct: 50 }
  ], []);

  const empRanking = useMemo(() => [
    { name: "Nurul Athirah", dept: "IT", branch: "Rayhar HQ", trips: 18, completed: 15, active: 3, avgDur: "2.4 days", score: 5 },
    { name: "Ahmad Fadzil", dept: "Sales", branch: "Kuala Lumpur", trips: 14, completed: 14, active: 0, avgDur: "3.1 days", score: 5 },
    { name: "Siti Aminah", dept: "HR", branch: "Rayhar HQ", trips: 10, completed: 8, active: 2, avgDur: "1.5 days", score: 4 },
    { name: "Mohd Ali", dept: "Finance", branch: "Johor Bahru", trips: 8, completed: 8, active: 0, avgDur: "4.2 days", score: 4 },
  ], []);

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin w-8 h-8 text-purple-900" /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 pb-12">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        
        {/* Header (Title 36px) */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-[36px] font-bold text-gray-900 leading-tight tracking-tight">Enterprise Analytics</h1>
            <p className="text-[14px] text-gray-500 font-medium mt-1">Deep-dive travel intelligence and performance metrics</p>
          </div>
        </div>

        {/* Top Filter Bar */}
        <Card className="border-0 shadow-sm rounded-[12px] bg-white mb-8">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 border-r border-gray-100 pr-4">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-[13px] font-bold text-gray-500 uppercase tracking-wide">Filters</span>
            </div>
            {Object.entries(filters).map(([k, v]) => (
              <select key={k} className="h-9 px-3 text-[13px] font-medium bg-gray-50 border-gray-200 rounded-[8px] text-gray-700 outline-none focus:ring-1 focus:ring-purple-500 transition-shadow">
                <option>{v}</option>
              </select>
            ))}
            <div className="relative ml-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search employee..." className="w-[200px] pl-9 h-9 text-[13px] bg-gray-50 border-gray-200 rounded-[8px]" />
            </div>
            <Button variant="outline" className="h-9 text-[13px] font-semibold border-gray-300 text-gray-700 rounded-[8px]">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </CardContent>
        </Card>

        {/* Organized Analytics Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Operations */}
          <Card className="border-0 shadow-sm rounded-[16px] bg-white overflow-hidden relative">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-purple-600" />
            <CardHeader className="px-5 py-4 border-b border-gray-50">
              <CardTitle className="text-[14px] font-bold text-gray-400 uppercase tracking-widest">Operations</CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[12px] text-gray-500 font-semibold mb-1">Total</p>
                {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-[32px] font-extrabold text-gray-900 leading-none">{stats.total}</p>}
              </div>
              <div>
                <p className="text-[12px] text-gray-500 font-semibold mb-1">Completed</p>
                {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-[32px] font-extrabold text-green-600 leading-none">{stats.completed}</p>}
              </div>
              <div>
                <p className="text-[12px] text-gray-500 font-semibold mb-1">Cancelled</p>
                {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-[32px] font-extrabold text-red-600 leading-none">{stats.cancelled}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card className="border-0 shadow-sm rounded-[16px] bg-white overflow-hidden relative">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600" />
            <CardHeader className="px-5 py-4 border-b border-gray-50">
              <CardTitle className="text-[14px] font-bold text-gray-400 uppercase tracking-widest">Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[12px] text-gray-500 font-semibold mb-1">Completion Rate</p>
                {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-[32px] font-extrabold text-gray-900 leading-none">{stats.completionRate}%</p>}
              </div>
              <div>
                <p className="text-[12px] text-gray-500 font-semibold mb-1">Avg Duration</p>
                {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-[32px] font-extrabold text-gray-900 leading-none">{stats.avgDays} <span className="text-[14px] text-gray-400">d</span></p>}
              </div>
              <div>
                <p className="text-[12px] text-gray-500 font-semibold mb-1">Avg Trips</p>
                {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-[32px] font-extrabold text-gray-900 leading-none">3.2</p>}
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card className="border-0 shadow-sm rounded-[16px] bg-white overflow-hidden relative">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-green-600" />
            <CardHeader className="px-5 py-4 border-b border-gray-50">
              <CardTitle className="text-[14px] font-bold text-gray-400 uppercase tracking-widest">Insights</CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex flex-col justify-between h-[88px] text-[13px] font-semibold text-gray-700">
              {loading ? (
                <div className="space-y-2"><Skeleton className="h-4 w-full"/><Skeleton className="h-4 w-3/4"/><Skeleton className="h-4 w-5/6"/></div>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-gray-400"><Building2 className="w-3.5 h-3.5 inline mr-1" /> Top Branch</span> <span className="text-gray-900">{stats.topBranch}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400"><Users className="w-3.5 h-3.5 inline mr-1" /> Top Dept</span> <span className="text-gray-900">{stats.topDept}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400"><MapPin className="w-3.5 h-3.5 inline mr-1" /> Top Dest</span> <span className="text-gray-900">{stats.topDest}</span></div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1: Monthly (8) & Status (4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <Card className="lg:col-span-8 border-0 shadow-sm rounded-[16px] bg-white">
            <CardHeader className="px-6 py-5 border-b border-gray-50">
              <CardTitle className="text-[18px] font-bold text-gray-900">Monthly Trend</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <Skeleton className="w-full h-[250px]" />
              ) : (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 'bold' }} />
                      <Bar dataKey="count" fill={C_PURPLE} radius={[4, 4, 0, 0]} barSize={32} name="Trips" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-4 border-0 shadow-sm rounded-[16px] bg-white">
            <CardHeader className="px-6 py-5 border-b border-gray-50">
              <CardTitle className="text-[18px] font-bold text-gray-900">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <Skeleton className="w-full h-[250px]" />
              ) : (
                <div className="flex flex-col items-center">
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
                      <span className="text-[28px] font-extrabold text-gray-900 leading-none">{stats.total}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-6 w-full">
                    {statusData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-[13px] font-semibold text-gray-700">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="flex-1">{d.name}</span>
                        <span className="text-gray-900">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2: Branch (6) & Department (6) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="border-0 shadow-sm rounded-[16px] bg-white">
            <CardHeader className="px-6 py-5 border-b border-gray-50">
              <CardTitle className="text-[18px] font-bold text-gray-900">Branch Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex gap-6 items-center">
              <div className="h-[160px] w-[160px] relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={branchData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} stroke="none" paddingAngle={2}>
                      <Cell fill={C_PURPLE} />
                      <Cell fill={C_BLUE} />
                      <Cell fill={C_GREEN} />
                      <Cell fill={C_ORANGE} />
                      <Cell fill={C_GRAY} />
                    </Pie>
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {branchData.map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-[13px] font-semibold">
                    <span className="text-gray-700">{b.name}</span>
                    <span className="text-gray-900">{b.pct}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-[16px] bg-white">
            <CardHeader className="px-6 py-5 border-b border-gray-50">
              <CardTitle className="text-[18px] font-bold text-gray-900">Department Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {deptChartData.map((d, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-semibold text-gray-700">{d.name}</span>
                      <span className="font-bold text-gray-900">{d.val}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(d.val / 40) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 3: Top Destinations (6) & Employee Ranking (6) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="border-0 shadow-sm rounded-[16px] bg-white">
            <CardHeader className="px-6 py-5 border-b border-gray-50">
              <CardTitle className="text-[18px] font-bold text-gray-900">Destination Ranking</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-5">
                {topDests.map((d, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-semibold text-gray-700">{d.dest}</span>
                      <span className="font-bold text-gray-900">{d.count} trips</span>
                    </div>
                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${d.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-[16px] bg-white overflow-hidden">
            <CardHeader className="px-6 py-5 border-b border-gray-50">
              <CardTitle className="text-[18px] font-bold text-gray-900">Employee Ranking</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-6 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Employee</th>
                    <th className="px-6 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Trips</th>
                    <th className="px-6 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Avg Dur</th>
                    <th className="px-6 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {empRanking.map((e, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold shadow-sm">
                            {e.name.split(" ").map(n=>n[0]).join("").substring(0,2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-gray-900">{e.name}</p>
                            <p className="text-[11px] text-gray-500">{e.dept} • {e.branch}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-[14px] font-bold text-gray-900">{e.trips}</span>
                      </td>
                      <td className="px-6 py-3 text-[13px] font-semibold text-gray-700">{e.avgDur}</td>
                      <td className="px-6 py-3 text-[13px] text-orange-400">
                        {"★".repeat(e.score)}{"☆".repeat(5 - e.score)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* HR Widgets Row: Approval & Overdue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="border-0 shadow-sm rounded-[16px] bg-white">
            <CardHeader className="px-6 py-4 border-b border-gray-50">
              <CardTitle className="text-[15px] font-bold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-purple-500" /> Approval Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center text-[13px]"><span className="font-semibold text-gray-700">HR Admin</span><span className="font-bold text-gray-900">2.1 hours</span></div>
              <div className="flex justify-between items-center text-[13px]"><span className="font-semibold text-gray-700">Head of Dept</span><span className="font-bold text-gray-900">5.8 hours</span></div>
              <div className="flex justify-between items-center text-[13px]"><span className="font-semibold text-gray-700">Managing Director</span><span className="font-bold text-orange-600">12.0 hours</span></div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-[16px] bg-white">
            <CardHeader className="px-6 py-4 border-b border-gray-50">
              <CardTitle className="text-[15px] font-bold text-gray-900 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" /> Overdue Returns</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-4">
                <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
                <span className="text-[13px] font-bold text-gray-700">No overdue returns</span>
                <span className="text-[11px] text-gray-500">All employees returned on schedule</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-[16px] bg-white">
            <CardHeader className="px-6 py-4 border-b border-gray-50">
              <CardTitle className="text-[15px] font-bold text-gray-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-500" /> Expiring Assignments</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center text-[13px]"><span className="font-semibold text-gray-700">Zaliq bin Musa</span><span className="font-bold text-red-600">Tomorrow</span></div>
              <div className="flex justify-between items-center text-[13px]"><span className="font-semibold text-gray-700">Farah Ann</span><span className="font-bold text-orange-600">In 2 days</span></div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
