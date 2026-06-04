import { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from "../config/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";
import { Flame, Info, Trophy, Briefcase, UserCheck, Clock, UserX, CalendarCheck2 } from "lucide-react";

interface EmployeeAnalyticsViewProps {
  userId: string;
  userName: string;
  month: string;
  year: string;
  myLogs: any[];
  leaveRequests: any[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function EmployeeAnalyticsView({ userId, userName, month, year, myLogs, leaveRequests }: EmployeeAnalyticsViewProps) {
  const [rankData, setRankData] = useState<{ rank: number | null, total: number, score: number }>({ rank: null, total: 0, score: 0 });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports/employee-rank?userId=${userId}&month=${month}&year=${year}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRankData({ rank: data.rank, total: data.total, score: data.score });
        }
      })
      .catch(console.error);
  }, [userId, month, year]);

  // Calculations
  const approvedLeaves = leaveRequests.filter(l => l.status === "Approved");
  const annualLeavesUsed = approvedLeaves
    .filter(l => ['Cuti Tahunan', 'Annual/Emergency Leave'].includes(l.leave_type))
    .reduce((acc, curr) => acc + curr.days, 0);
  
  const sickLeavesUsed = approvedLeaves
    .filter(l => ['Cuti Sakit', 'Sick Leave'].includes(l.leave_type))
    .reduce((acc, curr) => acc + curr.days, 0);
  
  const emergencyLeavesUsed = approvedLeaves
    .filter(l => ['Kecemasan', 'Emergency'].includes(l.leave_type))
    .reduce((acc, curr) => acc + curr.days, 0);

  const totalLeavesUsed = annualLeavesUsed + sickLeavesUsed + emergencyLeavesUsed;
  
  // Calculate remaining balance using the exact same logic as Leave Management (Quota includes Pending and Sick Leaves)
  const quotaLeavesUsed = leaveRequests
    .filter(l => l.status !== "Rejected")
    .filter(l => ['Cuti Tahunan', 'Annual/Emergency Leave', 'Cuti Sakit', 'Sick Leave', 'Kecemasan', 'Emergency'].includes(l.leave_type))
    .reduce((acc, curr) => acc + Number(curr.days || 0), 0);
    
  const leaveBalanceRemaining = Math.max(14 - quotaLeavesUsed, 0);

  // Streak
  let streak = 0;
  let cur = 0;
  for (const log of [...myLogs].reverse()) {
    if (!log.is_late && log.status !== "LATE") {
      cur++;
    } else {
      if (streak === 0) streak = cur;
      cur = 0;
    }
  }
  if (streak === 0) streak = cur;

  // Monthly summary
  const presentDays = myLogs.length;
  const lateArrivals = myLogs.filter(l => l.is_late || l.status === "LATE").length;
  
  // Calculate exact absent days (past weekdays with no logs and no leaves)
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  let absentDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(parseInt(year), parseInt(month) - 1, d);
    if (date > new Date() && parseInt(month) === (new Date().getMonth() + 1)) break;
    
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Weekday
      const dateStr = `${year}-${month.padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasLog = myLogs.some(l => {
        if (!l.clock_in) return false;
        const clockDate = new Date(l.clock_in);
        const y = clockDate.getFullYear();
        const m = String(clockDate.getMonth() + 1).padStart(2, '0');
        const day = String(clockDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}` === dateStr;
      });
      const hasLeave = approvedLeaves.some(l => {
        const s = new Date(l.start_date);
        const e = new Date(l.end_date);
        const curr = new Date(dateStr);
        return curr >= s && curr <= e;
      });
      
      if (!hasLog && !hasLeave) {
        absentDays++;
      }
    }
  }

  // Attendance Trend (Cumulative or Daily Status)
  // We'll create a daily array for the month
  const trendData = [];
  let cumPresent = 0;
  let cumLate = 0;
  let cumAbsent = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${month.padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const logsOnDay = myLogs.filter(l => {
      if (!l.clock_in) return false;
      const clockDate = new Date(l.clock_in);
      const y = clockDate.getFullYear();
      const m = String(clockDate.getMonth() + 1).padStart(2, '0');
      const day = String(clockDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}` === dateStr;
    });
    const leavesOnDay = approvedLeaves.filter(l => {
      const s = new Date(l.start_date);
      const e = new Date(l.end_date);
      const curr = new Date(dateStr);
      return curr >= s && curr <= e;
    });

    if (logsOnDay.length > 0) {
      cumPresent++;
      if (logsOnDay.some(l => l.is_late)) cumLate++;
    } else if (leavesOnDay.length === 0) {
      // If it's a weekday, count as absent (naive check)
      const dayOfWeek = new Date(dateStr).getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && d <= new Date().getDate()) {
        cumAbsent++;
      }
    }
    
    // Only add points up to today if looking at current month
    if (new Date(dateStr) <= new Date() || parseInt(month) !== (new Date().getMonth() + 1)) {
       trendData.push({
         day: `${d} ${new Date(parseInt(year), parseInt(month)-1).toLocaleString('default', { month: 'short' })}`,
         "Total Present": cumPresent,
         "Total Late": cumLate,
         "Total Absent": cumAbsent
       });
    }
  }

  // Leave Utilization (Selected Month)
  const selectedMonthIndex = parseInt(month) - 1;
  const monthNameFull = new Date(parseInt(year), selectedMonthIndex).toLocaleString('default', { month: 'long' }).toUpperCase();
  const mLeaves = approvedLeaves.filter(l => new Date(l.start_date).getMonth() === selectedMonthIndex && new Date(l.start_date).getFullYear() === parseInt(year));
  const monthAnn = mLeaves.filter(l => ['Cuti Tahunan', 'Annual/Emergency Leave'].includes(l.leave_type)).reduce((a, b) => a + b.days, 0);
  const monthSck = mLeaves.filter(l => ['Cuti Sakit', 'Sick Leave'].includes(l.leave_type)).reduce((a, b) => a + b.days, 0);
  const monthEmg = mLeaves.filter(l => ['Kecemasan', 'Emergency'].includes(l.leave_type)).reduce((a, b) => a + b.days, 0);
  
  const monthPieData = [
    { name: 'Annual Leave', value: monthAnn },
    { name: 'Sick Leave', value: monthSck },
    { name: 'Emergency Leave', value: monthEmg },
  ].filter(d => d.value > 0);
  
  if (monthPieData.length === 0) monthPieData.push({ name: 'None', value: 1 });

  // Clock in analysis
  let earliest = "23:59:59";
  let latest = "00:00:00";
  let totalTimeMs = 0;
  
  myLogs.forEach(l => {
    if (l.clock_in) {
       const klTime = new Date(new Date(l.clock_in).getTime() + 8 * 60 * 60 * 1000);
       const timeStr = klTime.toISOString().split("T")[1];
       if (timeStr < earliest) earliest = timeStr;
       if (timeStr > latest) latest = timeStr;
       totalTimeMs += klTime.getTime() % (24 * 60 * 60 * 1000); // just the time part
    }
  });

  const formatTime = (tStr: string) => {
    if (!tStr || tStr === "23:59:59" || tStr === "00:00:00") return "--:--";
    const [h, m] = tStr.split(":");
    let hr = parseInt(h);
    const ampm = hr >= 12 ? "PM" : "AM";
    hr = hr % 12 || 12;
    return `${hr.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  const earliestFmt = formatTime(earliest);
  const latestFmt = formatTime(latest);
  let avgFmt = "--:-- AM";
  if (myLogs.length > 0) {
    const avgMs = totalTimeMs / myLogs.length;
    const hr = Math.floor(avgMs / (60 * 60 * 1000));
    const min = Math.floor((avgMs % (60 * 60 * 1000)) / (60 * 1000));
    avgFmt = formatTime(`${String(hr).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`);
  }

  // Leave breakdown logic is now combined above for the monthly utilization

  // Heatmap Calendar
  const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1).getDay();
  const calendarDays = [
    ...Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* ROW 1: Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Score */}
        <Card className="rounded-[24px] border-none shadow-sm bg-white/90 dark:bg-card">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#7B0099] flex items-center gap-1">ATTENDANCE SCORE <Info className="w-3 h-3"/></span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path className="text-muted/30" stroke="currentColor" strokeWidth="4" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-[#7B0099]" stroke="currentColor" strokeWidth="4" strokeDasharray={`${rankData.score}, 100`} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="absolute text-sm font-black text-foreground">{rankData.score}</span>
              </div>
              <div>
                <p className="text-xl font-black text-foreground">{rankData.score} <span className="text-sm text-muted-foreground">/100</span></p>
                <p className="text-xs font-bold text-emerald-600 mt-1">{rankData.score >= 90 ? "Excellent" : rankData.score >= 75 ? "Good" : "Needs Improvement"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card className="rounded-[24px] border-none shadow-sm bg-white/90 dark:bg-card">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1">ATTENDANCE STREAK <Info className="w-3 h-3"/></span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Flame className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{streak} <span className="text-sm text-muted-foreground">Days</span></p>
                <p className="text-xs font-bold text-muted-foreground mt-1">Current Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave Balance */}
        <Card className="rounded-[24px] border-none shadow-sm bg-white/90 dark:bg-card">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">LEAVE BALANCE <Info className="w-3 h-3"/></span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{leaveBalanceRemaining} <span className="text-sm text-muted-foreground">/ 14</span></p>
                <p className="text-xs font-bold text-muted-foreground mt-1">Days Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Rank */}
        <Card className="rounded-[24px] border-none shadow-sm bg-white/90 dark:bg-card">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1">ATTENDANCE RANK <Info className="w-3 h-3"/></span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">#{rankData.rank || '-'} <span className="text-sm text-muted-foreground">of {rankData.total || '-'}</span></p>
                <p className="text-xs font-bold text-amber-500 mt-1">Company Ranking</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-[24px] border-none shadow-sm bg-white/90 dark:bg-card">
          <CardContent className="p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-4">ATTENDANCE TREND ({monthNameFull})</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="Total Present" stroke="#10b981" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="Total Late" stroke="#f59e0b" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="Total Absent" stroke="#ef4444" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-none shadow-sm bg-white/90 dark:bg-card">
          <CardContent className="p-5 flex flex-col h-full">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-4">LEAVE UTILIZATION ({monthNameFull})</h3>
            <div className="flex items-center justify-center flex-1 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={monthPieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {monthPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 w-[120px] shrink-0 ml-4">
                {monthPieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-foreground">{d.name}</span>
                      <span className="text-[9px] text-muted-foreground">{d.value} Days</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "PRESENT DAYS", value: presentDays, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "LATE ARRIVALS", value: lateArrivals, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "LEAVE TAKEN", value: totalLeavesUsed, icon: CalendarCheck2, color: "text-[#7B0099]", bg: "bg-[#7B0099]/10" },
          { label: "ABSENT DAYS", value: absentDays, icon: UserX, color: "text-rose-500", bg: "bg-rose-500/10" }
        ].map(item => (
          <Card key={item.label} className="rounded-[20px] border-none shadow-sm bg-white/90 dark:bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${item.bg}`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</p>
                <p className="text-xl font-black text-foreground">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ROW 4: Heatmap & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Clock-In Analysis */}
        <Card className="lg:col-span-1 rounded-[24px] border-none shadow-sm bg-white/90 dark:bg-card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7B0099]/5 to-transparent pointer-events-none" />
          <CardContent className="p-5 relative">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-6">CLOCK-IN ANALYSIS</h3>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-[#7B0099]/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#7B0099]" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Average Clock In</p>
                <p className="text-2xl font-black text-foreground">{avgFmt}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/50 dark:bg-black/20 p-3 rounded-2xl border border-border/50">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Earliest</p>
                <p className="text-sm font-black text-emerald-600 mt-1">{earliestFmt}</p>
              </div>
              <div className="bg-white/50 dark:bg-black/20 p-3 rounded-2xl border border-border/50">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Latest</p>
                <p className="text-sm font-black text-rose-600 mt-1">{latestFmt}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
