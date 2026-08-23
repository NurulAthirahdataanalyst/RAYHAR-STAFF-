import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import PageHeader from "@/components/layout/PageHeader";
import PageActions from "@/components/layout/PageActions";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportToCSV } from "@/utils/export";
import { Loader2, Plane, MapPin, Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { YearPopover } from "@/components/shared/YearPopover";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "../../config/api";

const PINK = "#f746b9";

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-MY", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function diffDays(start: string, end: string) {
  const s = new Date(start), e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1);
}

function daysRemaining(end: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  return Math.ceil((e.getTime() - now.getTime()) / 86400000);
}

function statusBadge(status: string) {
  switch (status) {
    case "Active":    return <Badge className="bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30 font-bold">🟣 Active</Badge>;
    case "Upcoming":  return <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-bold">🟡 Upcoming</Badge>;
    case "Completed": return <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 font-bold">🔵 Completed</Badge>;
    case "Cancelled": return <Badge className="bg-gray-100 dark:bg-gray-500/20 text-foreground dark:text-gray-300 border border-gray-200 dark:border-slate-800 dark:border-gray-500/30 font-bold">⬜ Cancelled</Badge>;
    default:          return <Badge variant="outline">{status}</Badge>;
  }
}

type Assignment = {
  id: number;
  destination: string;
  client_company?: string;
  purpose?: string;
  project?: string;
  start_date: string;
  end_date: string;
  total_days?: number;
  status: string;
  assigned_by_name?: string;
  assigned_at: string;
  meeting_title?: string;
};

