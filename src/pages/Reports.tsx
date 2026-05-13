import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileBarChart, Loader2, Users } from "lucide-react";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Reports & Statistics</h1>
          <p className="text-sm text-muted-foreground mt-1">Analytics about employee attendance and leaves</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="border-primary text-primary hover:bg-primary/10">
          <Download className="w-4 h-4 mr-2" /> Export Report (Excel)
        </Button>
      </div>

      {(role === "hr_admin" || role === "managing_director") && (
        <Card className="border-none shadow-md mb-6 overflow-hidden">
          <div className="bg-primary/5 px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
                  <Users className="w-5 h-5" />
                  Today's Attendance Overview
                </h3>
                <p className="text-xs text-muted-foreground">Live real-time data of staff currently at work</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Date:</span>
                  <input 
                    type="date" 
                    className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Show</span>
                  <Select value={limit} onValueChange={setLimit}>
                    <SelectTrigger className="w-[70px] h-8 text-xs">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Badge className="bg-primary text-white font-mono text-sm px-3 py-1">
                  {dailyAttendance.length} records
                </Badge>
              </div>
            </div>
          </div>
          <CardContent className="p-0">
            <div className="relative overflow-x-auto">
              {loadingDaily ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 text-muted-foreground uppercase text-[11px] font-bold">
                    <tr>
                      <th className="px-6 py-4">Employee Name</th>
                      <th className="px-6 py-4">Branch</th>
                      <th className="px-6 py-4">Time In</th>
                      <th className="px-6 py-4">Time Out</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dailyAttendance.length > 0 ? (
                      dailyAttendance.slice(0, parseInt(limit)).map((record) => (
                        <tr key={record.user_id} className="hover:bg-primary/5 transition-colors group">
                          <td className="px-6 py-4 font-bold text-foreground group-hover:text-primary">{record.full_name}</td>
                          <td className="px-6 py-4 text-muted-foreground font-medium">{record.branch}</td>
                          <td className="px-6 py-4 font-mono text-xs">{record.time_in}</td>
                          <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{record.time_out || "--:--"}</td>
                          <td className="px-6 py-4">
                            <Badge
                              variant="outline"
                              className={!record.time_out ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500"}
                            >
                              {!record.time_out && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />}
                              {record.time_out ? "Clocked Out" : "Present"}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground italic">
                          No employees have clocked in today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-xl border w-fit">
        <span className="text-xs font-bold text-muted-foreground uppercase px-2">Filter View:</span>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileBarChart className="w-4 h-4 text-primary" />
              Monthly Attendance Trend ({selectedYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAnalytics ? (
               <div className="h-[280px] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 95%)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="attendance" stroke="hsl(263, 70%, 50%)" strokeWidth={3} dot={{ r: 6, fill: 'hsl(263, 70%, 50%)', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} name="Attendance %" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {role === "hr_admin" && (
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Branch Efficiency ({months.find(m => m.value === selectedMonth)?.label})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAnalytics ? (
                <div className="h-[280px] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={branchComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 95%)" vertical={false} />
                    <XAxis dataKey="branch" tick={{ fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar yAxisId="left" dataKey="activeRate" fill="hsl(142, 71%, 45%)" radius={[6, 6, 0, 0]} name="Currently In %" barSize={25} />
                    <Bar yAxisId="left" dataKey="rate" fill="hsl(200, 71%, 45%)" radius={[6, 6, 0, 0]} name="Monthly Attendance %" barSize={25} />
                    <Bar yAxisId="right" dataKey="totalEmployees" fill="hsl(263, 70%, 50%)" radius={[6, 6, 0, 0]} name="Total Staff" barSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Approved Leaves Trend</CardTitle>
            <CardDescription className="text-xs">Total Requests: {totalLeaveRequests}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAnalytics ? (
               <div className="h-[280px] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 95%)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar yAxisId="right" dataKey="leave_request" fill="hsl(38, 92%, 50%)" radius={[6, 6, 0, 0]} name="Approved Leaves" barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}