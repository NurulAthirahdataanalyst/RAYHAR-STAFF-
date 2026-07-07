import { useState, useEffect, useMemo } from "react";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plane, ChevronLeft, ChevronRight, MapPin, X, Calendar, Users, Clock } from "lucide-react";
import { API_BASE_URL } from "../../config/api";

const PINK = "#EC4899";

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}

function statusColor(status: string) {
  switch (status) {
    case "Active":    return { bg: "bg-pink-100",  text: "text-pink-700",  border: "border-pink-200",  dot: "bg-pink-500"  };
    case "Upcoming":  return { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-400" };
    case "Completed": return { bg: "bg-blue-100",  text: "text-blue-700",  border: "border-blue-200",  dot: "bg-blue-400"  };
    case "Cancelled": return { bg: "bg-gray-100",  text: "text-gray-500",  border: "border-gray-200",  dot: "bg-gray-400"  };
    default:          return { bg: "bg-gray-100",  text: "text-gray-500",  border: "border-gray-200",  dot: "bg-gray-400"  };
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
};

export default function OutstationCalendar() {
  const { role, userBranch, userDepartment, userId, loading: roleLoading } = useRole();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Assignment | null>(null);
  const [filterStatus, setFilterStatus] = useState("All");

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const isEmployee = !["hr_admin", "managing_director", "finance_manager", "branch_leader", "head_of_department"].includes(role);
        const params = new URLSearchParams({
          role,
          branch: userBranch || "",
          department: userDepartment || "",
          ...(isEmployee && userId ? { user_id: userId } : {}),
        });
        const res = await fetch(`${API_BASE_URL}/api/outstation?${params}`);
        const data = await res.json();
        if (data.success) setAssignments(data.assignments || []);
      } catch { /* swallow */ } finally {
        setLoading(false);
      }
    };
    if (!roleLoading) void fetchData();
  }, [role, userBranch, userDepartment, userId, roleLoading]);

  // Get all days in the current view month
  const calDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startDow = first.getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(startDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  // For each day, get assignments that span that date
  const getAssignmentsForDay = (day: number | null) => {
    if (!day) return [];
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return assignments.filter(a => {
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

  const isToday = (day: number | null) => {
    if (!day) return false;
    const t = new Date();
    return day === t.getDate() && viewMonth === t.getMonth() && viewYear === t.getFullYear();
  };

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-500" /></div>;

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 pt-2 pb-8">

      {/* Controls */}
      <Card className="border border-gray-200/80 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <h2 className="text-base font-black text-gray-800 min-w-[180px] text-center">{MONTHS[viewMonth]} {viewYear}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }}>Today</Button>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["All","Active","Upcoming","Completed","Cancelled"].map(s => (
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
          { status: "Active",    label: "Active (On Outstation)" },
          { status: "Upcoming",  label: "Upcoming" },
          { status: "Completed", label: "Completed" },
          { status: "Cancelled", label: "Cancelled" },
        ].map(({ status, label }) => {
          const c = statusColor(status);
          return (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${c.dot}`} />
              <span className="text-[10px] font-bold text-gray-500">{label}</span>
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <Card className="border border-gray-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="h-80 flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-400" /></div>
        ) : (
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAYS.map(d => (
                <div key={d} className="px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 bg-slate-50/60">{d}</div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7">
              {calDays.map((day, idx) => {
                const evts = getAssignmentsForDay(day);
                return (
                  <div
                    key={idx}
                    className={`min-h-[90px] border-b border-r border-gray-50 p-1.5 transition-colors ${!day ? "bg-gray-50/30" : "hover:bg-gray-50/50"}`}
                  >
                    {day && (
                      <>
                        <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-black mb-1 ${isToday(day) ? "text-white" : "text-gray-700"}`}
                          style={isToday(day) ? { background: PINK } : {}}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {evts.slice(0, 2).map(a => {
                            const c = statusColor(a.status);
                            return (
                              <div
                                key={a.id}
                                onClick={() => setSelectedEvent(a)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${c.bg} ${c.text} truncate border ${c.border} hover:opacity-80 transition-opacity`}
                                title={`${a.full_name} → ${a.destination}`}
                              >
                                {a.full_name?.split(" ")[0]} → {a.destination}
                              </div>
                            );
                          })}
                          {evts.length > 2 && (
                            <div className="text-[9px] text-gray-400 font-bold pl-1">+{evts.length - 2} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Event Detail Popup */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl" style={{ background: `linear-gradient(135deg, ${PINK}, #f9a8d4)` }}>
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Outstation</p>
                  <h3 className="font-black text-gray-800">{selectedEvent.full_name}</h3>
                </div>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase text-gray-400">Destination</p>
                  <p className="text-[12px] font-bold text-gray-800">{selectedEvent.destination}</p>
                </div>
              </div>
              {selectedEvent.purpose && (
                <div className="flex items-center gap-2.5">
                  <Plane className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-gray-400">Purpose</p>
                    <p className="text-[12px] font-bold text-gray-700">{selectedEvent.purpose}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Calendar className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase text-gray-400">Duration</p>
                  <p className="text-[12px] font-bold text-gray-800">{fmtDate(selectedEvent.start_date)} → {fmtDate(selectedEvent.end_date)}</p>
                </div>
              </div>
              {selectedEvent.department && (
                <div className="flex items-center gap-2.5">
                  <Users className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-gray-400">Department</p>
                    <p className="text-[12px] font-bold text-gray-700">{selectedEvent.department}</p>
                  </div>
                </div>
              )}
              {selectedEvent.assigned_by_name && (
                <div className="flex items-center gap-2.5">
                  <Clock className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-gray-400">Assigned By</p>
                    <p className="text-[12px] font-bold text-gray-700">{selectedEvent.assigned_by_name}</p>
                  </div>
                </div>
              )}
              <div className="mt-2">
                {(() => {
                  const c = statusColor(selectedEvent.status);
                  return (
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-black ${c.bg} ${c.text} border ${c.border}`}>
                      <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                      {selectedEvent.status}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