export default function MyOutstation() {
  const { userId, loading: roleLoading } = useRole();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const validTabs = ["Upcoming", "Active", "Completed", "Cancelled"];
  const defaultTab = initialTab && validTabs.map(t=>t.toLowerCase()).includes(initialTab.toLowerCase()) ? validTabs.find(t=>t.toLowerCase()===initialTab.toLowerCase()) : "Upcoming";
  const [viewFormAssignment, setViewFormAssignment] = useState<any>(null);
  const [tab, setTab] = useState<"Upcoming"|"Active"|"Completed"|"Cancelled">(defaultTab as any);

  useEffect(() => {
    if (initialTab && validTabs.map(t=>t.toLowerCase()).includes(initialTab.toLowerCase())) {
      setTab(validTabs.find(t=>t.toLowerCase()===initialTab.toLowerCase()) as any);
    }
  }, [initialTab]);

  const [viewMode, setViewMode] = useState<"month"|"year">("month");
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [search, setSearch] = useState("");


  useEffect(() => {
    if (!userId) return;
    const fetch_ = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/outstation?role=employee&user_id=${userId}`);
        const data = await res.json();
        if (data.success) setAssignments(data.assignments || []);
      } catch (err) {
        console.error("MyOutstation error:", err);
      } finally {
        setLoading(false);
      }
    };
    void fetch_();
  }, [userId]);

  const baseFiltered = assignments.filter(a => {
    if (search) {
      const q = search.toLowerCase();
      if (!a.destination.toLowerCase().includes(q) && 
          !a.purpose?.toLowerCase().includes(q) && 
          !a.project?.toLowerCase().includes(q) &&
          !a.meeting_title?.toLowerCase().includes(q)) return false;
    }

    const startDate = new Date(a.start_date);
    const endDate = new Date(a.end_date);
    const selY = parseInt(selectedYear);
    const selM = parseInt(selectedMonth);

    if (viewMode === 'year') {
      if (startDate.getFullYear() !== selY && endDate.getFullYear() !== selY) return false;
    } else {
      const start = startDate.getFullYear() * 12 + startDate.getMonth();
      const end = endDate.getFullYear() * 12 + endDate.getMonth();
      const sel = selY * 12 + (selM - 1);
      if (sel < start || sel > end) return false;
    }
    return true;
  });

  const counts = {
    Upcoming: baseFiltered.filter(a => a.status === "Upcoming").length,
    Active: baseFiltered.filter(a => a.status === "Active").length,
    Completed: baseFiltered.filter(a => a.status === "Completed").length,
    Cancelled: baseFiltered.filter(a => a.status === "Cancelled").length,
  };

  const filtered = baseFiltered.filter(a => a.status === tab);
  const active = assignments.find(a => a.status === "Active");
  const nextUpcoming = assignments.filter(a => a.status === "Upcoming").sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-500" /></div>;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">

      {/* Current / Active Trip Banner */}
      {active && (
        <Card className="border-2 border-pink-200 dark:border-pink-500/30 bg-gradient-to-r from-pink-50 to-white shadow-sm overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl shadow-sm" style={{ background: `linear-gradient(135deg, ${PINK}, #f9a8d4)` }}>
                  <Plane className="w-6 h-6 text-white" />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-pink-400 mb-0.5">Currently On Outstation</p>
                  <h3 className="text-lg font-black text-foreground dark:text-gray-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-pink-500 shrink-0" />
                    {active.purpose
                      ? <>{active.purpose} <span className="text-pink-400 font-bold">·</span> {active.destination}</>
                      : active.destination
                    }
                  </h3>
                </div>
              </div>
              <div className="text-right shrink-0">
                {statusBadge(active.status)}
                <p className="text-xs text-pink-500 font-black mt-1.5">
                  {daysRemaining(active.end_date) >= 0 ? `${daysRemaining(active.end_date)} day(s) remaining` : "Overdue"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-pink-100">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-foreground">Start</p>
                <p className="text-[11px] font-bold text-foreground dark:text-gray-200 mt-0.5">{fmtDate(active.start_date)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-foreground">End</p>
                <p className="text-[11px] font-bold text-foreground dark:text-gray-200 mt-0.5">{fmtDate(active.end_date)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-foreground">Assigned By</p>
                <p className="text-[11px] font-bold text-foreground dark:text-gray-200 mt-0.5">{active.assigned_by_name || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Upcoming */}
      {!active && nextUpcoming && (
        <Card className="border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Upcoming Trip</p>
              <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500" /> {nextUpcoming.destination}
              </p>
              <p className="text-[11px] text-amber-600 font-bold mt-0.5">{fmtDate(nextUpcoming.start_date)} → {fmtDate(nextUpcoming.end_date)}</p>
            </div>
            {statusBadge(nextUpcoming.status)}
          </CardContent>
        </Card>
      )}

      
      
      {/* Main Content Card */}
      <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[24px] sm:rounded-[32px] overflow-hidden">
        
        {/* Tabs & Export inside Card Header */}
        <div className="px-6 pt-6 border-b border-gray-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="flex items-center gap-6 w-full sm:w-auto overflow-x-auto scrollbar-none">
            {(["Upcoming", "Active", "Completed", "Cancelled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setTab(s); setSearchParams({ tab: s.toLowerCase() }); }}
                className={`text-sm font-black uppercase tracking-widest pb-3 translate-y-[1px] transition-colors border-b-[3px] whitespace-nowrap ${
                  tab === s 
                    ? (s === "Upcoming" ? "text-amber-500 border-amber-500" :
                       s === "Active" ? "text-pink-500 border-pink-500" :
                       s === "Completed" ? "text-emerald-500 border-emerald-500" :
                       "text-red-500 border-red-500")
                    : "text-foreground border-transparent hover:text-yellow-500 hover:border-yellow-500"
                }`}
              >
                {s}
                {counts[s] > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                    tab === s 
                      ? (s === "Upcoming" ? "bg-amber-500 text-white" :
                         s === "Active" ? "bg-pink-500 text-white" :
                         s === "Completed" ? "bg-emerald-500 text-white" :
                         "bg-red-500 text-white")
                      : "bg-muted-foreground/20 text-foreground transition-colors group-hover:bg-yellow-500 group-hover:text-white"
                  }`}>
                    {counts[s]}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <div className="pb-3 flex gap-2">
            <ExportDropdown onExportCSV={() => exportToCSV(filtered, `My_Outstations_${tab}`)} />
          </div>
        </div>

        {/* Filters Row */}
        <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search destination..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 focus-visible:ring-[#7B0099] uppercase font-bold tracking-wider rounded-xl"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 dark:bg-slate-900/50 rounded-lg p-1 border border-slate-300 dark:border-slate-700">
                <button 
                  className={`h-7 px-3 text-[10px] font-black tracking-widest rounded-md transition-all ${viewMode === 'month' ? 'bg-white dark:bg-slate-800 text-[#7B0099] shadow-sm' : 'text-foreground hover:text-foreground'}`}
                  onClick={() => setViewMode('month')}
                >
                  MONTH
                </button>
                <button 
                  className={`h-7 px-3 text-[10px] font-black tracking-widest rounded-md transition-all ${viewMode === 'year' ? 'bg-white dark:bg-slate-800 text-[#7B0099] shadow-sm' : 'text-foreground hover:text-foreground'}`}
                  onClick={() => setViewMode('year')}
                >
                  YEAR
                </button>
              </div>
              
              {viewMode === "month" ? (
                <MonthPicker
                  monthYear={`${selectedYear}-${selectedMonth.padStart(2, '0')}`}
                  onSelectMonthYear={(val) => {
                    const [y, m] = val.split('-');
                    setSelectedYear(y);
                    setSelectedMonth(parseInt(m).toString());
                  }}
                  className="flex items-center justify-between h-9 px-3 text-[10px] font-black uppercase tracking-widest text-foreground dark:text-slate-100 bg-white dark:bg-card border border-slate-200 dark:border-slate-700 rounded-md shadow-sm min-w-[140px]"
                />
              ) : (
                <YearPopover year={selectedYear} onSelectYear={setSelectedYear} className="flex items-center justify-between h-9 px-3 text-[10px] font-black uppercase tracking-widest text-foreground dark:text-slate-100 bg-white dark:bg-card border border-slate-200 dark:border-slate-700 rounded-md shadow-sm min-w-[140px]" />
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#7B0099]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground animate-pulse">Syncing Outstations...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 gap-4 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-[32px] bg-muted/30 flex items-center justify-center border-2 border-dashed border-border/50 group hover:border-[#7B0099]/30 transition-colors">
                  <Plane className="h-10 w-10 text-foreground/30 group-hover:text-[#7B0099]/30 transition-colors" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-foreground uppercase tracking-widest">
                    No {tab} Outstations
                  </p>
                  <p className="text-[10px] font-medium text-foreground italic">
                    No assignments found for the selected criteria
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {filtered.map(a => (
                <div key={a.id} onClick={() => setViewFormAssignment(a)} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-foreground dark:text-gray-100 text-[13px] uppercase">
                          &#9992;&#65039; {a.project || a.purpose || a.meeting_title ? `${a.project || a.purpose || a.meeting_title} - ` : ""}{a.destination}
                        </span>
                        {a.client_company && <span className="text-[10px] font-bold text-foreground">&bull; {a.client_company}</span>}
                      </div>
                      <div className="flex flex-wrap gap-3 sm:ml-5 items-center">
                        <span className="text-[11px] text-foreground dark:text-foreground font-bold">{fmtDate(a.start_date)} &mdash; {fmtDate(a.end_date)}</span>
                        <span className="text-[11px] font-black text-pink-600 sm:ml-2">{diffDays(a.start_date, a.end_date)} day(s)</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                      {statusBadge(a.status)}
                      <span className="text-[9px] font-bold uppercase tracking-wider text-foreground">by {a.assigned_by_name || "HR"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      <Dialog open={!!viewFormAssignment} onOpenChange={() => setViewFormAssignment(null)}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {viewFormAssignment && (
            <>
              {/* Header (Fixed) */}
              <div className="bg-[#7B0099] px-6 py-5 text-white shrink-0">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white/20 shrink-0">
                    <Plane className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Outstation Assignment</p>
                    <DialogTitle className="text-lg font-black text-white leading-tight">
                      {viewFormAssignment.project || viewFormAssignment.purpose || "Outstation Trip"}
                    </DialogTitle>
                    <p className="text-[11px] text-white/80 mt-1">The outstation details below.</p>
                  </div>
                </div>
              </div>

              {/* Body (Scrollable) */}
              <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
                {/* Trip Information */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Trip Information
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Destination</p>
                      <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{viewFormAssignment.destination}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Event Name</p>
                      <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{viewFormAssignment.project || "-"}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Status</p>
                      <div className="mt-1">{statusBadge(viewFormAssignment.status)}</div>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Duration
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Start Date</p>
                      <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{formatShortDate(viewFormAssignment.start_date)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">End Date</p>
                      <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{formatShortDate(viewFormAssignment.end_date)}</p>
                    </div>
                    <div className="bg-[#7B0099]/5 rounded-xl p-3 border border-[#7B0099]/20">
                      <p className="text-[10px] text-[#7B0099] font-bold uppercase">Total Days</p>
                      <p className="text-lg font-black text-[#7B0099] mt-0.5">
                        {viewFormAssignment.total_days || 0} {viewFormAssignment.total_days === 1 ? 'Day' : 'Days'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Employees Assigned */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Employees Assigned (1)
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B0099]/20 to-pink-200 flex items-center justify-center text-[10px] font-black text-[#7B0099] shrink-0">
                        {(viewFormAssignment.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-foreground dark:text-gray-100 truncate">{viewFormAssignment.full_name}</p>
                        <p className="text-[10px] text-foreground">{viewFormAssignment.user_id}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer (Fixed) */}
              <div className="px-6 pb-5 flex justify-end">
                <Button variant="outline" onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (!printWindow) return;
                  const html = `
                    <html>
                      <head>
                        <title>Outstation Assignment - ${ viewFormAssignment.project || viewFormAssignment.purpose || "Trip" }</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                          h1 { color: #7B0099; font-size: 24px; margin-bottom: 5px; }
                          h2 { font-size: 16px; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                          .info-box { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
                          .label { font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                          .value { font-size: 14px; font-weight: bold; }
                          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; }
                          th { font-weight: bold; color: #666; text-transform: uppercase; font-size: 10px; }
                        </style>
                      </head>
                      <body>
                        <h1>${ viewFormAssignment.project || viewFormAssignment.purpose || "Outstation Trip" }</h1>
                        <p style="color: #666; margin-top: 0;">Outstation Assignment Details</p>
                        
                        <h2>Trip Information</h2>
                        <div class="info-grid">
                          <div class="info-box" style="grid-column: span 2;">
                            <div class="label">Destination</div>
                            <div class="value">${ viewFormAssignment.destination }</div>
                          </div>
                          <div class="info-box">
                            <div class="label">Status</div>
                            <div class="value">${ viewFormAssignment.status || 'Active' }</div>
                          </div>
                          <div class="info-box">
                            <div class="label">Total Days</div>
                            <div class="value">${ viewFormAssignment.total_days || 0 } Days</div>
                          </div>
                        </div>

                        <h2>Employees Assigned (1)</h2>
                        <table>
                          <tr>
                            <th>Name</th>
                            <th>Employee ID</th>
                          </tr>
                          <tr>
                            <td style="font-weight: bold;">${viewFormAssignment.full_name}</td>
                            <td>${viewFormAssignment.user_id}</td>
                          </tr>
                        </table>
                        
                        <div style="margin-top: 40px; font-size: 10px; color: #999; text-align: center;">
                          Generated from Rayhar Employee Portal
                        </div>
                      </body>
                    </html>
                  `;
                  printWindow.document.write(html);
                  printWindow.document.close();
                  setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
                }} className="rounded-xl font-black text-[11px] border-purple-200 text-purple-700 hover:bg-purple-50">
                  Export to PDF
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}




