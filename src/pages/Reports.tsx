import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileBarChart, Loader2, Users, TrendingUp, History } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
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
                                className={`text-[9px] font-black px-2.5 h-5 shadow-sm border-none ${
                                  !record.time_out 
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
                            className={`text-[8px] font-black h-5 ${
                              !record.time_out ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
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
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Time Horizon:</span>
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
              Attendance Velocity ({selectedYear})
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
                  Branch Saturation Tracker ({months.find(m => m.value === selectedMonth)?.label})
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11 italic">Currently present vs total payroll</CardDescription>
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
                      <Bar yAxisId="left" dataKey="activeRate" fill="#10b981" radius={[8, 8, 0, 0]} name="Saturation %" barSize={30} />
                      <Bar yAxisId="right" dataKey="totalEmployees" fill="#7B0099" radius={[8, 8, 0, 0]} name="Total Headcount" barSize={30} />
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
                  Regional Compliance Benchmark ({months.find(m => m.value === selectedMonth)?.label})
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11 italic">Average monthly attendance per location</CardDescription>
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

        <Card className="border-none shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden group">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-sm sm:text-base font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <History className="w-4 h-4 text-amber-500" />
              </div>
              Absence Distribution
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11">Volume: {totalLeaveRequests} Approved Requests</CardDescription>
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
      </div>
    </div>
  );
}