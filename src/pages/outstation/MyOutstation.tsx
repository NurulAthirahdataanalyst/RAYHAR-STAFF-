import { useState, useEffect } from "react";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plane, MapPin, Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "../../config/api";

const PINK = "#EC4899";

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-MY", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
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
    case "Active":    return <Badge className="bg-pink-100 text-pink-700 border border-pink-200 font-bold">🟣 Active</Badge>;
    case "Upcoming":  return <Badge className="bg-amber-100 text-amber-700 border border-amber-200 font-bold">🟡 Upcoming</Badge>;
    case "Completed": return <Badge className="bg-blue-100 text-blue-700 border border-blue-200 font-bold">🔵 Completed</Badge>;
    case "Cancelled": return <Badge className="bg-gray-100 text-gray-600 border border-gray-200 font-bold">⬜ Cancelled</Badge>;
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
};

export default function MyOutstation() {
  const { userId, loading: roleLoading } = useRole();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"Upcoming"|"Active"|"Completed"|"Cancelled">("Upcoming");

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

  const counts = {
    Upcoming: assignments.filter(a => a.status === "Upcoming").length,
    Active: assignments.filter(a => a.status === "Active").length,
    Completed: assignments.filter(a => a.status === "Completed").length,
    Cancelled: assignments.filter(a => a.status === "Cancelled").length,
  };

  const filtered = assignments.filter(a => a.status === tab);
  const active = assignments.find(a => a.status === "Active");
  const nextUpcoming = assignments.filter(a => a.status === "Upcoming").sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto px-4 pt-2 pb-8">

      {/* Current / Active Trip Banner */}
      {active && (
        <Card className="border-2 border-pink-200 bg-gradient-to-r from-pink-50 to-white shadow-sm overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl shadow-sm" style={{ background: `linear-gradient(135deg, ${PINK}, #f9a8d4)` }}>
                  <Plane className="w-6 h-6 text-white" />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-pink-400 mb-0.5">Currently On Outstation</p>
                  <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
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
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Start</p>
                <p className="text-[11px] font-bold text-gray-700 mt-0.5">{fmtDate(active.start_date)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">End</p>
                <p className="text-[11px] font-bold text-gray-700 mt-0.5">{fmtDate(active.end_date)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Assigned By</p>
                <p className="text-[11px] font-bold text-gray-700 mt-0.5">{active.assigned_by_name || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Upcoming */}
      {!active && nextUpcoming && (
        <Card className="border border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-200">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Upcoming Trip</p>
              <p className="text-sm font-black text-gray-800 mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500" /> {nextUpcoming.destination}
              </p>
              <p className="text-[11px] text-amber-600 font-bold mt-0.5">{fmtDate(nextUpcoming.start_date)} → {fmtDate(nextUpcoming.end_date)}</p>
            </div>
            {statusBadge(nextUpcoming.status)}
          </CardContent>
        </Card>
      )}

      {/* No assignments */}
      {!active && !nextUpcoming && !loading && assignments.length === 0 && (
        <Card className="border border-dashed border-gray-200 shadow-sm">
          <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Plane className="w-12 h-12 opacity-20" />
            <p className="text-[11px] font-black uppercase tracking-widest">No outstation assignments</p>
            <p className="text-[10px] text-gray-400">You have not been assigned to any outstation trips.</p>
          </CardContent>
        </Card>
      )}

      {/* Status Tabs */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          {(["Upcoming", "Active", "Completed", "Cancelled"] as const).map(s => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all border ${
                tab === s
                  ? s === "Active" ? "bg-pink-500 text-white border-pink-500 shadow-sm" :
                    s === "Upcoming" ? "bg-amber-500 text-white border-amber-500 shadow-sm" :
                    s === "Completed" ? "bg-blue-500 text-white border-blue-500 shadow-sm" :
                    "bg-gray-500 text-white border-gray-500 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {s} <span className="ml-1 opacity-80">({counts[s]})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-32 flex items-center justify-center"><Loader2 className="animate-spin w-6 h-6 text-pink-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center gap-2 text-slate-400 border border-dashed border-gray-200 rounded-xl">
            <AlertCircle className="w-6 h-6 opacity-30" />
            <p className="text-[10px] font-black uppercase tracking-widest">No {tab.toLowerCase()} outstations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => (
              <Card key={a.id} className="border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                        <span className="font-black text-gray-800 text-[13px]">
                          {a.purpose
                            ? <>{a.purpose} <span className="text-pink-400 mx-0.5">·</span> {a.destination}</>
                            : a.destination
                          }
                        </span>
                        {a.client_company && <span className="text-[10px] text-gray-400">· {a.client_company}</span>}
                      </div>
                      <div className="flex flex-wrap gap-3 ml-5">
                        <span className="text-[10px] text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtDate(a.start_date)} → {fmtDate(a.end_date)}</span>
                        <span className="text-[10px] font-bold text-pink-600">{diffDays(a.start_date, a.end_date)} day(s)</span>
                        {a.project && <span className="text-[10px] text-gray-400">📋 {a.project}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {statusBadge(a.status)}
                      <span className="text-[9px] text-gray-400">by {a.assigned_by_name || "HR"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
