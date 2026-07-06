import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plane, TrendingUp, ArrowRight, Calendar, Users, MapPin, RefreshCw, Clock } from "lucide-react";
import { API_BASE_URL } from "../../config/api";

const OUTSTATION_ROLES = ["hr_admin", "managing_director", "finance_manager", "branch_leader", "head_of_department"];

const PINK = "#EC4899";

function statusBadge(status: string) {
  switch (status) {
    case "Active":    return <Badge className="bg-pink-100 text-pink-700 border border-pink-200 font-bold text-[10px]">🟣 Active</Badge>;
    case "Upcoming":  return <Badge className="bg-amber-100 text-amber-700 border border-amber-200 font-bold text-[10px]">🟡 Upcoming</Badge>;
    case "Completed": return <Badge className="bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[10px]">🔵 Completed</Badge>;
    case "Cancelled": return <Badge className="bg-gray-100 text-gray-600 border border-gray-200 font-bold text-[10px]">⬜ Cancelled</Badge>;
    default:          return <Badge variant="outline">{status}</Badge>;
  }
}

function fmtDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}

export default function OutstationDashboard() {
  const { role, userBranch, userDepartment, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ active: 0, upcoming: 0, completed: 0, cancelled: 0, todayDepartures: 0, todayReturns: 0 });
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      console.error("OutstationDashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchAll(); }, [role, userBranch, userDepartment]);

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-500" /></div>;

  const activeNow = assignments.filter(a => a.status === "Active");
  const upcoming  = assignments.filter(a => a.status === "Upcoming").slice(0, 8);

  const kpis = [
    { label: "Active Outstations", value: stats.active,          color: "bg-pink-50 border-pink-200",    textColor: "text-pink-600",   icon: Plane },
    { label: "Today's Departures", value: stats.todayDepartures, color: "bg-amber-50 border-amber-200",  textColor: "text-amber-600",  icon: TrendingUp },
    { label: "Today's Returns",    value: stats.todayReturns,    color: "bg-blue-50 border-blue-200",    textColor: "text-blue-600",   icon: Calendar },
    { label: "Upcoming",           value: stats.upcoming,        color: "bg-purple-50 border-purple-200",textColor: "text-purple-600", icon: Clock },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 pt-2 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl shadow-sm" style={{ background: `linear-gradient(135deg, ${PINK}, #f9a8d4)` }}>
            <Plane className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-[15px] font-black text-gray-800 uppercase tracking-wide">Outstation Overview</h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Real-time company outstation status</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="h-8 text-xs gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" style={{ background: PINK }} onClick={() => navigate("/outstation/assignment")}>
            <Plane className="w-3.5 h-3.5" /> New Assignment
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className={`border ${kpi.color} shadow-sm hover:shadow-md transition-shadow`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{kpi.label}</p>
                  <p className={`text-3xl font-black ${kpi.textColor} leading-none mt-1`}>
                    {loading ? "—" : kpi.value}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${kpi.color}`}>
                  <Icon className={`w-5 h-5 ${kpi.textColor}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Active Outstation Table */}
        <Card className="lg:col-span-2 border border-gray-200/80 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                Active Outstations
                <Badge className="bg-pink-100 text-pink-700 font-black text-[10px] border border-pink-200 ml-1">{activeNow.length}</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate("/outstation/assignment")}>
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin w-6 h-6 text-pink-400" /></div>
            ) : activeNow.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Plane className="w-8 h-8 opacity-30" />
                <p className="text-[10px] font-black uppercase tracking-widest">No active outstations today</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-slate-50/60">
                      <th className="px-4 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Destination</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Start</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">End</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeNow.map((a) => (
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-pink-50/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-200 to-pink-400 flex items-center justify-center text-[9px] font-black text-pink-800 shrink-0">
                              {(a.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-800 truncate max-w-[120px]">{a.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{a.department || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-gray-700 font-semibold">
                            <MapPin className="w-3 h-3 text-pink-400 shrink-0" />
                            {a.destination}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(a.start_date)}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(a.end_date)}</td>
                        <td className="px-4 py-3">{statusBadge(a.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel */}
        <div className="flex flex-col gap-4">
          {/* Upcoming */}
          <Card className="border border-gray-200/80 shadow-sm flex-1">
            <CardHeader className="border-b border-gray-100 pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Upcoming
                <Badge className="bg-amber-100 text-amber-700 font-black text-[10px] border border-amber-200 ml-1">{stats.upcoming}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-2">
              {loading ? (
                <div className="h-20 flex items-center justify-center"><Loader2 className="animate-spin w-5 h-5 text-amber-400" /></div>
              ) : upcoming.length === 0 ? (
                <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-4">No upcoming outstations</p>
              ) : (
                upcoming.map(a => (
                  <div key={a.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-amber-50/50 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[9px] font-black text-amber-700 shrink-0">
                      {(a.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-gray-800 truncate">{a.full_name}</p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1"><MapPin className="w-2.5 h-2.5 text-amber-400" />{a.destination}</p>
                    </div>
                    <span className="text-[9px] font-bold text-amber-600 whitespace-nowrap">{fmtDate(a.start_date)}</span>
                  </div>
                ))
              )}
              <Button variant="ghost" size="sm" className="w-full text-xs gap-1 mt-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => navigate("/outstation/assignment")}>
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border border-gray-200/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Quick Stats</p>
              <div className="space-y-2">
                {[
                  { label: "Total Active", value: stats.active, color: "text-pink-600" },
                  { label: "Completed",    value: stats.completed, color: "text-blue-600" },
                  { label: "Cancelled",    value: stats.cancelled, color: "text-gray-500" },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-600">{s.label}</span>
                    <span className={`text-[15px] font-black ${s.color}`}>{loading ? "—" : s.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
