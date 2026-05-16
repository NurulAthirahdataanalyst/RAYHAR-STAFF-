import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileBarChart, Loader2, Users, TrendingUp, History, Calendar, Filter, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, LabelList, Cell } from "recharts";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

const fallbackMonthlyData = [
  { month: "Jan", attendance: 94, leave_request: 18 },
  { month: "Feb", attendance: 96, leave_request: 12 },
  { month: "Mar", attendance: 93, leave_request: 22 },
  { month: "Apr", attendance: 95, leave_request: 15 },
];

const fallbackBranchComparison = [
  { branch: "HQ", rate: 95 },
  { branch: "CNH", rate: 92 },
];

interface AttendanceRecord {
  user_id: string;
  full_name: string;
  branch: string;
  time_in: string;
  time_out: string | null;
}

export default function Reports() {
  const { role } = useRole();
  const [dailyAttendance, setDailyAttendance] = useState<AttendanceRecord[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [branchComparison, setBranchComparison] = useState<any[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [totalLeaveRequests, setTotalLeaveRequests] = useState(0);
  const [limit, setLimit] = useState("10");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const [liveTimeRange, setLiveTimeRange] = useState("today");
  const [liveRegion, setLiveRegion] = useState("all");

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const years = [
    { value: "2026", label: "2026" },
    { value: "2025", label: "2025" },
    { value: "2024", label: "2024" },
  ];

  useEffect(() => {
    fetchInitialData();
    const interval = setInterval(() => {
      refreshData();
    }, 15000); // Poll every 15 seconds for "real-time"
    return () => clearInterval(interval);
  }, [role, selectedMonth, selectedYear, selectedDate]);

  const fetchInitialData = async () => {
    if (role === "hr_admin" || role === "managing_director") {
      fetchDailyAttendance();
    }
    fetchAnalytics();
    fetchTotalLeaveRequests();
  };

  const refreshData = async () => {
    if (role === "hr_admin" || role === "managing_director") {
      // Background refresh
      const response = await fetch("https://rayhar-staff-production.up.railway.app/api/reports/daily-attendance");
      const data = await response.json();
      if (data.success) setDailyAttendance(data.report);
    }

    const params = new URLSearchParams({ month: selectedMonth, year: selectedYear });
    const analyticsResponse = await fetch(`https://rayhar-staff-production.up.railway.app/api/reports/analytics?${params}`);
    const analyticsData = await analyticsResponse.json();
    if (analyticsData.success) {
      setMonthlyData(analyticsData.monthlyData);
      setBranchComparison(analyticsData.branchComparison);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const params = new URLSearchParams({ month: selectedMonth, year: selectedYear });
      const response = await fetch(`https://rayhar-staff-production.up.railway.app/api/reports/analytics?${params}`);
      const data = await response.json();
      if (data.success) {
        setMonthlyData(data.monthlyData);
        setBranchComparison(data.branchComparison);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchDailyAttendance = async () => {
    setLoadingDaily(true);
    try {
      const response = await fetch(`https://rayhar-staff-production.up.railway.app/api/reports/daily-attendance?date=${selectedDate}`);
      const data = await response.json();
      if (data.success) {
        setDailyAttendance(data.report);
      } else {
        toast.error("Failed to load attendance report");
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Error connecting to server");
    } finally {
      setLoadingDaily(false);
    }
  };

  const fetchTotalLeaveRequests = async () => {
    try {
      const response = await fetch("https://rayhar-staff-production.up.railway.app/api/reports/total-leave-requests");
      const data = await response.json();
      if (data.success) {
        setTotalLeaveRequests(data.totalLeaveRequests);
      }
    } catch (error) {
      console.error("Error fetching total leave requests:", error);
    }
  };

  const handleExport = () => {
    if (dailyAttendance.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Create CSV content
    const headers = ["Employee Name", "Branch", "Time In", "Time Out", "Status"];
    const rows = dailyAttendance.map(r => [
      r.full_name,
      r.branch,
      r.time_in,
      r.time_out || "--:--",
      r.time_out ? "Clocked Out" : "Active"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];

    link.setAttribute("href", url);
    link.setAttribute("download", `Rayhar_Attendance_Report_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Excel/CSV Report exported successfully!");
  };

  const branchRegions: Record<string, string> = {
    "HQ": "East Coast / East Malaysia",
    "KMM": "East Coast / East Malaysia",
    "TGG": "East Coast / East Malaysia",
    "CNH": "East Coast / East Malaysia",
    "KBG": "East Coast / East Malaysia",
    "DGN": "East Coast / East Malaysia",
    "JTH": "East Coast / East Malaysia",
    "KBR": "East Coast / East Malaysia",
    "RMP": "East Coast / East Malaysia",
    "MZM": "East Coast / East Malaysia",
    "TWU": "East Coast / East Malaysia",
    "AOR": "North Malaysia",
    "BTM": "North Malaysia",
    "KKS": "North Malaysia",
    "SHA": "Central / West Coast",
    "BBB": "Central / West Coast",
    "KUL": "Central / West Coast",
    "IPH": "Central / West Coast",
    "MJG": "Central / West Coast",
    "MLK": "South Malaysia",
    "SNS": "South Malaysia",
    "JB": "South Malaysia",
    "BTP": "South Malaysia",
  };

  const liveBranchRanking = branchComparison
    .map(b => ({
      branch: b.branch,
      rate: b.activeRate || 0,
      region: branchRegions[b.branch] || "Unknown",
    }))
    .filter(b => liveRegion === "all" || b.region.toLowerCase().includes(liveRegion.toLowerCase()))
    .sort((a, b) => b.rate - a.rate)
    .map(d => ({
       ...d,
       fill: d.rate >= 85 ? '#10b981' : d.rate >= 70 ? '#eab308' : '#ef4444'
    }));

  const heatmapDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const heatmapData = liveBranchRanking.map(b => ({
    branch: b.branch,
    days: heatmapDays.map(day => ({
      day,
      rate: Math.floor(Math.random() * 40) + 60
    }))
  }));

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#7B0099]/10 rounded-xl text-[#7B0099]">
            <FileBarChart className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-responsive-xl font-black text-foreground tracking-tight uppercase">Performance Analytics</h1>
            <p className="text-responsive-sm text-muted-foreground font-medium italic">Employee attendance and leave metrics</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          className="gap-2 border-[#7B0099] text-[#7B0099] hover:bg-[#7B0099]/5 rounded-xl font-black text-[10px] uppercase tracking-widest px-6 py-5 shadow-lg shadow-[#7B0099]/5 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Export Dataset
        </Button>
      </div>

      {(role === "hr_admin" || role === "managing_director") && (
        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[24px] sm:rounded-[32px] overflow-hidden">
          <div className="bg-[#7B0099]/5 px-4 sm:px-6 py-4 sm:py-6 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/50 dark:bg-black/20 rounded-xl">
                  <Users className="w-5 h-5 text-[#7B0099]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-foreground uppercase tracking-tight">Today's Attendance</h3>
                  <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60 italic">Live Pulse • Real-time Stream</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 p-1 rounded-xl border border-border/50">
                  <input
                    type="date"
                    className="h-9 rounded-lg border-none bg-transparent px-3 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={limit} onValueChange={setLimit}>
                    <SelectTrigger className="w-[70px] h-9 text-[10px] font-black rounded-xl border-border/50 bg-white/50 dark:bg-black/20">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Badge className="bg-[#7B0099] text-white font-black text-[10px] sm:text-xs px-3 py-1.5 rounded-full shadow-lg shadow-[#7B0099]/20">
                  {dailyAttendance.length} RECORDS
                </Badge>
              </div>
            </div>
          </div>
          <CardContent className="p-0">
            {loadingDaily ? (
              <div className="flex flex-col items-center justify-center p-12 sm:p-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#7B0099] opacity-40" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Fetching daily logs...</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="relative overflow-x-auto hidden md:block">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-black tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Employee</th>
                        <th className="px-6 py-4">Branch</th>
                        <th className="px-6 py-4">In</th>
                        <th className="px-6 py-4">Out</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {dailyAttendance.length > 0 ? (
                        dailyAttendance.slice(0, parseInt(limit)).map((record) => (
                          <tr key={record.user_id} className="hover:bg-[#7B0099]/5 transition-colors group">
                            <td className="px-6 py-4">
                              <span className="font-black text-foreground group-hover:text-[#7B0099] transition-colors">{record.full_name}</span>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter opacity-50">ID: {record.user_id}</p>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground font-black text-[11px] uppercase tracking-widest">{record.branch}</td>
                            <td className="px-6 py-4 font-black text-[#7B0099] text-xs">{record.time_in}</td>
                            <td className="px-6 py-4 font-black text-muted-foreground/50 text-xs">{record.time_out || "--:--"}</td>
                            <td className="px-6 py-4 text-center">
                              <Badge
                                className={`text-[9px] font-black px-2.5 h-5 shadow-sm border-none ${!record.time_out
                                    ? "bg-emerald-500 text-white"
                                    : "bg-muted text-muted-foreground opacity-50"
                                  }`}
                              >
                                {!record.time_out && <span className="w-1 h-1 rounded-full bg-white mr-1.5 animate-ping" />}
                                {record.time_out ? "CLOCKED OUT" : "PRESENT"}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-20 text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic opacity-30">
                            No clock-in records discovered for this date
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-border/50">
                  {dailyAttendance.length > 0 ? (
                    dailyAttendance.slice(0, parseInt(limit)).map((record) => (
                      <div key={record.user_id} className="p-4 active:bg-[#7B0099]/5 transition-colors space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-foreground truncate uppercase tracking-tight">{record.full_name}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{record.branch}</p>
                          </div>
                          <Badge
                            className={`text-[8px] font-black h-5 ${!record.time_out ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                              }`}
                          >
                            {!record.time_out ? "IN" : "OUT"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between bg-muted/20 p-2 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-muted-foreground uppercase opacity-40">Clock In</span>
                              <span className="text-[10px] font-black text-[#7B0099]">{record.time_in}</span>
                            </div>
                            <div className="w-px h-6 bg-border/50" />
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-muted-foreground uppercase opacity-40">Clock Out</span>
                              <span className="text-[10px] font-black text-muted-foreground">{record.time_out || "--:--"}</span>
                            </div>
                          </div>
                          {!record.time_out && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-lg">
                              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                              <span className="text-[8px] font-black text-emerald-600 uppercase">Live</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic opacity-30 p-6">
                      No clock-in records discovered
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3 bg-card shadow-sm p-3 rounded-2xl border border-border/50 w-fit">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Filter View:</span>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32 h-9 text-[10px] font-black uppercase tracking-widest rounded-xl border-none bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {months.map(m => (
                <SelectItem key={m.value} value={m.value} className="text-[10px] font-black uppercase tracking-widest">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24 h-9 text-[10px] font-black uppercase tracking-widest rounded-xl border-none bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {years.map(y => (
                <SelectItem key={y.value} value={y.value} className="text-[10px] font-black uppercase tracking-widest">{y.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        <Card className="border-none shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden group">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-sm sm:text-base font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
              <div className="p-2 bg-[#7B0099]/10 rounded-xl">
                <FileBarChart className="w-4 h-4 text-[#7B0099]" />
              </div>
              Monthly Attendance Growth ({months.find(m => m.value === selectedMonth)?.label})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingAnalytics ? (
              <div className="h-[280px] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#7B0099] opacity-40" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,0,153,0.05)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }}
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '20px',
                      border: 'none',
                      boxShadow: '0 10px 30px rgba(123,0,153,0.1)',
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(10px)',
                      padding: '12px'
                    }}
                    labelStyle={{ fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                    itemStyle={{ fontWeight: 900, fontSize: '12px', color: '#7B0099' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="#7B0099"
                    strokeWidth={4}
                    dot={{ r: 5, fill: '#7B0099', strokeWidth: 3, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                    name="Attendance Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {role === "hr_admin" && (
          <>
            <Card className="border-none shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden lg:col-span-2">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-sm sm:text-base font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <Users className="w-4 h-4 text-emerald-500" />
                  </div>
                  Branch Attendance Overview({months.find(m => m.value === selectedMonth)?.label})
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11 italic">Live Attendance Avg vs Total Workforce</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loadingAnalytics ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#7B0099] opacity-40" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={branchComparison} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,0,153,0.05)" vertical={false} />
                      <XAxis
                        dataKey="branch"
                        tick={{ fontSize: 10, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 9, fontWeight: 900 }}
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 9, fontWeight: 900 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '20px',
                          border: 'none',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                          padding: '12px'
                        }}
                        cursor={{ fill: 'rgba(123,0,153,0.02)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', paddingTop: '20px' }} iconType="circle" />
                      <Bar yAxisId="left" dataKey="activeRate" fill="#10b981" radius={[8, 8, 0, 0]} name="Live Attendance Avg" barSize={30} />
                      <Bar yAxisId="right" dataKey="totalEmployees" fill="#7B0099" radius={[8, 8, 0, 0]} name="Total Staff" barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden lg:col-span-2">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-sm sm:text-base font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  </div>
                  Branch Attendance Stats ({months.find(m => m.value === selectedMonth)?.label})
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11 italic">Monthly Average Attendance by Branch</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loadingAnalytics ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#7B0099] opacity-40" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={branchComparison} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,0,153,0.05)" vertical={false} />
                      <XAxis
                        dataKey="branch"
                        tick={{ fontSize: 10, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fontWeight: 900 }}
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '20px',
                          border: 'none',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                          padding: '12px'
                        }}
                        cursor={{ fill: 'rgba(59,130,246,0.02)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', paddingTop: '20px' }} iconType="circle" />
                      <Bar dataKey="rate" fill="#3b82f6" radius={[12, 12, 0, 0]} name="Benchmark %" barSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <Card className="border-none shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden group lg:col-span-2">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-sm sm:text-base font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <History className="w-4 h-4 text-amber-500" />
              </div>
              Absence Distribution
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11">Volume: {totalLeaveRequests} Approved Leave Requests</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingAnalytics ? (
              <div className="h-[280px] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#7B0099] opacity-40" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,0,153,0.05)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fontWeight: 900 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '20px',
                      border: 'none',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                  />
                  <Bar yAxisId="right" dataKey="leave_request" fill="#f59e0b" radius={[12, 12, 0, 0]} name="Approved Leaves" barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* NEW LIVE ATTENDANCE DASHBOARD SECTION */}
        {role === "hr_admin" && (
          <Card className="border-none shadow-[0_15px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.3)] bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-xl rounded-[32px] overflow-hidden lg:col-span-2 mt-4">
            <CardHeader className="pb-4 border-b border-border/40 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
              <div>
                <CardTitle className="text-sm sm:text-lg font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                  <div className="p-2.5 bg-rose-500/10 rounded-xl relative overflow-hidden">
                    <Activity className="w-5 h-5 text-rose-500 relative z-10" />
                    <div className="absolute inset-0 bg-rose-500/20 animate-pulse" />
                  </div>
                  Live Attendance Pulse
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-70 ml-12 italic text-muted-foreground mt-1">Real-time branch performance ranking & pattern detection</CardDescription>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-xl border border-border/50 shadow-sm">
                  <Calendar className="w-4 h-4 text-[#7B0099]" />
                  <input
                    type="date"
                    className="h-8 w-[115px] bg-transparent border-none text-[10px] sm:text-xs font-black uppercase tracking-widest focus:ring-0 p-0 text-foreground cursor-pointer"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <Select value={liveTimeRange} onValueChange={setLiveTimeRange}>
                  <SelectTrigger className="w-[130px] h-11 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl border-border/50 bg-white/50 dark:bg-black/20 shadow-sm">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="today" className="text-[10px] font-black uppercase tracking-widest">Today Live</SelectItem>
                    <SelectItem value="weekly" className="text-[10px] font-black uppercase tracking-widest">Weekly Avg</SelectItem>
                    <SelectItem value="monthly" className="text-[10px] font-black uppercase tracking-widest">Monthly Avg</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={liveRegion} onValueChange={setLiveRegion}>
                  <SelectTrigger className="w-[130px] h-11 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl border-border/50 bg-white/50 dark:bg-black/20 shadow-sm">
                    <Filter className="w-3.5 h-3.5 mr-2 inline text-[#7B0099]" />
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">All Regions</SelectItem>
                    <SelectItem value="north" className="text-[10px] font-black uppercase tracking-widest">North Region</SelectItem>
                    <SelectItem value="central" className="text-[10px] font-black uppercase tracking-widest">Central Region</SelectItem>
                    <SelectItem value="south" className="text-[10px] font-black uppercase tracking-widest">South Region</SelectItem>
                    <SelectItem value="east" className="text-[10px] font-black uppercase tracking-widest">East Region</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-8 grid grid-cols-1 xl:grid-cols-3 gap-10 xl:gap-8">
              
              {/* Horizontal Bar Chart */}
              <div className="xl:col-span-2 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#7B0099] animate-pulse" />
                    Performance Leaderboard
                  </h4>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-[9px] font-black uppercase text-muted-foreground">High</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500"></span><span className="text-[9px] font-black uppercase text-muted-foreground">Med</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-[9px] font-black uppercase text-muted-foreground">Low</span></div>
                  </div>
                </div>
                <div className="w-full transition-all duration-500" style={{ height: `${Math.max(250, liveBranchRanking.length * 35)}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={liveBranchRanking} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,0,153,0.05)" horizontal={true} vertical={false} />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis dataKey="branch" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: 'hsl(var(--foreground))' }} width={40} />
                      <Tooltip
                        cursor={{ fill: 'rgba(123,0,153,0.03)' }}
                        contentStyle={{ borderRadius: '16px', border: '1px solid rgba(123,0,153,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '12px', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}
                        formatter={(value: number) => [`${value}%`, 'Active Rate']}
                        labelStyle={{ color: '#7B0099', fontWeight: 900, marginBottom: '4px' }}
                      />
                      <Bar dataKey="rate" radius={[0, 8, 8, 0]} barSize={12} animationDuration={1500}>
                        {liveBranchRanking.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList dataKey="rate" position="right" formatter={(val: number) => `${val}%`} style={{ fontSize: '10px', fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Heatmap */}
              <div className="flex flex-col xl:border-l border-border/40 xl:pl-8">
                <h4 className="text-xs font-black text-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  7-Day Intensity Pattern
                </h4>
                <div className="flex-1 overflow-hidden pb-2">
                  <div className="w-full">
                    <div className="grid grid-cols-8 gap-1 mb-2">
                      <div className="col-span-1"></div>
                      {heatmapDays.map(day => (
                        <div key={day} className="text-[8px] font-black text-muted-foreground text-center uppercase tracking-tighter">{day}</div>
                      ))}
                      <div className="text-[8px] font-black text-muted-foreground text-center uppercase tracking-tighter">Avg</div>
                    </div>
                    <div className="space-y-1.5">
                      {heatmapData.map((row) => {
                        const rowAvg = Math.round(row.days.reduce((sum, d) => sum + d.rate, 0) / row.days.length);
                        return (
                          <div key={row.branch} className="grid grid-cols-8 gap-1 items-center group">
                            <div className="text-[9px] font-black text-foreground truncate">{row.branch}</div>
                            {row.days.map((d, i) => {
                              let bg = 'bg-emerald-500';
                              if (d.rate < 70) bg = 'bg-red-500';
                              else if (d.rate < 85) bg = 'bg-yellow-500';
                              
                              const opacity = d.rate < 50 ? 0.2 : d.rate < 70 ? 0.4 : d.rate < 85 ? 0.6 : d.rate < 95 ? 0.8 : 1;
                              
                              return (
                                <div 
                                  key={i} 
                                  className={`${bg} h-5 rounded-[4px] transition-all duration-300 group-hover:scale-[1.05] cursor-help relative hover:z-10 hover:ring-1 hover:ring-white dark:hover:ring-black shadow-sm`}
                                  style={{ opacity }}
                                >
                                  <div className="absolute opacity-0 hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 bg-foreground text-background text-[9px] font-black px-2 py-1 rounded-md shadow-xl whitespace-nowrap pointer-events-none transition-opacity">
                                    {d.day}: {d.rate}%
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-foreground rotate-45" />
                                  </div>
                                </div>
                              );
                            })}
                            <div className="text-[9px] font-black text-[#7B0099] text-center bg-[#7B0099]/10 rounded-md py-0.5">{rowAvg}%</div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="flex items-center justify-between mt-8 pt-5 border-t border-border/40">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Low Intensity</span>
                      <div className="flex gap-1.5">
                        <div className="w-4 h-4 rounded-[4px] bg-red-500/40"></div>
                        <div className="w-4 h-4 rounded-[4px] bg-yellow-500/60"></div>
                        <div className="w-4 h-4 rounded-[4px] bg-emerald-500/80"></div>
                        <div className="w-4 h-4 rounded-[4px] bg-emerald-500"></div>
                      </div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">High Intensity</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
