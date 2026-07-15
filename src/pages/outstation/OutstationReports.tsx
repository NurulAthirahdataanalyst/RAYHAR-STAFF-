import { useState, useEffect, useMemo } from "react";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plane, Download, Search, Filter, MapPin, ArrowLeft } from "lucide-react";
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

type EventGroup = {
  eventName: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  assignments: Assignment[];
};

export default function OutstationReports() {
  const { role, userBranch, userDepartment, loading: roleLoading } = useRole();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterBranch, setFilterBranch] = useState("All");
  const [filterDept, setFilterDept] = useState("All");

  const [selectedEventName, setSelectedEventName] = useState<string | null>(null);

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

  // Group into events
  const eventGroups = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    const groups: Record<string, EventGroup> = {};
    assignments.forEach(a => {
      const eventName = (a.project && a.project !== '-') ? a.project : (a.purpose && a.purpose !== '-') ? a.purpose : 'General';
      if (!groups[eventName]) {
        groups[eventName] = {
          eventName,
          destination: a.destination,
          startDate: a.start_date,
          endDate: a.end_date,
          totalDays: 0,
          status: "Upcoming",
          assignments: []
        };
      }
      
      const g = groups[eventName];
      g.assignments.push(a);
      
      // Expand dates
      if (!g.startDate || a.start_date < g.startDate) g.startDate = a.start_date;
      if (!g.endDate || a.end_date > g.endDate) g.endDate = a.end_date;
      
      // Use destination from the latest assignment or most frequent
      if (a.destination) g.destination = a.destination;
    });

    return Object.values(groups).map(g => {
      const s = g.startDate?.slice(0, 10) || today;
      const e = g.endDate?.slice(0, 10) || today;
      g.totalDays = diffDays(s, e);
      
      if (today > e) g.status = "Completed";
      else if (today >= s && today <= e) g.status = "Active";
      else g.status = "Upcoming";

      return g;
    });
  }, [assignments]);

  const departments = useMemo(() => ["All", ...Array.from(new Set(assignments.map(a => a.department || "").filter(Boolean))).sort()], [assignments]);
  const branches = useMemo(() => ["All", ...Array.from(new Set(assignments.map(a => a.branch || "").filter(Boolean))).sort()], [assignments]);

  const filteredEvents = useMemo(() => {
    return eventGroups.filter(e => {
      if (filterStatus !== "All" && e.status !== filterStatus) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        return (e.eventName || "").toLowerCase().includes(q) || (e.destination || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [eventGroups, filterStatus, filterSearch]);

  const selectedEvent = useMemo(() => {
    return eventGroups.find(e => e.eventName === selectedEventName) || null;
  }, [eventGroups, selectedEventName]);

  const filteredAssignments = useMemo(() => {
    if (!selectedEvent) return [];
    return selectedEvent.assignments.filter(a => {
      if (filterBranch !== "All" && a.branch !== filterBranch) return false;
      if (filterDept !== "All" && a.department !== filterDept) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        return (a.full_name || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [selectedEvent, filterBranch, filterDept, filterSearch]);

  const exportCSV = () => {
    if (selectedEvent) {
      const headers = ["Employee","Department","Branch","Destination","Purpose","Project","Start Date","End Date","Days","Status","Assigned By"];
      const rows = filteredAssignments.map(a => [
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
      link.download = `event_${selectedEvent.eventName}_${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ["Event Name","Destination","Start Date","End Date","Days","Status","Total Staff"];
      const rows = filteredEvents.map(e => [
        e.eventName, e.destination || "",
        e.startDate?.slice(0,10), e.endDate?.slice(0,10),
        e.totalDays, e.status, e.assignments.length
      ]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `events_report_${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-500" /></div>;

  const totalEventsCount = eventGroups.length;
  const totalDaysCount = eventGroups.reduce((acc, e) => acc + e.totalDays, 0);
  const activeEventsCount = eventGroups.filter(e => e.status === "Active").length;
  const upcomingEventsCount = eventGroups.filter(e => e.status === "Upcoming").length;
  const completedEventsCount = eventGroups.filter(e => e.status === "Completed").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">

      {/* Dynamic Header */}
      <div className="flex items-center gap-3 mb-2">
        {selectedEventName && (
          <Button variant="outline" size="sm" onClick={() => setSelectedEventName(null)} className="h-8 gap-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Events
          </Button>
        )}
      </div>

      {/* Global or Event KPIs */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {!selectedEventName ? (
            <>
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md p-4 flex flex-col justify-between hover:border-purple-300 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Total Events</p>
                <p className="text-3xl font-black text-gray-800 dark:text-gray-100 mt-2">{totalEventsCount}</p>
              </div>
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md p-4 flex flex-col justify-between hover:border-purple-300 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Total Days</p>
                <p className="text-3xl font-black text-pink-600 mt-2">{totalDaysCount}</p>
              </div>
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md p-4 flex flex-col justify-between hover:border-purple-300 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Active Now</p>
                <p className="text-3xl font-black text-pink-600 mt-2">{activeEventsCount}</p>
              </div>
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md p-4 flex flex-col justify-between hover:border-purple-300 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Upcoming Events</p>
                <p className="text-3xl font-black text-amber-500 mt-2">{upcomingEventsCount}</p>
              </div>
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md p-4 flex flex-col justify-between hover:border-purple-300 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Completed Events</p>
                <p className="text-3xl font-black text-blue-600 mt-2">{completedEventsCount}</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md p-4 flex flex-col justify-between hover:border-purple-300 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Event Name</p>
                <p className="text-xl font-black text-gray-800 dark:text-gray-100 mt-2 line-clamp-3 leading-tight" title={selectedEvent!.eventName}>{selectedEvent!.eventName}</p>
              </div>
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md p-4 flex flex-col justify-between hover:border-purple-300 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Total Staff</p>
                <p className="text-3xl font-black text-gray-800 dark:text-gray-100 mt-2">{selectedEvent!.assignments.length}</p>
              </div>
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md p-4 flex flex-col justify-between hover:border-purple-300 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Total Days</p>
                <p className="text-3xl font-black text-pink-600 mt-2">{selectedEvent!.totalDays}</p>
              </div>
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md p-4 flex flex-col justify-between hover:border-purple-300 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Status</p>
                <div className="mt-2">{statusBadge(selectedEvent!.status)}</div>
              </div>
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md p-4 flex flex-col justify-between hover:border-purple-300 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Destination</p>
                <p className="text-xl font-bold text-gray-700 dark:text-gray-300 mt-2 line-clamp-3 leading-tight" title={selectedEvent!.destination}>{selectedEvent!.destination}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Filters */}
      <Card className="border border-gray-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input placeholder={selectedEventName ? "Search employee..." : "Search event..."} value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="pl-8 h-8 text-xs w-56" />
            </div>
            
            {!selectedEventName ? (
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Status">{filterStatus === "All" ? "All Status" : filterStatus}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {["All","Active","Upcoming","Completed","Cancelled"].map(s => <SelectItem key={s} value={s}>{s === "All" ? "All Status" : s}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <>
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
              </>
            )}
            
            <span className="text-[10px] text-gray-400 font-bold">{selectedEventName ? filteredAssignments.length : filteredEvents.length} records</span>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-slate-800 pb-3 bg-slate-50/50 dark:bg-slate-900/50">
          <CardTitle className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
            <Plane className="w-4 h-4 text-pink-500" />
            {selectedEventName ? `Event Details: ${selectedEventName}` : "Events Overview"}
            <Badge className="bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30 text-[10px] font-black">
              {selectedEventName ? filteredAssignments.length : filteredEvents.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-400" /></div>
          ) : (!selectedEventName && filteredEvents.length === 0) || (selectedEventName && filteredAssignments.length === 0) ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Plane className="w-10 h-10 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">No records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-card">
                    {selectedEventName ? (
                      ["#","Employee","Department","Branch","Destination","Start","End","Days","Status","Assigned By"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))
                    ) : (
                      ["#","Event Name","Destination","Start Date","End Date","Days","Status","Participants"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {!selectedEventName ? (
                    filteredEvents.map((e, i) => (
                      <tr 
                        key={e.eventName} 
                        onClick={() => setSelectedEventName(e.eventName)}
                        className="border-b border-gray-50 dark:border-slate-800 hover:bg-pink-50/30 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 text-gray-400 font-bold text-[10px] group-hover:text-pink-500">{i + 1}</td>
                        <td className="px-4 py-3 font-bold text-gray-800 dark:text-gray-100 max-w-[200px] truncate">{e.eventName}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 font-semibold text-gray-600 dark:text-gray-300">
                            <MapPin className="w-3 h-3 text-pink-400 shrink-0" />{e.destination}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(e.startDate)}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(e.endDate)}</td>
                        <td className="px-4 py-3 text-center font-black text-pink-600">{e.totalDays}</td>
                        <td className="px-4 py-3">{statusBadge(e.status)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-slate-600 dark:text-slate-300">{e.assignments.length} Staff</Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredAssignments.map((a, i) => (
                      <tr key={a.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 font-bold text-[10px]">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-200 to-pink-400 flex items-center justify-center text-[9px] font-black text-pink-800 shrink-0">
                              {(a.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">{a.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.department || "—"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.branch || "—"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.destination}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(a.start_date)}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(a.end_date)}</td>
                        <td className="px-4 py-3 text-center font-black text-pink-600">{diffDays(a.start_date, a.end_date)}</td>
                        <td className="px-4 py-3">{statusBadge(a.status)}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.assigned_by_name || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
