import { useState, useEffect, useMemo } from "react";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, LabelList,
} from "recharts";
import {
  TrendingUp, Clock, Award, Zap, Users,
  CalendarCheck2, Flame, ShieldCheck, AlertTriangle,
  Timer, Activity, Target, Loader2, ChevronRight,
  ArrowUpRight, Star,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AttendanceLog {
  attendance_id: number;
  clock_in: string;
  clock_out: string | null;
  time_in: string;
  time_out: string;
  duration: string;
  status: "ON TIME" | "LATE" | "REMOTE" | string;
  is_late: boolean;
  location_type?: string;
}

interface Employee {
  user_id: string;
  full_name: string;
  branch: string;
  department?: string;
  role?: string;
}

interface EmployeeMetrics {
  userId: string;
  name: string;
  branch: string;
  department: string;
  totalDays: number;
  onTimeDays: number;
  lateDays: number;
  punctualityScore: number;   // 0–100
  consistencyScore: number;   // 0–100
  overtimeHours: number;      // hours over 8h/day
  absenteeismRate: number;    // % absent in working days
  leaveCount: number;
  avgWorkHours: number;
  streak: number;             // current consecutive on-time days
  longestStreak: number;
  badge: "CHAMPION" | "RELIABLE" | "IMPROVING" | "AT RISK";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const WORK_START_HOUR = 8; // 08:00
const STANDARD_HOURS  = 8; // hours/day
const HOURLY_RATE_RM  = 12; // RM per OT hour (estimate)

function parseHours(duration: string): number {
  // e.g. "08:30 hrs" or "08:30"
  const m = duration.match(/(\d+):(\d+)/);
  if (!m) return 0;
  return parseInt(m[1]) + parseInt(m[2]) / 60;
}

function computeMetrics(logs: AttendanceLog[], leaveCount: number, userId: string, name: string, branch: string, dept: string): EmployeeMetrics {
  const total     = logs.length;
  const lateDays  = logs.filter(l => l.is_late || l.status === "LATE").length;
  const onTime    = total - lateDays;
  const punctuality = total > 0 ? Math.round((onTime / total) * 100) : 0;

  // Overtime: hours > STANDARD_HOURS per day
  let overtime = 0;
  let totalHrs = 0;
  logs.forEach(l => {
    const h = parseHours(l.duration);
    totalHrs += h;
    if (h > STANDARD_HOURS) overtime += h - STANDARD_HOURS;
  });
  const avgWork = total > 0 ? Math.round((totalHrs / total) * 10) / 10 : 0;

  // Absenteeism: rough estimate — assume 22 working days/month, absent = 22 - actual days
  const WORKING_DAYS = 22;
  const absent = Math.max(0, WORKING_DAYS - total);
  const absenteeism = Math.round((absent / WORKING_DAYS) * 100);

  // Consistency: reward low variance in hours
  const hourList = logs.map(l => parseHours(l.duration)).filter(h => h > 0);
  let consistency = 100;
  if (hourList.length > 1) {
    const mean = hourList.reduce((s, h) => s + h, 0) / hourList.length;
    const variance = hourList.reduce((s, h) => s + Math.pow(h - mean, 2), 0) / hourList.length;
    const stdDev = Math.sqrt(variance);
    consistency = Math.max(0, Math.round(100 - stdDev * 10));
  }

  // Streak
  let streak = 0;
  let longestStreak = 0;
  let cur = 0;
  for (const log of [...logs].reverse()) {
    if (!log.is_late && log.status !== "LATE") {
      cur++;
      longestStreak = Math.max(longestStreak, cur);
    } else {
      if (streak === 0) streak = cur; // current streak (from most recent)
      cur = 0;
    }
  }
  if (streak === 0) streak = cur;

  // Badge
  let badge: EmployeeMetrics["badge"] = "AT RISK";
  if (punctuality >= 95 && consistency >= 80) badge = "CHAMPION";
  else if (punctuality >= 85) badge = "RELIABLE";
  else if (punctuality >= 70) badge = "IMPROVING";

  return {
    userId, name, branch, department: dept,
    totalDays: total, onTimeDays: onTime, lateDays,
    punctualityScore: punctuality,
    consistencyScore: consistency,
    overtimeHours: Math.round(overtime * 10) / 10,
    absenteeismRate: absenteeism,
    leaveCount, avgWorkHours: avgWork,
    streak, longestStreak, badge,
  };
}

// ─── Badge Config ─────────────────────────────────────────────────────────────
const BADGE_CONFIG = {
  CHAMPION:  { color: "bg-amber-500 text-white",  icon: Star,         label: "Champion"  },
  RELIABLE:  { color: "bg-emerald-500 text-white", icon: ShieldCheck,  label: "Reliable"  },
  IMPROVING: { color: "bg-blue-500 text-white",    icon: TrendingUp,   label: "Improving" },
  "AT RISK": { color: "bg-rose-500 text-white",    icon: AlertTriangle,label: "At Risk"   },
};

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, color, size = 80 }: { score: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor"
        strokeWidth="6" className="text-muted/30" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: "stroke-dasharray 1s ease-in-out" }} />
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
        className="rotate-90" style={{ transform: `rotate(90deg) translate(0, -${size}px)`,
          transformOrigin: `${size/2}px ${size/2}px`, fontSize: 13, fontWeight: 900, fill: color }}>
        {score}%
      </text>
    </svg>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, accent, trend }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string; trend?: { value: string; positive: boolean; isGood: boolean };
}) {
  return (
    <div className="bg-white dark:bg-card border border-border/50 shadow-sm rounded-2xl p-5 flex flex-col justify-between min-h-[130px] transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${accent.replace("bg-", "bg-").concat("/10")} ${accent.replace("bg-", "text-")}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        {trend ? (
          <div className={`text-[11px] font-black flex items-center gap-1 ${trend.isGood ? "text-emerald-600" : "text-rose-600"}`}>
            {trend.positive ? "↗" : "↘"} {trend.value}
          </div>
        ) : sub && (
          <div className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
             {sub}
          </div>
        )}
      </div>
      <div>
        <div className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground mb-1.5">{label}</div>
        <div className="text-2xl sm:text-3xl font-black text-foreground leading-none tracking-tight">{value}</div>
      </div>
    </div>
  );
}

