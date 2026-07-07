import { useState, useEffect, useMemo } from "react";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plane, MapPin, TrendingUp, Users, BarChart2, PieChart } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend
} from "recharts";
import { API_BASE_URL } from "../../config/api";

const PRIMARY_COLOR = "#0284c7"; // Power BI style sky-600
const OUTSTATION_ROLES = ["hr_admin", "managing_director", "finance_manager", "branch_leader", "head_of_department"];

function diffDays(s: string, e: string) {
  return Math.max(1, Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1);
}

const PIE_COLORS = ["#118ab2", "#06d6a0", "#ffd166", "#ef476f", "#073b4c", "#118ab2", "#06d6a0", "#ffd166"];
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
    assignments.forEach(a => { 
      const shortName = a.full_name.split(" ").slice(0, 2).join(" ");
      let b = a.branch || "Rayhar HQ";
      if (b.toLowerCase().includes("hq")) b = "Rayhar HQ";
      const key = `${shortName}-${b}`;
      travelCount[key] = (travelCount[key] || 0) + 1; 
    });
    const topTraveler = Object.entries(travelCount).sort((a, b) => b[1] - a[1])[0];

    // Most visited destination
    const destCount: Record<string, number> = {};
    assignments.forEach(a => { destCount[a.destination] = (destCount[a.destination] || 0) + 1; });
    const topDest = Object.entries(destCount).sort((a, b) => b[1] - a[1])[0];

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
      if (b.toLowerCase().includes("hq")) b = "Rayhar HQ";
      counts[b] = (counts[b] || 0) + 1; 
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [assignments]);

  // Top destinations
  const topDests = useMemo(() => {
    const counts: Record<string, number> = {};
    assignments.forEach(a => { counts[a.destination] = (counts[a.destination] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([dest, count]) => ({ dest, count }));
  }, [assignments]);

  // Employee ranking
  const empRanking = useMemo(() => {
    const data: Record<string, { trips: number; days: number }> = {};
    assignments.forEach(a => {
      if (!data[a.full_name]) data[a.full_name] = { trips: 0, days: 0 };
      data[a.full_name].trips += 1;
      data[a.full_name].days += diffDays(a.start_date, a.end_date);
    });
    return Object.entries(data).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.trips - a.trips).slice(0, 10);
  }, [assignments]);

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-500" /></div>;

  const kpis = [
    { label: "Total Outstations", value: stats.total, icon: Plane, color: "text-sky-600", bg: "bg-sky-50 border-sky-200" },
    { label: "Average Duration", value: `${stats.avgDays} days`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
    { label: "Top Traveler", value: stats.topTraveler ? stats.topTraveler[0].toUpperCase() : "—", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
    { label: "Top Destination", value: stats.topDest ? stats.topDest[0] : "—", icon: MapPin, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 pt-2 pb-8">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className={`border ${k.bg} shadow-sm`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{k.label}</p>
                  <p className={`text-xl font-black ${k.color} mt-1 leading-tight`}>{loading ? "—" : k.value}</p>
                </div>
                <Icon className={`w-5 h-5 ${k.color} opacity-60`} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly Bar Chart */}
        <Card className="lg:col-span-2 border border-gray-200/80 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-sky-600" /> Monthly Outstations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin w-6 h-6 text-sky-500" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, borderColor: "#bae6fd" }} />
                  <Bar dataKey="count" fill={PRIMARY_COLOR} radius={[4, 4, 0, 0]} name="Outstations" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Branch Pie */}
        <Card className="border border-gray-200/80 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-500" /> By Branch
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>
            ) : branchData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-xs font-bold">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPie>
                  <Pie data={branchData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name.length > 10 ? name.slice(0, 10) + "…" : name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {branchData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                </RechartsPie>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Destinations */}
        <Card className="border border-gray-200/80 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-600" /> Top Destinations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {loading ? (
              <div className="h-32 flex items-center justify-center"><Loader2 className="animate-spin w-5 h-5 text-sky-400" /></div>
            ) : topDests.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-gray-400 text-xs font-bold">No data</div>
            ) : (
              topDests.map((d, i) => (
                <div key={d.dest} className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-gray-400 w-5 text-center">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-bold text-gray-700">{d.dest}</span>
                      <span className="text-[10px] font-black text-sky-600">{d.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.round((d.count / (topDests[0]?.count || 1)) * 100)}%`, background: PRIMARY_COLOR }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Employee Ranking */}
        <Card className="border border-gray-200/80 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" /> Employee Ranking
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin w-6 h-6 text-indigo-400" /></div>
            ) : empRanking.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-xs font-bold">No data</div>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-slate-50/60">
                    <th className="px-4 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase">#</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase">Employee</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-black text-gray-400 uppercase">Trips</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-black text-gray-400 uppercase">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {empRanking.map((e, i) => (
                    <tr key={e.name} className="border-b border-gray-50 hover:bg-sky-50/20 transition-colors">
                      <td className="px-4 py-2.5 font-black text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-200 to-sky-400 flex items-center justify-center text-[8px] font-black text-sky-800">
                            {e.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-800 truncate max-w-[120px]">{e.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center font-black text-sky-600">{e.trips}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-gray-600">{e.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
