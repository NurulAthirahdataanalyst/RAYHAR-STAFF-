import { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from "../config/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";
import { Flame, Info, Trophy, Briefcase, UserCheck, Clock, UserX, CalendarCheck2, ArrowUpRight, ArrowDownRight, Target, ShieldCheck, Activity } from "lucide-react";

// Types
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
  const [lastMonthLogs, setLastMonthLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports/employee-rank?userId=${userId}&month=${month}&year=${year}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRankData({ rank: data.rank, total: data.total, score: data.score });
        }
      })
      .catch(console.error);
      
    // Fetch last month's logs for Attendance Rate comparison
    const prevMonthDate = new Date(parseInt(year), parseInt(month) - 2, 1);
    const prevM = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
    const prevY = String(prevMonthDate.getFullYear());
    
    fetch(`${API_BASE_URL}/api/attendance/history?userId=${userId}&month=${prevM}&year=${prevY}`)
      .then(res => res.json())
      .then(data => {
          setLastMonthLogs(data.history || []);
      })
      .catch(console.error);
  }, [userId, month, year]);

  // Existing Calculations
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
  
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  let absentDays = 0;
  let totalWorkingDaysPassed = 0;
  
  // Also collect data for Calendar Heatmap
  const heatmapData: Record<number, 'Present' | 'Late' | 'Absent' | 'Leave'> = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(parseInt(year), parseInt(month) - 1, d);
    const dayOfWeek = date.getDay();
    const isPastOrToday = date <= new Date() || parseInt(month) !== (new Date().getMonth() + 1);
    
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Weekday
      if (isPastOrToday) totalWorkingDaysPassed++;
      
      const dateStr = `${year}-${month.padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const logsOnDay = myLogs.filter(l => {
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
      
      if (logsOnDay.length > 0) {
        if (logsOnDay.some(l => l.is_late)) {
          heatmapData[d] = 'Late';
        } else {
          heatmapData[d] = 'Present';
        }
      } else if (hasLeave) {
        heatmapData[d] = 'Leave';
      } else if (isPastOrToday) {
        absentDays++;
        heatmapData[d] = 'Absent';
      }
    }
  }

  // Attendance Rate calculation
  const calcRate = (present: number, late: number, workingDays: number) => {
    if (workingDays === 0) return 0;
    return Math.round(((present + late) / workingDays) * 100);
  };
  
  const attendanceRate = calcRate(presentDays - lateArrivals, lateArrivals, totalWorkingDaysPassed);
  
  // Last month rate
  let prevWorkingDaysPassed = 0;
  const prevMonthDate = new Date(parseInt(year), parseInt(month) - 2, 1);
  const prevDaysInMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= prevDaysInMonth; d++) {
     const date = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), d);
     const dayOfWeek = date.getDay();
     if (date <= new Date() && dayOfWeek !== 0 && dayOfWeek !== 6) prevWorkingDaysPassed++;
  }
  // If it's a past month, use all working days in that month.
  // Wait, if it's the previous month, all days are in the past.
  // So my `date <= new Date()` check is correct.
  const prevPresentDays = lastMonthLogs.length;
  const prevLateArrivals = lastMonthLogs.filter(l => l.is_late || l.status === "LATE").length;
  const prevAttendanceRate = calcRate(prevPresentDays - prevLateArrivals, prevLateArrivals, prevWorkingDaysPassed);
  
  const rateDiff = attendanceRate - prevAttendanceRate;

  // New Summary Bar Chart Data (Horizontal)
  const summaryChartData = [
    { name: "Present", value: presentDays - lateArrivals, fill: "#10b981" },
    { name: "Late", value: lateArrivals, fill: "#f59e0b" },
    { name: "Leave", value: totalLeavesUsed, fill: "#8b5cf6" },
    { name: "Absent", value: absentDays, fill: "#ef4444" }
  ].reverse(); // reverse so Present is on top in vertical layout

  // Leave Utilization
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

  // Clock in analysis (New logic)
  let totalTimeMs = 0;
  const timeBuckets: Record<string, number> = {};
  
  myLogs.forEach(l => {
    if (l.clock_in) {
       const klTime = new Date(new Date(l.clock_in).getTime() + 8 * 60 * 60 * 1000);
       totalTimeMs += klTime.getTime() % (24 * 60 * 60 * 1000); // just the time part
       
       // Round to nearest 15 mins for mode calculation
       let hr = klTime.getUTCHours();
       let min = klTime.getUTCMinutes();
       min = Math.round(min / 15) * 15;
       if (min === 60) {
         hr += 1;
         min = 0;
       }
       const bucket = `${String(hr).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
       timeBuckets[bucket] = (timeBuckets[bucket] || 0) + 1;
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

  let avgFmt = "--:-- AM";
  if (myLogs.length > 0) {
    const avgMs = totalTimeMs / myLogs.length;
    const hr = Math.floor(avgMs / (60 * 60 * 1000));
    const min = Math.floor((avgMs % (60 * 60 * 1000)) / (60 * 1000));
    avgFmt = formatTime(`${String(hr).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`);
  }
  
  let mostCommonBucket = "";
  let maxCount = 0;
  Object.entries(timeBuckets).forEach(([bucket, count]) => {
    if (count > maxCount || (count === maxCount && bucket < mostCommonBucket)) {
      maxCount = count;
      mostCommonBucket = bucket;
    }
  });
  const mostCommonTime = mostCommonBucket ? formatTime(mostCommonBucket + ":00") : "--:-- AM";
  const onTimePercentage = presentDays > 0 ? Math.round(((presentDays - lateArrivals) / presentDays) * 100) : 0;

  // Monthly Performance Scores
  const punctualityScore = onTimePercentage;
  const leaveCompliance = totalLeavesUsed <= 14 ? 100 : Math.max(0, 100 - (totalLeavesUsed - 14) * 10);
  const overallScore = Math.round((attendanceRate + punctualityScore + leaveCompliance) / 3) || 0;

  // Heatmap Calendar Generator
  const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1; 
  
  const calendarDays = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* ROW 1: Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate (NEW KPI) */}
        <Card className="rounded-[24px] border-none shadow-sm bg-white/90 dark:bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#7B0099] flex items-center gap-1">ATTENDANCE RATE <Info className="w-3 h-3"/></span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-[#7B0099]" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{attendanceRate}%</p>
                <div className="flex items-center gap-1 mt-1">
                  {lastMonthLogs.length > 0 && rateDiff !== 0 ? (
                    <>
                      {rateDiff > 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : <ArrowDownRight className="w-3 h-3 text-rose-500" />}
                      <span className={`text-xs font-bold ${rateDiff > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {Math.abs(rateDiff)}% from last month
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">-- from last month</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card className="rounded-[24px] border-none shadow-sm bg-white/90 dark:bg-card hover:shadow-md transition-shadow">
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
        <Card className="rounded-[24px] border-none shadow-sm bg-white/90 dark:bg-card hover:shadow-md transition-shadow">
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
        <Card className="rounded-[24px] border-none shadow-sm bg-white/90 dark:bg-card hover:shadow-md transition-shadow">
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

      {/* ROW 2: Charts (Attendance Summary & Leave Pie) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Horizontal Bar Chart */}
        <Card className="rounded-[24px] border-none shadow-sm bg-white/90 dark:bg-card">
          <CardContent className="p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-4">ATTENDANCE SUMMARY ({monthNameFull})</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summaryChartData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" opacity={0.3} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: "bold" }} width={60} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {summaryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Leave Utilization Pie */}
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

      {/* ROW 3: Clock-In Analysis & Attendance Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Clock-In Analysis */}
        <Card className="rounded-[24px] border-none shadow-sm bg-white/90 dark:bg-card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7B0099]/5 to-transparent pointer-events-none" />
          <CardContent className="p-6 relative">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-6">CLOCK-IN ANALYSIS</h3>
            
            <div className="flex items-center gap-5 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[#7B0099]/10 flex items-center justify-center">
                <Clock className="w-7 h-7 text-[#7B0099]" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Average Clock In</p>
                <p className="text-3xl font-black text-foreground">{avgFmt}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/60 dark:bg-black/20 p-4 rounded-[16px] border border-border/50">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">On Time</p>
                <p className="text-lg font-black text-emerald-600 mt-1">{onTimePercentage}%</p>
              </div>
              <div className="bg-white/60 dark:bg-black/20 p-4 rounded-[16px] border border-border/50">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Late Arrivals</p>
                <p className="text-lg font-black text-rose-600 mt-1">{lateArrivals}</p>
              </div>
              <div className="bg-white/60 dark:bg-black/20 p-4 rounded-[16px] border border-border/50">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Most Common</p>
                <p className="text-sm font-black text-blue-600 mt-2">{mostCommonTime}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Heatmap */}
        <Card className="rounded-[24px] border-none shadow-sm bg-white/90 dark:bg-card">
          <CardContent className="p-6">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground">ATTENDANCE CALENDAR ({monthNameFull} {year})</h3>
             </div>
             
             <div className="grid grid-cols-7 gap-1 mb-4 text-center">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                   <div key={i} className="text-[10px] font-black text-muted-foreground">{day}</div>
                ))}
             </div>
             
             <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={i} className="aspect-square" />;
                  
                  const status = heatmapData[day];
                  let bgColor = "bg-muted/30";
                  if (status === 'Present') bgColor = "bg-emerald-500 shadow-sm";
                  else if (status === 'Late') bgColor = "bg-amber-400 shadow-sm";
                  else if (status === 'Absent') bgColor = "bg-rose-500 shadow-sm";
                  else if (status === 'Leave') bgColor = "bg-purple-500 shadow-sm";
                  
                  return (
                    <div 
                      key={i} 
                      className={`aspect-square rounded-md sm:rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all hover:scale-110 cursor-default ${bgColor} ${status ? 'text-white' : 'text-muted-foreground'}`}
                      title={status ? `${day} ${monthNameFull}: ${status}` : `${day} ${monthNameFull}`}
                    >
                      {day}
                    </div>
                  );
                })}
             </div>
             
             <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500" /><span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Present</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-400" /><span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Late</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-rose-500" /><span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Absent</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-purple-500" /><span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Leave</span></div>
             </div>
          </CardContent>
        </Card>
      </div>
      
      {/* ROW 4: Monthly Performance Section */}
      <Card className="rounded-[24px] border-none shadow-sm bg-white/90 dark:bg-card">
        <CardContent className="p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            MONTHLY PERFORMANCE
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Attendance Rate</span>
                <span className="text-lg font-black">{attendanceRate}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${attendanceRate}%` }} />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Punctuality Score</span>
                <span className="text-lg font-black">{punctualityScore}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${punctualityScore}%` }} />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Leave Compliance</span>
                <span className="text-lg font-black">{leaveCompliance}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${leaveCompliance}%` }} />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Overall Score</span>
                <span className="text-lg font-black">{overallScore}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div className="bg-[#7B0099] h-full rounded-full transition-all duration-500" style={{ width: `${overallScore}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