const MONTHS = [
  { value: "1", label: "January" }, { value: "2", label: "February" },
  { value: "3", label: "March" },   { value: "4", label: "April" },
  { value: "5", label: "May" },     { value: "6", label: "June" },
  { value: "7", label: "July" },    { value: "8", label: "August" },
  { value: "9", label: "September" },{ value: "10", label: "October" },
  { value: "11", label: "November" },{ value: "12", label: "December" },
];
const YEARS = ["2027", "2026", "2025", "2024"];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeeAnalytics() {
  const { role, userId, userName, userBranch, userDepartment } = useRole();

  const isAdminView = ["branch_leader", "managing_director", "finance_manager", "head_of_department"].includes(role);

  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear,  setSelectedYear]  = useState(new Date().getFullYear().toString());

  // Self data
  const [myLogs, setMyLogs]     = useState<AttendanceLog[]>([]);
  const [myLeaves, setMyLeaves] = useState(0);
  const [loadingMe, setLoadingMe] = useState(true);

  // Team data (admin view)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<EmployeeMetrics[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  const tooltipStyle = {
    borderRadius: "16px", border: "none",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    backgroundColor: "rgba(255,255,255,0.97)",
    backdropFilter: "blur(10px)", padding: "12px",
  };

  // ── Fetch my own attendance ───────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    void fetchMyData();
  }, [userId, selectedMonth, selectedYear]);

  const fetchMyData = async () => {
    setLoadingMe(true);
    try {
      const [attRes, leaveRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/attendance/history?userId=${userId}&month=${selectedMonth}&year=${selectedYear}`),
        fetch(`${API_BASE_URL}/api/leave-requests?userId=${encodeURIComponent(userId!)}`),
      ]);
      const attData   = await attRes.json();
      const leaveData = await leaveRes.json();

      if (attData.success && Array.isArray(attData.history)) {
        setMyLogs(attData.history);
      }
      if (leaveData.success && Array.isArray(leaveData.leaveRequests)) {
        setMyLeaves(leaveData.leaveRequests.filter((l: any) => l.status === "Approved").length);
      }
    } catch (err) {
      console.error("EmployeeAnalytics: fetchMyData error", err);
    } finally {
      setLoadingMe(false);
    }
  };

  // ── My Metrics ────────────────────────────────────────────────────────────
  const myMetrics = useMemo(() => {
    if (!userId || myLogs.length === 0) return null;
    return computeMetrics(myLogs, myLeaves, userId, userName, userBranch, userDepartment || "");
  }, [myLogs, myLeaves, userId, userName, userBranch, userDepartment]);

  // ── Fetch team (admin only) ───────────────────────────────────────────────
  useEffect(() => {
    if (!isAdminView) return;
    void fetchTeam();
  }, [isAdminView, selectedMonth, selectedYear]);

  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const empRes = await fetch(`${API_BASE_URL}/api/employees?role=${role}&branch=${userBranch}&department=${userDepartment || ""}`);
      const empData = await empRes.json();
      const emps: Employee[] = empData.success ? empData.employees : [];
      setEmployees(emps);

      // Fetch attendance for each employee
      const metrics: EmployeeMetrics[] = [];
      await Promise.all(emps.slice(0, 20).map(async (emp) => { // cap at 20 for perf
        try {
          const [aRes, lRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/attendance/history?userId=${emp.user_id}&month=${selectedMonth}&year=${selectedYear}`),
            fetch(`${API_BASE_URL}/api/leave-requests?userId=${encodeURIComponent(emp.user_id)}`),
          ]);
          const aData = await aRes.json();
          const lData = await lRes.json();
          const logs  = aData.success ? aData.history : [];
          const leaves = lData.success ? lData.leaveRequests.filter((l: any) => l.status === "Approved").length : 0;
          metrics.push(computeMetrics(logs, leaves, emp.user_id, emp.full_name, emp.branch, emp.department || ""));
        } catch { /* skip */ }
      }));
      setTeamMetrics(metrics.sort((a, b) => b.punctualityScore - a.punctualityScore));
    } catch (err) {
      console.error("EmployeeAnalytics: fetchTeam error", err);
    } finally {
      setLoadingTeam(false);
    }
  };

  // Selected employee detail (admin view)
  const selectedMetrics = useMemo(() => {
    if (!selectedEmpId) return null;
    return teamMetrics.find(m => m.userId === selectedEmpId) ?? null;
  }, [selectedEmpId, teamMetrics]);

  // ── Dept Overtime Chart ───────────────────────────────────────────────────
  const deptOvertimeData = useMemo(() => {
    const map: Record<string, { dept: string; overtime: number; count: number }> = {};
    teamMetrics.forEach(m => {
      const key = m.department || "Other";
      if (!map[key]) map[key] = { dept: key.length > 12 ? key.slice(0, 10) + "…" : key, overtime: 0, count: 0 };
      map[key].overtime += m.overtimeHours;
      map[key].count++;
    });
    return Object.values(map).map(d => ({ ...d, avgOvertime: Math.round((d.overtime / d.count) * 10) / 10 }));
  }, [teamMetrics]);

  // ── Streak Calendar (last 7 days of myLogs) ───────────────────────────────
  const recentDays = useMemo(() => {
    return [...myLogs].slice(-14).map(l => ({
      date: new Date(l.clock_in).toLocaleDateString("en-MY", { weekday: "short", day: "numeric" }),
      onTime: !l.is_late && l.status !== "LATE",
      hours: parseHours(l.duration),
    }));
  }, [myLogs]);

  // Displayed metrics (self or selected employee in admin view)
  const displayMetrics = selectedMetrics ?? myMetrics;

  return (
    <div className="space-y-5 sm:space-y-7 animate-in fade-in duration-500 pb-12">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#7B0099]/10 dark:bg-[#7B0099]/20 rounded-xl text-[#7B0099]">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-responsive-xl font-black text-foreground tracking-tight uppercase">
              Performance Insights
            </h1>
            <p className="text-responsive-sm text-muted-foreground font-medium italic">
              Employee Attendance Analytics · {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </p>
          </div>
        </div>

        {/* Month/Year Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-card/80 backdrop-blur-md shadow-sm border border-border/50 rounded-2xl px-3 py-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[120px] h-8 text-[10px] font-black uppercase tracking-widest rounded-xl border-none bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value} className="text-[10px] font-black uppercase tracking-widest">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[80px] h-8 text-[10px] font-black uppercase tracking-widest rounded-xl border-none bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {YEARS.map(y => (
                <SelectItem key={y} value={y} className="text-[10px] font-black uppercase tracking-widest">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — MY ATTENDANCE PROFILE
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">

        {/* My Profile Card */}
        <Card className="xl:col-span-1 border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden">
          <div className="bg-gradient-to-br from-[#7B0099] to-[#a855f7] p-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">My Profile</p>
                <h2 className="text-lg font-black tracking-tight mt-0.5 truncate max-w-[180px]">{userName}</h2>
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{userBranch}</p>
              </div>
              {myMetrics && (() => {
                const cfg = BADGE_CONFIG[myMetrics.badge];
                const Icon = cfg.icon;
                return (
                  <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl ${cfg.color} shadow-lg`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-[8px] font-black uppercase tracking-widest">{cfg.label}</span>
                  </div>
                );
              })()}
            </div>

            {/* Score rings */}
            {loadingMe ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin w-8 h-8 text-white/50" />
              </div>
            ) : myMetrics ? (
              <div className="flex items-center justify-around mt-4">
                <div className="flex flex-col items-center gap-1">
                  <ScoreRing score={myMetrics.punctualityScore} color="#a3e635" size={72} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Punctuality</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ScoreRing score={myMetrics.consistencyScore} color="#38bdf8" size={72} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Consistency</span>
                </div>
              </div>
            ) : (
              <p className="text-center text-white/50 text-[10px] font-bold py-4">No data this period</p>
            )}
          </div>

          <CardContent className="p-5 space-y-3">
            {loadingMe ? (
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted/50 rounded-2xl animate-pulse" />)}
              </div>
            ) : myMetrics ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Average Attendance" value={`${100 - myMetrics.absenteeismRate}%`}
                    trend={{ value: "2.4%", positive: true, isGood: true }} icon={Users} accent="bg-blue-500" />
                  <MetricCard label="Late Arrivals" value={myMetrics.totalDays > 0 ? `${Math.round((myMetrics.lateDays / myMetrics.totalDays) * 100)}%` : "0%"}
                    trend={{ value: "1.2%", positive: false, isGood: false }} icon={Clock} accent="bg-rose-500" />
                  <MetricCard label="Unplanned Leaves" value={`${myMetrics.leaveCount}`}
                    trend={{ value: "0.5%", positive: false, isGood: true }} icon={CalendarCheck2} accent="bg-amber-500" />
                  <MetricCard label="Punctuality Score" value={`${myMetrics.punctualityScore}/100`}
                    sub="✓ Target Met" icon={Zap} accent="bg-emerald-500" />
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
                Clock in to see your metrics
              </div>
            )}
          </CardContent>
        </Card>

        {/* Streak + 14-day Calendar */}
        <Card className="xl:col-span-2 border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden">
          <CardHeader className="border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                  <div className="p-2 bg-amber-500/10 rounded-xl"><Flame className="w-4 h-4 text-amber-500" /></div>
                  Attendance Streak
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11 italic">
                  Consecutive on-time arrivals
                </CardDescription>
              </div>
              {myMetrics && (
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-black text-amber-500">{myMetrics.streak}</div>
                    <div className="text-[8px] font-black text-muted-foreground uppercase">Current</div>
                  </div>
                  <div className="w-px h-10 bg-border/50" />
                  <div className="text-center">
                    <div className="text-3xl font-black text-[#7B0099]">{myMetrics.longestStreak}</div>
                    <div className="text-[8px] font-black text-muted-foreground uppercase">Best</div>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {loadingMe ? (
              <div className="h-[200px] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#7B0099] opacity-40 w-8 h-8" />
              </div>
            ) : recentDays.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest">
                No attendance records this period
              </div>
            ) : (
              <>
                {/* Calendar strip */}
                <div className="mb-4">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Recent Days</p>
                  <div className="flex flex-wrap gap-2">
                    {recentDays.map((d, i) => (
                      <div key={i} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all ${
                        d.onTime
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-rose-500/10 border-rose-500/30"
                      }`}>
                        <span className="text-[8px] font-black text-muted-foreground uppercase">{d.date.split(" ")[0]}</span>
                        <span className="text-[10px] font-black text-foreground">{d.date.split(" ")[1]}</span>
                        <span className={`text-[8px] font-black uppercase ${d.onTime ? "text-emerald-600" : "text-rose-600"}`}>
                          {d.onTime ? "✓" : "Late"}
                        </span>
                        <span className="text-[8px] font-bold text-muted-foreground/60">{d.hours.toFixed(1)}h</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hours trend chart */}
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={recentDays} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,0,153,0.05)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 8, fontWeight: 900, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fontWeight: 900, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false} tickLine={false} domain={[0, 10]} />
                    <Tooltip contentStyle={tooltipStyle}
                      formatter={(v: number) => [`${v.toFixed(1)}h`, "Working Hours"]}
                      labelStyle={{ fontWeight: 900, fontSize: 10 }} />
                    <Bar dataKey="hours" radius={[6, 6, 0, 0]} barSize={18}
                      fill="#7B0099" animationDuration={1200}>
                      {recentDays.map((d, i) => (
                        <rect key={i} fill={d.onTime ? "#7B0099" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — TEAM VIEW (admin roles only)
      ═══════════════════════════════════════════════════════════════════ */}
      {isAdminView && (
        <>
          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">Team Performance</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          {/* Leaderboard */}
          <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden">
            <CardHeader className="border-b border-border/40">
              <CardTitle className="text-sm font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                <div className="p-2 bg-[#7B0099]/10 rounded-xl"><Award className="w-4 h-4 text-[#7B0099]" /></div>
                Punctuality Leaderboard
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11 italic">
                {loadingTeam ? "Loading team data…" : `${teamMetrics.length} employees · click row for details`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingTeam ? (
                <div className="flex items-center justify-center p-16 gap-3">
                  <Loader2 className="animate-spin text-[#7B0099] w-7 h-7" />
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest animate-pulse">Calculating metrics…</span>
                </div>
              ) : teamMetrics.length === 0 ? (
                <div className="py-16 text-center text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest">
                  No team data available for this period
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {teamMetrics.map((m, idx) => {
                    const cfg = BADGE_CONFIG[m.badge];
                    const BadgeIcon = cfg.icon;
                    const isSelected = selectedEmpId === m.userId;
                    return (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => setSelectedEmpId(isSelected ? null : m.userId)}
                        className={`w-full text-left px-4 sm:px-6 py-4 transition-all duration-200 hover:bg-[#7B0099]/5 ${
                          isSelected ? "bg-[#7B0099]/8 border-l-2 border-[#7B0099]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Rank */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                            idx === 0 ? "bg-amber-500 text-white" :
                            idx === 1 ? "bg-slate-400 text-white" :
                            idx === 2 ? "bg-orange-600 text-white" :
                            "bg-muted text-muted-foreground"
                          }`}>{idx + 1}</div>

                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-foreground truncate">{m.name}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{m.branch} · {m.department || "—"}</p>
                          </div>

                          {/* Score bars */}
                          <div className="hidden sm:flex items-center gap-4">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-[8px] font-black text-muted-foreground uppercase">Punctuality</span>
                              <div className="flex items-center gap-1.5">
                                <div className="w-24 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                                  <div className="h-full rounded-full bg-[#7B0099] transition-all"
                                    style={{ width: `${m.punctualityScore}%` }} />
                                </div>
                                <span className="text-[10px] font-black text-[#7B0099] w-8">{m.punctualityScore}%</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-[8px] font-black text-muted-foreground uppercase">OT Hrs</span>
                              <span className="text-[11px] font-black text-amber-600">{m.overtimeHours}h</span>
                            </div>
                          </div>

                          <Badge className={`text-[8px] font-black px-2 py-0.5 ${cfg.color} border-none flex items-center gap-1`}>
                            <BadgeIcon className="w-2.5 h-2.5" />{cfg.label}
                          </Badge>
                          <ChevronRight className={`w-4 h-4 text-muted-foreground/40 transition-transform ${isSelected ? "rotate-90 text-[#7B0099]" : ""}`} />
                        </div>

                        {/* Expanded detail */}
                        {isSelected && (
                          <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-200">
                            {[
                              { label: "Total Days",    value: m.totalDays,                  color: "text-foreground"   },
                              { label: "On Time",       value: `${m.onTimeDays}d`,            color: "text-emerald-600"  },
                              { label: "Late",          value: `${m.lateDays}d`,              color: "text-rose-600"     },
                              { label: "Streak",        value: `${m.streak}d 🔥`,             color: "text-amber-600"    },
                              { label: "Overtime",      value: `${m.overtimeHours}h`,         color: "text-amber-500"    },
                              { label: "Consistency",   value: `${m.consistencyScore}%`,      color: "text-blue-600"     },
                              { label: "Avg Hours",     value: `${m.avgWorkHours}h`,          color: "text-foreground"   },
                              { label: "Leave Taken",   value: `${m.leaveCount}`,             color: "text-[#7B0099]"    },
                            ].map(s => (
                              <div key={s.label} className="bg-muted/20 p-3 rounded-2xl">
                                <p className="text-[8px] font-black text-muted-foreground uppercase opacity-60">{s.label}</p>
                                <p className={`text-sm font-black mt-0.5 ${s.color}`}>{s.value}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Overtime Monitoring ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

            {/* Employee Overtime Bar */}
            <Card className="border-none shadow-[0_15px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.25)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden">
              <CardHeader className="border-b border-border/40">
                <CardTitle className="text-sm font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                  <div className="p-2 bg-amber-500/10 rounded-xl"><Timer className="w-4 h-4 text-amber-500" /></div>
                  Overtime by Employee
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11 italic">
                  Hours beyond standard 8h/day
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                {loadingTeam ? (
                  <div className="h-[220px] flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#7B0099] opacity-40 w-7 h-7" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={teamMetrics.filter(m => m.overtimeHours > 0).slice(0, 10).map(m => ({
                        name: m.name.split(" ")[0],
                        overtime: m.overtimeHours,
                        cost: Math.round(m.overtimeHours * HOURLY_RATE_RM),
                      }))}
                      margin={{ top: 5, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,0,153,0.05)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 8, fontWeight: 900, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false} tickLine={false} angle={-20} textAnchor="end" />
                      <YAxis tick={{ fontSize: 8, fontWeight: 900, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle}
                        formatter={(v: number, name: string) => [name === "overtime" ? `${v}h` : `RM ${v}`, name === "overtime" ? "OT Hours" : "Est. Cost"]}
                        labelStyle={{ fontWeight: 900, fontSize: 10 }} />
                      <Bar dataKey="overtime" name="OT Hours" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={20} animationDuration={1200}>
                        <LabelList dataKey="overtime" position="top" style={{ fontSize: 8, fontWeight: 900, fill: "#f59e0b" }}
                          formatter={(v: number) => `${v}h`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Department Overtime Trend */}
            <Card className="border-none shadow-[0_15px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.25)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden">
              <CardHeader className="border-b border-border/40">
                <CardTitle className="text-sm font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                  <div className="p-2 bg-blue-500/10 rounded-xl"><TrendingUp className="w-4 h-4 text-blue-500" /></div>
                  Department Overtime Trends
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11 italic">
                  Avg OT hours + estimated cost · budgeting view
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                {loadingTeam ? (
                  <div className="h-[220px] flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#7B0099] opacity-40 w-7 h-7" />
                  </div>
                ) : deptOvertimeData.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest">
                    No overtime data
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={deptOvertimeData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.05)" vertical={false} />
                        <XAxis dataKey="dept" tick={{ fontSize: 8, fontWeight: 900, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 8, fontWeight: 900, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle}
                          formatter={(v: number) => [`${v}h`, "Avg OT Hours"]}
                          labelStyle={{ fontWeight: 900, fontSize: 10 }} />
                        <Bar dataKey="avgOvertime" name="Avg OT" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={30} animationDuration={1200}>
                          <LabelList dataKey="avgOvertime" position="top"
                            style={{ fontSize: 8, fontWeight: 900, fill: "#3b82f6" }}
                            formatter={(v: number) => `${v}h`} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Cost table */}
                    <div className="mt-3 space-y-2">
                      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">
                        Estimated OT Cost (RM {HOURLY_RATE_RM}/hr)
                      </p>
                      {deptOvertimeData.map(d => (
                        <div key={d.dept} className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground truncate">{d.dept}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-amber-600">{d.overtime.toFixed(1)}h</span>
                            <span className="text-[10px] font-black text-foreground">
                              RM {Math.round(d.overtime * HOURLY_RATE_RM)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Summary Strip ── */}
          {!loadingTeam && teamMetrics.length > 0 && (
            <Card className="border-none shadow-[0_8px_30px_rgba(0,0,0,0.03)] bg-card/80 backdrop-blur-md rounded-[24px]">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Team Summary:</span>
                  {[
                    { label: "Total Employees", value: teamMetrics.length, color: "bg-[#7B0099] text-white" },
                    { label: "Champions",  value: teamMetrics.filter(m => m.badge === "CHAMPION").length,  color: "bg-amber-500 text-white"  },
                    { label: "Reliable",   value: teamMetrics.filter(m => m.badge === "RELIABLE").length,  color: "bg-emerald-500 text-white" },
                    { label: "Improving",  value: teamMetrics.filter(m => m.badge === "IMPROVING").length, color: "bg-blue-500 text-white"    },
                    { label: "At Risk",    value: teamMetrics.filter(m => m.badge === "AT RISK").length,   color: "bg-rose-500 text-white"    },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <Badge className={`${s.color} font-black text-[10px] px-3 py-1 rounded-full`}>{s.value}</Badge>
                      <span className="text-[10px] font-black text-muted-foreground uppercase">{s.label}</span>
                    </div>
                  ))}
                  <div className="ml-auto flex items-center gap-1.5 text-[9px] font-black text-muted-foreground/50 italic">
                    <ArrowUpRight className="w-3 h-3" />
                    Total est. OT cost: RM {Math.round(teamMetrics.reduce((s, m) => s + m.overtimeHours * HOURLY_RATE_RM, 0))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
