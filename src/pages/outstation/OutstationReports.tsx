import { useState, useEffect, useMemo } from "react";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plane, Download, Search, Filter, MapPin, Calendar } from "lucide-react";
import { API_BASE_URL } from "../../config/api";

const OUTSTATION_ROLES = ["hr_admin", "managing_director", "finance_manager", "branch_leader", "head_of_department"];

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}

function diffDays(s: string, e: string) {
  return Math.max(1, Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1);
}

function statusBadge(status: string) {
  switch (status) {
    case "Active":    return <Badge className="bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30 font-bold text-[10px] whitespace-nowrap">🟣 Active</Badge>;
    case "Upcoming":  return <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-bold text-[10px] whitespace-nowrap">🟡 Upcoming</Badge>;
    case "Completed": return <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 font-bold text-[10px] whitespace-nowrap">🔵 Completed</Badge>;
    case "Cancelled": return <Badge className="bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500/30 font-bold text-[10px] whitespace-nowrap">⬜ Cancelled</Badge>;
    default:          return <Badge variant="outline" className="whitespace-nowrap">{status}</Badge>;
  }
}

type Assignment = {
  id: number;
  full_name: string;
  department?: string;
  branch?: string;
  destination: string;
  purpose?: string;
  project?: string;
  start_date: string;
  end_date: string;
  status: string;
  assigned_by_name?: string;
  assigned_at?: string;
};

export default function OutstationReports() {
  const { role, userBranch, userDepartment, loading: roleLoading } = useRole();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterBranch, setFilterBranch] = useState("All");
  const [filterDept, setFilterDept] = useState("All");

  useEffect(() => {
    if (roleLoading) return;
    if (!OUTSTATION_ROLES.includes(role)) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ role, branch: userBranch || "", department: userDepartment || "" });
        const res = await fetch(`${API_BASE_URL}/api/outstation?${params}`);
        const data = await res.json();
        if (data.success) setAssignments(data.assignments || []);
      } catch { /* */ } finally { setLoading(false); }
    };
    void fetchData();
  }, [role, userBranch, userDepartment, roleLoading]);

  const departments = useMemo(() => ["All", ...Array.from(new Set(assignments.map(a => a.department || "").filter(Boolean))).sort()], [assignments]);
  const branches = useMemo(() => ["All", ...Array.from(new Set(assignments.map(a => a.branch || "").filter(Boolean))).sort()], [assignments]);

  const filtered = useMemo(() => {
    return assignments.filter(a => {
      if (filterStatus !== "All" && a.status !== filterStatus) return false;
      if (filterBranch !== "All" && a.branch !== filterBranch) return false;
      if (filterDept !== "All" && a.department !== filterDept) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        return (a.full_name || "").toLowerCase().includes(q) || (a.destination || "").toLowerCase().includes(q) || (a.purpose || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [assignments, filterStatus, filterDept, filterSearch]);

  const exportCSV = () => {
    const headers = ["Employee","Department","Branch","Destination","Purpose","Project","Start Date","End Date","Days","Status","Assigned By"];
    const rows = filtered.map(a => [
      a.full_name, a.department || "", a.branch || "",
      a.destination, a.purpose || "", a.project || "",
      a.start_date?.slice(0,10), a.end_date?.slice(0,10),
      diffDays(a.start_date, a.end_date),
      a.status, a.assigned_by_name || ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `outstation_report_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-500" /></div>;

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 pt-2 pb-8">

      {/* Filters */}
      <Card className="border border-gray-200 dark:border-gray-500/30/80 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input placeholder="Search employee, destination…" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="pl-8 h-8 text-xs w-56" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Status">{filterStatus === "All" ? "All Status" : filterStatus}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {["All","Active","Upcoming","Completed","Cancelled"].map(s => <SelectItem key={s} value={s}>{s === "All" ? "All Status" : s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Branch">{filterBranch === "All" ? "All Branch" : filterBranch}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {branches.map(b => <SelectItem key={b} value={b}>{b === "All" ? "All Branch" : b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Department">{filterDept === "All" ? "All Department" : filterDept}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => <SelectItem key={d} value={d}>{d === "All" ? "All Department" : d}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-[10px] text-gray-400 font-bold">{filtered.length} records</span>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-gray-200 dark:border-gray-500/30/80 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-slate-800 pb-3">
          <CardTitle className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
            <Plane className="w-4 h-4 text-pink-500" />
            Outstation Report
            <Badge className="bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30 text-[10px] font-black">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Plane className="w-10 h-10 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">No records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800 bg-slate-50/60">
                    {["#","Employee","Department","Branch","Destination","Event","Start","End","Days","Status","Assigned By"].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-pink-50/20 transition-colors">
                      <td className="px-3 py-3 text-gray-400 font-bold text-[10px]">{i + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-200 to-pink-400 flex items-center justify-center text-[9px] font-black text-pink-800 shrink-0">
                            {(a.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-800 dark:text-gray-100">{a.full_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{a.department || "—"}</td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{a.branch || "—"}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 font-semibold text-gray-800 dark:text-gray-100">
                          <MapPin className="w-3 h-3 text-pink-400 shrink-0" />{a.destination}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 max-w-[200px]">
                        {a.purpose && a.purpose !== '-' && <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 whitespace-normal break-words leading-tight">{a.purpose}</p>}
                        {a.project && a.project !== '-' && <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 whitespace-normal break-words leading-tight mt-0.5">{a.project}</p>}
                        {(!a.purpose || a.purpose === '-') && (!a.project || a.project === '-') && <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(a.start_date)}</td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(a.end_date)}</td>
                      <td className="px-3 py-3 text-center font-black text-pink-600">{diffDays(a.start_date, a.end_date)}</td>
                      <td className="px-3 py-3">{statusBadge(a.status)}</td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{a.assigned_by_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Summary Cards */}
          {!loading && filtered.length > 0 && (
            <div className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: "Total Records", value: filtered.length, color: "text-gray-800 dark:text-gray-100" },
                  { label: "Total Days",    value: Object.values(filtered.reduce((acc, a) => { 
                      const key = a.destination + "_" + a.start_date + "_" + a.end_date; 
                      if (!acc[key]) acc[key] = diffDays(a.start_date, a.end_date); 
                      return acc; 
                    }, {} as Record<string, number>)).reduce((sum, d) => sum + (d as number), 0), color: "text-pink-600" },
                  { label: "Active Now",    value: filtered.filter(a => a.status === "Active").length, color: "text-pink-600" },
                  { label: "Upcoming Event",value: filtered.filter(a => a.status === "Upcoming").length, color: "text-amber-500" },
                  { label: "Completed",     value: filtered.filter(a => a.status === "Completed").length, color: "text-blue-600" },
                ].map(s => (
                  <div key={s.label} className="bg-white dark:bg-card border border-gray-200 dark:border-gray-500/30 shadow-sm rounded-lg p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{s.label}</p>
                    <p className={`text-xl font-black ${s.color} mt-1`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


