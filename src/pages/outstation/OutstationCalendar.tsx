import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isBefore, startOfDay } from "date-fns";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, MapPin, CalendarDays, Users, Plane, X, Calendar, Clock , ArrowLeft } from "lucide-react";

import PageActions from "@/components/layout/PageActions";
import { API_BASE_URL } from "../../config/api";

const PINK = "#f746b9";

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function statusColor(status: string) {
  switch (status) {
    case "Active":    return { bg: "bg-pink-100 dark:bg-pink-500/20",  text: "text-pink-700 dark:text-pink-300",  border: "border-pink-200 dark:border-pink-500/30",  dot: "bg-pink-500"  };
    case "Upcoming":  return { bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-500/30", dot: "bg-amber-400" };
    case "Completed": return { bg: "bg-blue-100 dark:bg-blue-500/20",  text: "text-blue-700 dark:text-blue-300",  border: "border-blue-200 dark:border-blue-500/30",  dot: "bg-blue-400"  };
    case "Cancelled": return { bg: "bg-gray-100 dark:bg-gray-500/20",  text: "text-foreground dark:text-gray-300",  border: "border-gray-200 dark:border-gray-500/30",  dot: "bg-gray-400"  };
    default:          return { bg: "bg-gray-100 dark:bg-gray-500/20",  text: "text-foreground dark:text-gray-300",  border: "border-gray-200 dark:border-gray-500/30",  dot: "bg-gray-400"  };
  }
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

type Assignment = {
  id: number;
  user_id: string;
  full_name: string;
  department?: string;
  branch?: string;
  destination: string;
  purpose?: string;
  start_date: string;
  end_date: string;
  status: string;
  assigned_by_name?: string;
  project?: string;
};

export default function OutstationCalendar({ onlyMine = false }: { onlyMine?: boolean }) {
  const navigate = useNavigate();

  const location = useLocation();
  const isMyCalendar = onlyMine || location.pathname.includes("my-calendar") || location.pathname.includes("my_calendar");
  const { role, userBranch, userDepartment, userId, loading: roleLoading } = useRole();
  const hasLoadedRef = useRef(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Assignment | null>(null);
  const [filterStatus, setFilterStatus] = useState("All");

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    const fetchData = async () => {
      if (!hasLoadedRef.current) setLoading(true);
      try {
        const isEmployee = !["hr_admin", "managing_director", "finance_manager", "branch_leader", "head_of_department"].includes(role);
        const shouldFilterMine = isMyCalendar || isEmployee;

        const params = new URLSearchParams({
          role,
          branch: userBranch || "",
          department: userDepartment || "",
          ...(shouldFilterMine && userId ? { user_id: userId } : {}),
        });
        const res = await fetch(`${API_BASE_URL}/api/outstation?${params}`);
        const data = await res.json();
        if (data.success) {
          let list: Assignment[] = data.assignments || [];
          if (isMyCalendar && userId) {
            list = list.filter((a) => a.user_id === userId || (a as any).userId === userId);
          }
          setAssignments(list);
          hasLoadedRef.current = true;
        }
      } catch { /* swallow */ } finally {
        setLoading(false);
      }
    };
    if (!roleLoading) void fetchData();
  }, [role, userBranch, userDepartment, userId, roleLoading, isMyCalendar]);

  // Get all days in the current view grid
  const calDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(firstDayOfMonth)),
      end: endOfWeek(endOfMonth(firstDayOfMonth))
    });
  }, [viewYear, viewMonth]);

  // For each day, get assignments that span that date
  const getAssignmentsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return assignments.filter(a => {
      if (isMyCalendar && userId && a.user_id !== userId && (a as any).userId !== userId) return false;
      if (filterStatus !== "All" && a.status !== filterStatus) return false;
      return a.start_date.slice(0, 10) <= dateStr && a.end_date.slice(0, 10) >= dateStr;
    });
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isToday = (day: Date) => {
    return isSameDay(day, new Date());
  };

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-500" /></div>;

  return (
    <div className="animate-in fade-in duration-500">

        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 gap-2 px-0 text-foreground hover:bg-transparent hover:text-[#942392] transition-colors touch-target"
            onClick={() => navigate("/outstation/my")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Back to My Outstation
            </span>
          </Button>
        </div>

      {/* Calendar Card */}
      <Card className="border border-slate-100 dark:border-slate-700 bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] overflow-hidden">
        <CardHeader className="flex flex-col gap-4 border-b border-border/50 p-4 sm:p-5">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <h2 className="text-sm sm:text-base font-black text-foreground dark:text-gray-100 min-w-[130px] sm:min-w-[180px] text-center">{MONTHS[viewMonth]} {viewYear}</h2>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><ChevronRight className="w-4 h-4" /></button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }}>Today</Button>
            </div>
            <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["All","Active","Upcoming","Completed","Cancelled"].map(s => (
                    <SelectItem key={s} value={s}>{s === "All" ? "All Status" : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap">
            {[
              { status: "Active",    label: "Active (On Outstation)" },
              { status: "Upcoming",  label: "Upcoming" },
              { status: "Completed", label: "Completed" },
              { status: "Cancelled", label: "Cancelled" },
            ].map(({ status, label }) => {
              const c = statusColor(status);
              return (
                <div key={status} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-sm ${c.dot}`} />
                  <span className="text-[10px] font-bold text-foreground dark:text-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        </CardHeader>
        {loading ? (
          <div className="h-80 flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-400" /></div>
        ) : (
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-border/60 bg-[#942392] divide-x divide-white/20">
              {DAYS.map(d => (
                <div key={d} className="px-2 py-3 text-center text-[11px] font-bold uppercase tracking-widest text-white">{d}</div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 divide-x divide-border/40">
              {calDays.map((day, idx) => {
                const evts = getAssignmentsForDay(day);
                const priority: Record<string, number> = { "Active": 1, "Upcoming": 2, "Completed": 3, "Cancelled": 4 };
                const sortedEvts = [...evts].sort((a, b) => (priority[a.status] || 5) - (priority[b.status] || 5));
                const isCurrentMonth = isSameMonth(day, new Date(viewYear, viewMonth, 1));
                const today = isToday(day);
                const isPast = isBefore(day, startOfDay(new Date())) && !today;

                let cellBg = "bg-card";
                let textCol = "text-foreground";
                
                if (today) {
                  cellBg = "bg-[#DBC5E1] dark:bg-pink-900/40";
                  textCol = "text-[#942392] dark:text-pink-300";
                } else if (!isCurrentMonth) {
                  cellBg = "bg-slate-50/50 dark:bg-slate-900/50";
                  textCol = "text-foreground opacity-50";
                } else if (isPast) {
                  cellBg = "bg-card opacity-80";
                  textCol = "text-foreground dark:text-foreground";
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
                      {sortedEvts.slice(0, 2).map(a => {
                        const c = statusColor(a.status);
                        const isCancelled = a.status === "Cancelled";
                        return (
                          <div
                            key={a.id}
                            onClick={() => setSelectedEvent(a)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${c.bg} ${c.text} truncate border ${c.border} hover:opacity-80 transition-opacity ${isCancelled ? 'line-through opacity-70' : ''}`}
                            title={`${a.full_name} → ${a.destination} (${a.status})`}
                          >
                            {a.full_name?.split(" ")[0]} → {a.destination} {isCancelled ? '(Cancelled)' : ''}
                          </div>
                        );
                      })}
                      {sortedEvts.length > 2 && (
                        <div className={`text-[9px] font-bold pl-1 ${today ? 'text-white/80' : 'text-foreground'}`}>+{sortedEvts.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Event Detail Popup */}
      {selectedEvent && (() => {
        const rawName = selectedEvent.project || selectedEvent.meeting_title || selectedEvent.purpose || selectedEvent.destination || 'Outstation Assignment';
        const selStart = selectedEvent.start_date?.slice(0, 10);
        const selEnd = selectedEvent.end_date?.slice(0, 10);
        const selDest = (selectedEvent.destination || '').trim().toLowerCase();

        const relatedAssignments = assignments.filter(a => {
          const aStart = a.start_date?.slice(0, 10);
          const aEnd = a.end_date?.slice(0, 10);
          const aDest = (a.destination || '').trim().toLowerCase();
          const aName = a.project || a.meeting_title || a.purpose || a.destination || 'Outstation Assignment';
          const nameMatch = (selectedEvent.project && a.project && a.project === selectedEvent.project) || aName === rawName;
          return aStart === selStart && aEnd === selEnd && (nameMatch || aDest === selDest);
        });

        const allCancelled = relatedAssignments.length > 0 && relatedAssignments.every(a => a.status === 'Cancelled');
        const anyActive = relatedAssignments.some(a => a.status === 'Active');
        const anyCompleted = relatedAssignments.some(a => a.status === 'Completed');
        const anyUpcoming = relatedAssignments.some(a => a.status === 'Upcoming');

        let overallStatus = "Upcoming";
        if (allCancelled) {
          overallStatus = "Cancelled";
        } else if (anyActive) {
          overallStatus = "Active";
        } else if (anyCompleted) {
          overallStatus = "Completed";
        } else if (anyUpcoming) {
          overallStatus = "Upcoming";
        } else {
          overallStatus = selectedEvent.status;
        }

        const activeCount = relatedAssignments.filter(a => a.status !== 'Cancelled').length;
        const cancelledCount = relatedAssignments.filter(a => a.status === 'Cancelled').length;

        return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 transition-all duration-300" onClick={() => setSelectedEvent(null)}>
          <div className="bg-card rounded-2xl shadow-2xl overflow-hidden max-w-md w-full flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-pink-500 text-white p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/80 mb-0.5">Outstation Event</p>
                  <h3 className="font-black text-white truncate">{selectedEvent.project || selectedEvent.purpose || selectedEvent.destination}</h3>
                </div>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 pt-4 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
              <div className="space-y-3 border-t border-gray-100 dark:border-slate-800 pt-4">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-foreground">Destination</p>
                    <p className="text-[12px] font-bold text-foreground dark:text-gray-100">{selectedEvent.destination}</p>
                  </div>
                </div>
                {selectedEvent.purpose && (
                  <div className="flex items-center gap-2.5">
                    <Plane className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <div>
                      <p className="text-[9px] font-black uppercase text-foreground">Purpose / Project</p>
                      <p className="text-[12px] font-bold text-foreground dark:text-gray-200">{selectedEvent.purpose} {selectedEvent.project ? `· ${selectedEvent.project}` : ''}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-foreground">Duration</p>
                    <p className="text-[12px] font-bold text-foreground dark:text-gray-100">{fmtDate(selectedEvent.start_date)} → {fmtDate(selectedEvent.end_date)}</p>
                  </div>
                </div>
                {selectedEvent.assigned_by_name && (
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <div>
                      <p className="text-[9px] font-black uppercase text-foreground">Assigned By</p>
                      <p className="text-[12px] font-bold text-foreground dark:text-gray-200">{selectedEvent.assigned_by_name}</p>
                    </div>
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {(() => {
                    const c = statusColor(overallStatus);
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black ${c.bg} ${c.text} border ${c.border}`}>
                        <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                        {overallStatus}
                      </span>
                    );
                  })()}
                  {relatedAssignments.length > 1 && (
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border">
                      {activeCount} Active{cancelledCount > 0 ? ` · ${cancelledCount} Cancelled` : ''}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase text-foreground">
                    Assigned Employees ({relatedAssignments.length})
                  </p>
                  {cancelledCount > 0 && (
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {activeCount} Active, {cancelledCount} Cancelled
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {relatedAssignments.map((a: any) => {
                    const sc = statusColor(a.status);
                    const isCanc = a.status === "Cancelled";
                    return (
                      <div key={a.id} className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-colors shadow-sm ${isCanc ? 'border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/40 opacity-75' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-full ${isCanc ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' : 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'} text-[10px] font-bold flex items-center justify-center shrink-0`}>
                            {a.full_name?.split(' ').map((n:string)=>n[0]).join('').substring(0,2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-[12px] font-bold text-foreground dark:text-gray-100 truncate leading-tight ${isCanc ? 'line-through text-muted-foreground' : ''}`}>{a.full_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{a.user_id || a.department}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${sc.bg} ${sc.text} border ${sc.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {a.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}




