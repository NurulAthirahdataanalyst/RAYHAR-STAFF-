import { useState, useEffect, useMemo, useRef } from "react";
import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isBefore, startOfDay } from "date-fns";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, ChevronLeft, ChevronRight, X, Calendar, User, FileText,
  Plane, Building2, Users, Wifi, WifiOff, RefreshCw, MapPin, Activity, AlertCircle
} from "lucide-react";
import { API_BASE_URL } from "@/config/api";

// ── Color Config ──────────────────────────────────────────────────────────────
const EVENT_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  "Annual Leave":        { bg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-500/30", dot: "bg-emerald-500",  label: "Annual Leave" },
  "Annual/Emergency Leave": { bg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-500/30", dot: "bg-emerald-500", label: "Annual Leave" },
  "Sick Leave":          { bg: "bg-red-100 dark:bg-red-500/20",     text: "text-red-700 dark:text-red-300",     border: "border-red-200 dark:border-red-500/30",     dot: "bg-red-500",     label: "Sick Leave" },
  "Emergency Leave":     { bg: "bg-orange-100 dark:bg-orange-500/20", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-500/30", dot: "bg-orange-500", label: "Emergency Leave" },
  "Outstation":          { bg: "bg-pink-100 dark:bg-pink-500/20",   text: "text-pink-700 dark:text-pink-300",   border: "border-pink-200 dark:border-pink-500/30",   dot: "bg-pink-500",   label: "Outstation" },
  "Company Leave":       { bg: "bg-purple-100 dark:bg-purple-500/20", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-500/30", dot: "bg-purple-500", label: "Company Leave" },
  "Public Holiday":      { bg: "bg-purple-100 dark:bg-purple-500/20", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-500/30", dot: "bg-purple-500", label: "Company Leave" },
  "Company Holiday":     { bg: "bg-purple-100 dark:bg-purple-500/20", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-500/30", dot: "bg-purple-500", label: "Company Leave" },
  "Replacement Leave":   { bg: "bg-blue-100 dark:bg-blue-500/20",   text: "text-blue-700 dark:text-blue-300",   border: "border-blue-200 dark:border-blue-500/30",   dot: "bg-blue-500",   label: "Replacement Leave" },
  "Unpaid Leave":        { bg: "bg-gray-100 dark:bg-gray-500/20",   text: "text-gray-700 dark:text-gray-300",   border: "border-gray-200 dark:border-gray-500/30",   dot: "bg-gray-500",   label: "Unpaid Leave" },
  "Pending":             { bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-500/30", dot: "bg-amber-400",  label: "Pending" },
  "__default__":         { bg: "bg-indigo-100 dark:bg-indigo-500/20", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-500/30", dot: "bg-indigo-500", label: "Leave" },
};

function getEventColor(event: WorkforceEvent) {
  if (event.source === "outstation") return EVENT_COLORS["Outstation"];
  if (event.source === "company_leave") return EVENT_COLORS["Company Leave"];
  if (event.status && event.status.startsWith("Pending")) return EVENT_COLORS["Pending"];
  return EVENT_COLORS[event.type] ?? EVENT_COLORS["__default__"];
}

// Priority: Company Leave (0) > Outstation (1) > Approved Leave (2) > Pending Leave (3)
function getEventPriority(event: WorkforceEvent): number {
  if (event.source === "company_leave") return 0;
  if (event.source === "outstation") return 1;
  if (event.source === "leave" && event.status === "Approved") return 2;
  return 3;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const PRIMARY = "#7B0099";

type WorkforceEvent = {
  id: string;
  source: "leave" | "outstation" | "company_leave";
  employee: string;
  user_id: string | null;
  branch: string;
  department: string;
  type: string;
  name?: string;
  destination?: string;
  purpose?: string;
  start_date: string;
  end_date: string;
  status: string;
  days?: number | null;
  applies_to?: string;
};

const SOURCE_LABELS: Record<string, string> = {
  All: "All Types",
  leave: "Personal Leave",
  outstation: "Outstation",
  company_leave: "Company Leave",
};

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}

export default function WorkforceCalendar() {
  const { role, userBranch, userDepartment, loading: roleLoading } = useRole();
  const [events, setEvents] = useState<WorkforceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<WorkforceEvent | null>(null);
  const [filterSource, setFilterSource] = useState("All");
  const [filterBranch, setFilterBranch] = useState("All");
  const [filterDept, setFilterDept] = useState("All");
  const [branches, setBranches] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const sseRef = useRef<EventSource | null>(null);
  const isMounted = useRef(true);

  const fetchData = async () => {
    if (!isMounted.current) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ role, branch: userBranch || "", department: userDepartment || "" });
      const res = await fetch(`${API_BASE_URL}/api/workforce-calendar?${params}`);
      const data = await res.json();
      if (data.success && isMounted.current) {
        setEvents(data.events || []);
        setLastRefresh(new Date());
        // Derive unique branches and departments for filters
        const uniqueBranches = Array.from(new Set(data.events.map((e: WorkforceEvent) => e.branch).filter(Boolean))) as string[];
        const uniqueDepts = Array.from(new Set(data.events.map((e: WorkforceEvent) => e.department).filter(Boolean))) as string[];
        setBranches(uniqueBranches.sort());
        setDepartments(uniqueDepts.sort());
      }
    } catch (e) {
      console.error("WorkforceCalendar fetch error:", e);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  // SSE for real-time updates
  useEffect(() => {
    isMounted.current = true;
    if (roleLoading) return;

    void fetchData();

    const sse = new EventSource(`${API_BASE_URL}/api/workforce-calendar/stream`);
    sseRef.current = sse;

    sse.onopen = () => { if (isMounted.current) setConnected(true); };
    sse.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        // Re-fetch on any relevant event type
        const relevantTypes = ["leave-status", "leave-request", "outstation", "company_leave", "refresh"];
        if (relevantTypes.includes(payload.type)) void fetchData();
      } catch {}
    };
    sse.onerror = () => { if (isMounted.current) setConnected(false); };

    return () => {
      isMounted.current = false;
      sse.close();
    };
  }, [role, userBranch, userDepartment, roleLoading]);

  // Calendar grid
  const calDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(firstDayOfMonth)),
      end: endOfWeek(endOfMonth(firstDayOfMonth))
    });
  }, [viewYear, viewMonth]);

  const getEventsForDay = (day: Date): WorkforceEvent[] => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return events
      .filter(e => {
        if (!e.start_date || !e.end_date) return false;
        if (filterSource !== "All" && e.source !== filterSource) return false;
        if (filterBranch !== "All" && e.branch !== filterBranch) return false;
        if (filterDept !== "All" && e.department !== filterDept) return false;
        return e.start_date <= dateStr && e.end_date >= dateStr;
      })
      .sort((a, b) => getEventPriority(a) - getEventPriority(b));
  };

  // KPI for "today"
  const todayStr = today.toISOString().split("T")[0];
  const todayEvents = events.filter(e => e.start_date <= todayStr && e.end_date >= todayStr);
  const todayAnnual = todayEvents.filter(e => e.source === "leave" && e.status === "Approved" && (e.type === "Annual Leave" || e.type === "Annual & Emergency Leave"));
  const todaySick = todayEvents.filter(e => e.source === "leave" && e.status === "Approved" && (e.type === "Sick Leave (MC)" || e.type === "Sick Leave"));
  const todayEmergency = todayEvents.filter(e => e.source === "leave" && e.status === "Approved" && e.type === "Emergency Leave");
  const todayOutstation = todayEvents.filter(e => e.source === "outstation");
  const todayCompany = todayEvents.filter(e => e.source === "company_leave");
  const todayPending = todayEvents.filter(e => e.source === "leave" && e.status?.startsWith("Pending"));

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };
  const isToday = (day: Date) => {
    return isSameDay(day, new Date());
  };
  const canFilterBranchDept = ["hr_admin", "managing_director", "finance_manager"].includes(role);

  if (roleLoading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-[#7B0099]" /></div>;

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 pt-2 pb-8">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Annual Leave", value: todayAnnual.length, dot: "bg-emerald-500", icon: Calendar },
          { label: "Sick Leave", value: todaySick.length, dot: "bg-red-500", icon: Activity },
          { label: "Emergency Leave", value: todayEmergency.length, dot: "bg-orange-500", icon: AlertCircle },
          { label: "Outstation", value: todayOutstation.length, dot: "bg-pink-500", icon: Plane },
          { label: "Company Leave", value: todayCompany.length, dot: "bg-purple-500", icon: Building2 },
          { label: "Pending", value: todayPending.length, dot: "bg-amber-400", icon: FileText },
        ].map(kpi => (
          <Card key={kpi.label} className="border border-gray-200 dark:border-slate-800/80 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${kpi.dot}`} />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 leading-tight">{kpi.label}</p>
                <p className="text-2xl font-black text-gray-800 dark:text-gray-100 leading-tight">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <Card className="border border-gray-200 dark:border-slate-800/80 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3">
          {/* Month Nav */}
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <h2 className="text-sm font-black text-gray-800 dark:text-gray-100 min-w-[160px] text-center">{MONTHS[viewMonth]} {viewYear}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }}>Today</Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[145px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SOURCE_LABELS).map(([v, l]) => <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}
              </SelectContent>
            </Select>
            {canFilterBranchDept && (
              <>
                <Select value={filterBranch} onValueChange={setFilterBranch}>
                  <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="All Branches" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All" className="text-xs">All Branches</SelectItem>
                    {branches.map(b => <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterDept} onValueChange={setFilterDept}>
                  <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="All Departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All" className="text-xs">All Departments</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}
            <button onClick={fetchData} title="Refresh" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-500 hover:text-gray-800">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1 text-[10px] font-bold">
              {connected ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-gray-400" />}
              <span className={connected ? "text-emerald-600" : "text-gray-400"}>{connected ? "Live" : "Offline"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap px-1">
        {[
          { key: "Annual Leave",    label: "Annual Leave" },
          { key: "Sick Leave",      label: "Sick Leave" },
          { key: "Emergency Leave", label: "Emergency Leave" },
          { key: "Outstation",      label: "Outstation" },
          { key: "Company Leave",   label: "Company Leave" },
          { key: "Pending",         label: "Pending" },
        ].map(({ key, label }) => {
          const c = EVENT_COLORS[key];
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${c.dot}`} />
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{label}</span>
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <Card className="border border-gray-200 dark:border-slate-800/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="h-80 flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-[#7B0099]" /></div>
        ) : (
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-border/60 bg-[#7B0099] divide-x divide-white/20">
              {DAYS.map(d => (
                <div key={d} className="px-2 py-3 text-center text-[11px] font-bold uppercase tracking-widest text-white">{d}</div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 divide-x divide-border/40">
              {calDays.map((day, idx) => {
                const evts = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, new Date(viewYear, viewMonth, 1));
                const today = isToday(day);
                const isPast = isBefore(day, startOfDay(new Date())) && !today;

                let cellBg = "bg-white dark:bg-card";
                let textCol = "text-foreground";
                
                if (today) {
                  cellBg = "bg-[#7B0099]";
                  textCol = "text-white";
                } else if (!isCurrentMonth) {
                  cellBg = "bg-slate-50/50 dark:bg-slate-900/50";
                  textCol = "text-muted-foreground opacity-50";
                } else if (isPast) {
                  cellBg = "bg-white dark:bg-card opacity-80";
                  textCol = "text-gray-500 dark:text-gray-400";
                }

                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] border-b border-border/40 p-1.5 transition-colors ${cellBg} ${!today && isCurrentMonth ? 'hover:bg-muted/30' : ''}`}
                  >
                    <div className={`w-full text-right text-[12px] font-bold mb-1.5 px-1 ${textCol}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {evts.slice(0, 4).map(e => {
                        const c = getEventColor(e);
                        return (
                          <div
                            key={e.id}
                            onClick={() => setSelectedEvent(e)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer flex items-center gap-1 ${c.bg} ${c.text} truncate border ${c.border} hover:opacity-80 transition-opacity`}
                            title={`${e.employee} - ${e.type}`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                            <span className="truncate">{e.source === "company_leave" ? `🏢 ${e.name || e.type}` : e.employee?.split(" ")[0]}</span>
                          </div>
                        );
                      })}
                      {evts.length > 4 && (
                        <button
                          onClick={() => setSelectedEvent(evts[0])}
                          className={`text-[9px] font-bold pl-1 hover:brightness-75 transition-colors ${today ? 'text-white/80' : 'text-gray-400'}`}
                        >
                          +{evts.length - 4} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Detail Popup */}
      {selectedEvent && (() => {
        const dateStr = selectedEvent.start_date;
        const dayEvts = events.filter(e => {
          if (!e.start_date || !e.end_date) return false;
          if (filterSource !== "All" && e.source !== filterSource) return false;
          if (filterBranch !== "All" && e.branch !== filterBranch) return false;
          if (filterDept !== "All" && e.department !== filterDept) return false;
          return e.start_date <= dateStr && e.end_date >= dateStr;
        }).sort((a, b) => getEventPriority(a) - getEventPriority(b));
        const c = getEventColor(selectedEvent);
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 transition-all duration-300" onClick={() => setSelectedEvent(null)}>
            <div className="bg-white dark:bg-card rounded-2xl shadow-2xl p-6 max-w-md w-full flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl" style={{ background: `linear-gradient(135deg, ${PRIMARY}, #b366ff)` }}>
                    {selectedEvent.source === "outstation" ? <Plane className="w-5 h-5 text-white" /> :
                     selectedEvent.source === "company_leave" ? <Building2 className="w-5 h-5 text-white" /> :
                     <FileText className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Workforce Event</p>
                    <h3 className="font-black text-gray-800 dark:text-gray-100">{selectedEvent.name || selectedEvent.type}</h3>
                  </div>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-4 custom-scrollbar">
                {/* Selected Event Detail */}
                <div className="space-y-3 border-t border-gray-100 dark:border-slate-800 pt-4">
                  {selectedEvent.source !== "company_leave" && (
                    <div className="flex items-center gap-2.5">
                      <User className="w-3.5 h-3.5 text-[#7B0099] shrink-0" />
                      <div>
                        <p className="text-[9px] font-black uppercase text-gray-400">Employee</p>
                        <p className="text-[12px] font-bold text-gray-800 dark:text-gray-100">{selectedEvent.employee}</p>
                        {selectedEvent.branch && <p className="text-[10px] text-gray-400">{selectedEvent.branch}{selectedEvent.department ? ` · ${selectedEvent.department}` : ''}</p>}
                      </div>
                    </div>
                  )}
                  {selectedEvent.destination && (
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-[#7B0099] shrink-0" />
                      <div>
                        <p className="text-[9px] font-black uppercase text-gray-400">Destination</p>
                        <p className="text-[12px] font-bold text-gray-800 dark:text-gray-100">{selectedEvent.destination}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-3.5 h-3.5 text-[#7B0099] shrink-0" />
                    <div>
                      <p className="text-[9px] font-black uppercase text-gray-400">
                        Duration{selectedEvent.days ? ` (${selectedEvent.days} ${Number(selectedEvent.days) === 1 ? 'Day' : 'Days'})` : ''}
                      </p>
                      <p className="text-[12px] font-bold text-gray-800 dark:text-gray-100">{fmtDate(selectedEvent.start_date)} → {fmtDate(selectedEvent.end_date)}</p>
                    </div>
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-black ${c.bg} ${c.text} border ${c.border}`}>
                      <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                      {selectedEvent.source === "outstation" ? selectedEvent.status :
                       selectedEvent.status?.startsWith("Pending") ? "Pending Approval" : selectedEvent.status}
                    </span>
                  </div>
                </div>

                {/* Others on leave same period */}
                {dayEvts.length > 1 && (
                  <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-3 flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      All on {fmtDate(selectedEvent.start_date)} ({dayEvts.length})
                    </p>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {dayEvts.map(e => {
                        const ec = getEventColor(e);
                        return (
                          <div
                            key={e.id}
                            onClick={() => setSelectedEvent(e)}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer hover:opacity-80 transition-opacity ${e.id === selectedEvent.id ? `${ec.border} ${ec.bg}` : 'border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50'}`}
                          >
                            <div className={`w-2 h-2 rounded-full shrink-0 ${ec.dot}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-gray-800 dark:text-gray-100 truncate">
                                {e.source === "company_leave" ? (e.name || e.type) : e.employee}
                              </p>
                              <p className={`text-[10px] truncate ${ec.text}`}>{e.type}{e.destination ? ` → ${e.destination}` : ''}</p>
                            </div>
                            {e.branch && e.source !== "company_leave" && (
                              <Badge variant="outline" className="text-[8px] font-bold px-1.5 py-0 shrink-0">{e.branch}</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Last refresh timestamp */}
      {lastRefresh && (
        <p className="text-[10px] text-gray-400 text-right font-medium px-1">
          Last updated: {lastRefresh.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      )}
    </div>
  );
}
