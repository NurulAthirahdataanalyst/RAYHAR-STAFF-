import { useState, useEffect, useMemo } from "react";
import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isBefore, startOfDay } from "date-fns";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, X, Calendar, User, FileText } from "lucide-react";
import { API_BASE_URL } from "../config/api";

const PRIMARY_COLOR = "#7B0099";

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}

function statusColor(status: string) {
  if (status === "Approved") return { bg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-500/30", dot: "bg-emerald-500" };
  if (status === "Rejected") return { bg: "bg-rose-100 dark:bg-rose-500/20", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-500/30", dot: "bg-rose-500" };
  if (status.startsWith("Pending")) return { bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-500/30", dot: "bg-amber-400" };
  return { bg: "bg-gray-100 dark:bg-gray-500/20", text: "text-gray-500 dark:text-gray-300", border: "border-gray-200 dark:border-gray-500/30", dot: "bg-gray-400" };
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

type LeaveRequest = {
  leave_id: number;
  user_id: string;
  full_name: string;
  department?: string;
  branch?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  days: number;
};

export default function LeaveCalendar() {
  const { role, userBranch, userDepartment, loading: roleLoading } = useRole();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<LeaveRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState("Approved"); // Default to showing approved leaves

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          role,
          branch: userBranch || "",
          department: userDepartment || "",
        });
        const res = await fetch(`${API_BASE_URL}/api/leave-requests?${params}`);
        const data = await res.json();
        if (data.success) {
          setRequests(data.leaveRequests || []);
        }
      } catch (error) {
        console.error("Failed to fetch leave requests", error);
      } finally {
        setLoading(false);
      }
    };
    if (!roleLoading) void fetchData();
  }, [role, userBranch, userDepartment, roleLoading]);

  // Get all days in the current view grid
  const calDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(firstDayOfMonth)),
      end: endOfWeek(endOfMonth(firstDayOfMonth))
    });
  }, [viewYear, viewMonth]);

  // For each day, get leave requests that span that date
  const getLeavesForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return requests.filter(a => {
      let isMatchStatus = false;
      if (filterStatus === "All") isMatchStatus = true;
      else if (filterStatus === "Pending") isMatchStatus = a.status.startsWith("Pending");
      else isMatchStatus = a.status === filterStatus;
      
      if (!isMatchStatus) return false;
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

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-[#7B0099]" /></div>;

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 pt-2 pb-8">

      {/* Controls */}
      <Card className="border border-gray-200 dark:border-slate-800/80 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <h2 className="text-base font-black text-gray-800 dark:text-gray-100 min-w-[180px] text-center">{MONTHS[viewMonth]} {viewYear}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }}>Today</Button>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["All","Approved","Pending","Rejected"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap px-1">
        {[
          { status: "Approved", label: "Approved" },
          { status: "Pending",  label: "Pending" },
          { status: "Rejected", label: "Rejected" },
        ].map(({ status, label }) => {
          const c = statusColor(status);
          return (
            <div key={status} className="flex items-center gap-1.5">
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
                const evts = getLeavesForDay(day);
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
                      {evts.slice(0, 3).map(a => {
                        const c = statusColor(a.status);
                        return (
                          <div
                            key={a.leave_id}
                            onClick={() => setSelectedEvent(a)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer flex items-center gap-1 ${c.bg} ${c.text} truncate border ${c.border} hover:opacity-80 transition-opacity`}
                            title={`${a.full_name || a.user_id} - ${a.leave_type}`}
                          >
                            <span className="truncate">{a.full_name?.split(" ")[0] || a.user_id}</span>
                          </div>
                        );
                      })}
                      {evts.length > 3 && (
                        <div className={`text-[9px] font-bold pl-1 ${today ? 'text-white/80' : 'text-gray-400'}`}>+{evts.length - 3} more</div>
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
        const relatedLeaves = requests.filter(a => 
          a.start_date === selectedEvent.start_date &&
          a.end_date === selectedEvent.end_date &&
          (a.status === filterStatus || filterStatus === "All" || (filterStatus === "Pending" && a.status.startsWith("Pending")))
        );
        return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 transition-all duration-300" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl p-6 max-w-sm w-full flex flex-col relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl" style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR}, #b366ff)` }}>
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Leave Record</p>
                  <h3 className="font-black text-gray-800 dark:text-gray-100 truncate">{selectedEvent.leave_type}</h3>
                </div>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="overflow-y-auto pr-1 space-y-4 custom-scrollbar">
              <div className="space-y-3 border-t border-gray-100 dark:border-slate-800 pt-4">
                <div className="flex items-center gap-2.5">
                  <User className="w-3.5 h-3.5 text-[#7B0099] shrink-0" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-gray-400">Employee</p>
                    <p className="text-[12px] font-bold text-gray-800 dark:text-gray-100">{selectedEvent.full_name || selectedEvent.user_id}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-3.5 h-3.5 text-[#7B0099] shrink-0" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-gray-400">Duration ({selectedEvent.days} {selectedEvent.days > 1 ? 'Days' : 'Day'})</p>
                    <p className="text-[12px] font-bold text-gray-800 dark:text-gray-100">{fmtDate(selectedEvent.start_date)} → {fmtDate(selectedEvent.end_date)}</p>
                  </div>
                </div>

                <div className="mt-2">
                  {(() => {
                    const c = statusColor(selectedEvent.status);
                    return (
                      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-black ${c.bg} ${c.text} border ${c.border}`}>
                        <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                        {selectedEvent.status.startsWith("Pending") ? "Pending" : selectedEvent.status}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {relatedLeaves.length > 1 && (
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-3">Other Employees on Leave ({relatedLeaves.length - 1})</p>
                  <div className="space-y-2">
                    {relatedLeaves.filter(a => a.leave_id !== selectedEvent.leave_id).map((a) => (
                      <div key={a.leave_id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50`}>
                        <div className="w-8 h-8 rounded-full bg-[#7B0099]/10 text-[#7B0099] text-[10px] font-bold flex items-center justify-center shrink-0">
                          {(a.full_name || a.user_id).split(' ').map((n:string)=>n[0]).join('').substring(0,2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-bold text-gray-800 dark:text-gray-100 truncate leading-tight">{a.full_name || a.user_id}</p>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">{a.leave_type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
