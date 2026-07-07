import { useState, useEffect, useMemo } from "react";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plane, MapPin, Clock, Medal, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell
} from "recharts";
import { API_BASE_URL } from "../../config/api";

const OUTSTATION_ROLES = ["hr_admin", "managing_director", "finance_manager", "branch_leader", "head_of_department"];

function diffDays(s: string, e: string) {
  return Math.max(1, Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1);
}

const COLOR_PURPLE = "#4c1d95"; // violet-900
const COLOR_BLUE = "#0284c7";   // sky-600
const COLOR_GREEN = "#16a34a";  // green-600
const COLOR_CYAN = "#0891b2";   // cyan-600
const COLOR_GRAY = "#64748b";   // slate-500

const PIE_COLORS = [COLOR_PURPLE, COLOR_BLUE, COLOR_GREEN, "#f59e0b", "#ec4899", "#8b5cf6"];
const RANK_COLORS = [COLOR_PURPLE, COLOR_BLUE, COLOR_GRAY, COLOR_GRAY, COLOR_GRAY, COLOR_GRAY, COLOR_GRAY, COLOR_GRAY, COLOR_GRAY, COLOR_GRAY];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type Assignment = {
  id: number;
  full_name: string;
  department?: string;
  branch?: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: string;
};

export default function OutstationAnalytics() {
  const { role, userBranch, userDepartment, loading: roleLoading } = useRole();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roleLoading) return;
    if (!OUTSTATION_ROLES.includes(role)) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ role, branch: userBranch || "", department: userDepartment || "" });
        const res = await fetch(`${API_BASE_URL}/api/outstation?${params}`);
        const data = await res.json();
        if (data.success) setAssignments(data.assignments.filter((a: Assignment) => a.status !== "Cancelled"));
      } catch { /* */ } finally { setLoading(false); }
    };
    void fetchData();
  }, [role, userBranch, userDepartment, roleLoading]);

  const stats = useMemo(() => {
    const total = assignments.length;
    const totalDays = assignments.reduce((s, a) => s + diffDays(a.start_date, a.end_date), 0);
    const avgDaysRaw = total ? (totalDays / total) : 0;
    const avgDays = Number.isInteger(avgDaysRaw) ? avgDaysRaw.toString() : avgDaysRaw.toFixed(1);

    // Most frequent traveler
    const travelCount: Record<string, number> = {};
    const travelBranch: Record<string, string> = {};
    assignments.forEach(a => { 
      const name = a.full_name;
      let b = a.branch || "Rayhar HQ";
      if (b.toLowerCase().includes("hq")) b = "Rayhar HQ";
      travelCount[name] = (travelCount[name] || 0) + 1; 
      travelBranch[name] = b;
    });
    const topTravelerEntry = Object.entries(travelCount).sort((a, b) => b[1] - a[1])[0];
    const topTraveler = topTravelerEntry ? [topTravelerEntry[0], travelBranch[topTravelerEntry[0]]] : null;

    // Most visited destination
    const destCount: Record<string, number> = {};
    assignments.forEach(a => { destCount[a.destination] = (destCount[a.destination] || 0) + 1; });
    const topDestEntry = Object.entries(destCount).sort((a, b) => b[1] - a[1])[0];
    const topDest = topDestEntry ? [topDestEntry[0]] : null;

    return { total, totalDays, avgDays, topTraveler, topDest };
  }, [assignments]);

  // Monthly bar chart
  const monthlyData = useMemo(() => {
    const counts: Record<string, number> = {};
    assignments.forEach(a => {
      const m = MONTHS_SHORT[new Date(a.start_date).getMonth()];
      counts[m] = (counts[m] || 0) + 1;
    });
    return MONTHS_SHORT.map(m => ({ month: m, count: counts[m] || 0 }));
  }, [assignments]);

  // Branch pie chart
  const branchData = useMemo(() => {
    const counts: Record<string, number> = {};
    assignments.forEach(a => { 
      let b = a.branch || "Rayhar HQ";
      if (b.toLowerCase().includes("hq") || b.toLowerCase().includes("headquarters")) b = "Headquarters";
      counts[b] = (counts[b] || 0) + 1; 
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [assignments]);

  // Top destinations
  const topDests = useMemo(() => {
    const counts: Record<string, number> = {};
    assignments.forEach(a => { counts[a.destination] = (counts[a.destination] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([dest, count]) => ({ dest, count }));
  }, [assignments]);

  // Employee ranking
  const empRanking = useMemo(() => {
    const data: Record<string, { trips: number; days: number; status: string }> = {};
    const today = new Date();
    today.setHours(0,0,0,0);

    assignments.forEach(a => {
      if (!data[a.full_name]) data[a.full_name] = { trips: 0, days: 0, status: "OFFSITE" };
      data[a.full_name].trips += 1;
      data[a.full_name].days += diffDays(a.start_date, a.end_date);
      
      const s = new Date(a.start_date); s.setHours(0,0,0,0);
      const e = new Date(a.end_date); e.setHours(0,0,0,0);
      if (today >= s && today <= e) data[a.full_name].status = "ACTIVE";
    });
    return Object.entries(data).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.trips - a.trips).slice(0, 5);
  }, [assignments]);

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-purple-900" /></div>;

  const kpis = [
    { label: "TOTAL OUTSTATIONS", value: stats.total, icon: Plane, color: "text-purple-900", border: "border-l-[4px] border-l-purple-900", sub: "+12% from last month", isTrend: true },
    { label: "AVG. DURATION", value: `${stats.avgDays} Days`, icon: Clock, color: "text-blue-600", border: "border-l-[4px] border-l-blue-600", sub: "Consistent since Q1", isTrend: false },
    { label: "TOP TRAVELER", value: stats.topTraveler ? stats.topTraveler[0].split(" ").slice(0, 2).join(" ").toUpperCase() : "—", icon: Medal, color: "text-purple-800", border: "border-l-[4px] border-l-green-500", sub: stats.topTraveler ? stats.topTraveler[1] : "—", isTrend: false },
    { label: "TOP DESTINATION", value: stats.topDest ? stats.topDest[0].toUpperCase() : "—", icon: MapPin, color: "text-blue-600", border: "border-l-[4px] border-l-cyan-500", sub: "HQ Distribution Center", isTrend: false },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 pt-2 pb-8">
      {/* Header Titles */}
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-purple-950">Analytics Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Monitoring travel efficiency and employee outstation trends.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className={`border-0 shadow-sm ${k.border} rounded-md bg-white`}>
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{k.label}</p>
                  <Icon className={`w-4 h-4 ${k.color} opacity-60`} />
                </div>
                <div>
                  <p className={`text-3xl font-bold ${k.color} leading-tight mb-2`}>{loading ? "—" : k.value}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                    {k.isTrend && <TrendingUp className="w-3 h-3 text-gray-400" />}
                    {k.sub}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly Bar Chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm rounded-xl bg-white">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-600">Monthly Outstations</CardTitle>
            <div className="bg-purple-50 text-purple-900 text-xs font-semibold px-3 py-1 rounded-sm">
              Year 2024
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            {loading ? (
              <div className="h-56 flex items-center justify-center"><Loader2 className="animate-spin w-6 h-6 text-purple-400" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Bar dataKey="count" fill={COLOR_PURPLE} radius={[2, 2, 0, 0]} name="Outstations" barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Branch Donut Pie */}
        <Card className="border-0 shadow-sm rounded-xl bg-white">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold text-gray-600">By Branch</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center">
            {loading ? (
              <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin w-6 h-6 text-purple-400" /></div>
            ) : branchData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-xs font-bold">No data</div>
            ) : (
              <>
                <div className="relative h-48 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie 
                        data={branchData} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={55} 
                        outerRadius={85} 
                        stroke="none"
                        paddingAngle={3}
                      >
                        {branchData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                    <span className="text-3xl font-bold text-gray-900 leading-none">{stats.total}</span>
                    <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mt-1">Total</span>
                  </div>
                </div>
                <div className="w-full mt-6 space-y-3 px-4">
                  {branchData.slice(0,3).map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 text-gray-700">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                        <span className="font-bold flex items-center gap-2">
                          {d.name}
                          {i === 0 && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase tracking-wider">Highest</span>}
                        </span>
                      </div>
                      <div className="text-gray-900 font-bold">
                        {d.value} <span className="text-gray-400 font-medium ml-1">({Math.round((d.value / stats.total) * 100)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Destinations */}
        <Card className="border-0 shadow-sm rounded-xl bg-white">
          <CardHeader className="pb-4 border-b border-gray-50">
            <CardTitle className="text-sm font-semibold text-gray-600">Top Destinations</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-7">
            {loading ? (
              <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin w-5 h-5 text-purple-400" /></div>
            ) : topDests.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-400 text-xs font-bold">No data</div>
            ) : (
              topDests.map((d, i) => {
                const color = PIE_COLORS[i % PIE_COLORS.length];
                const pct = Math.round((d.count / stats.total) * 100) || 0;
                return (
                  <div key={d.dest} className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{d.dest}</span>
                      <span className="font-semibold text-xs" style={{ color }}>{d.count} Trips ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Employee Ranking */}
        <Card className="border-0 shadow-sm rounded-xl bg-white">
          <CardHeader className="pb-4 border-b border-gray-50">
            <CardTitle className="text-sm font-semibold text-gray-600">Employee Ranking</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin w-6 h-6 text-purple-400" /></div>
            ) : empRanking.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-xs font-bold">No data</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-50/50 text-gray-500 font-bold tracking-wider text-[9px]">
                      <th className="px-6 py-4 uppercase">Rank</th>
                      <th className="px-6 py-4 uppercase">Employee</th>
                      <th className="px-6 py-4 uppercase">Trips</th>
                      <th className="px-6 py-4 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {empRanking.map((e, i) => {
                      const rankColor = RANK_COLORS[i] || COLOR_GRAY;
                      const num = (i + 1).toString().padStart(2, '0');
                      const initials = e.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                      
                      return (
                        <tr key={e.name} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3 font-medium text-sm" style={{ color: rankColor }}>{num}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm"
                                style={{ backgroundColor: rankColor }}
                              >
                                {initials}
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">{e.name.split(" ").slice(0,2).join(" ")}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-700">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{e.trips}</span>
                              <span className="text-[10px] text-gray-400">Trips</span>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            {e.status === "ACTIVE" ? (
                              <Badge className="bg-[#4ade80] hover:bg-[#4ade80]/90 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-none border-0">
                                ACTIVE
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-200 hover:bg-gray-200 text-gray-600 text-[9px] font-bold px-2 py-0.5 rounded shadow-none border-0">
                                OFFSITE
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="p-3 text-center border-t border-gray-50">
                  <button className="text-[11px] font-semibold text-purple-700 hover:text-purple-800 transition-colors">
                    View All Rankings
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
