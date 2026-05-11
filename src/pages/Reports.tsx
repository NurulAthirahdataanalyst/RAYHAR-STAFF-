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
  const [monthlyData, setMonthlyData] = useState<any[]>(fallbackMonthlyData);
  const [branchComparison, setBranchComparison] = useState<any[]>(fallbackBranchComparison);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [totalLeaveRequests, setTotalLeaveRequests] = useState(0);

  // 1. Add a state for limit (Default to 10)
  const [limit, setLimit] = useState("10");

  useEffect(() => {
    if (role === "hr_admin" || role === "managing_director") {
      fetchDailyAttendance();
    }
    fetchAnalytics();

    const interval = setInterval(() => {
      if (role === "hr_admin" || role === "managing_director") {
        fetchDailyAttendance();
      }
      fetchAnalytics();
    }, 10000);

    return () => clearInterval(interval);
  }, [role]);

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const response = await fetch("https://rayhar-staff-production.up.railway.app/api/reports/analytics");
      const data = await response.json();
      if (data.success) {
        setMonthlyData(data.monthlyData.length > 0 ? data.monthlyData : fallbackMonthlyData);
        setBranchComparison(data.branchComparison.length > 0 ? data.branchComparison : fallbackBranchComparison);
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
      const response = await fetch("https://rayhar-staff-production.up.railway.app/api/reports/daily-attendance");
      const data = await response.json();
      if (data.success) {
        setDailyAttendance(data.report);
      } else {
        toast.error("Failed to load daily attendance report");
      }
    } catch (error) {
      console.error("Error fetching daily attendance:", error);
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
      } else {
        toast.error("Failed to load total leave requests");
      }
    } catch (error) {
      console.error("Error fetching total leave requests:", error);
      toast.error("Error connecting to server");
    }
  };

  useEffect(() => {
    fetchTotalLeaveRequests();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Reports & Statistics</h1>
          <p className="text-sm text-muted-foreground mt-1">Analytics about employee attendance and leaves</p>
        </div>
        <Button variant="outline" onClick={() => toast.success("Report downloaded!")}>
          <Download className="w-4 h-4 mr-2" /> Export Report
        </Button>
      </div>

      {(role === "hr_admin" || role === "managing_director") && (
        <Card className="border-none shadow-md mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Today's Attendance Overview
                </CardTitle>
                <CardDescription>Live data of employees who are coming to work today</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                {/* 3. Add a dropdown (Select) for user choice */}
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
                <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                  {dailyAttendance.length} Present
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto rounded-lg border">
              {loadingDaily ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] font-bold">
                    <tr>
                      <th className="px-4 py-3">Employee Name</th>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3">Time In</th>
                      <th className="px-4 py-3">Time Out</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dailyAttendance.length > 0 ? (
                      // 2. Slice the data before rendering
                      dailyAttendance.slice(0, parseInt(limit)).map((record) => (
                        <tr key={record.user_id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-semibold text-foreground">{record.full_name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{record.branch}</td>
                          <td className="px-4 py-3 font-mono text-xs">{record.time_in}</td>
                          <td className="px-4 py-3 font-mono text-xs">{record.time_out || "--:--"}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={record.time_out ? "secondary" : "default"}
                              className={!record.time_out ? "bg-green-100 text-green-700 hover:bg-green-200 border-none" : ""}
                            >
                              {record.time_out ? "Clocked Out" : "Active"}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
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

      <div className="flex gap-3 mt-8">
        <Select defaultValue="april">
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="january">January</SelectItem>
            <SelectItem value="february">February</SelectItem>
            <SelectItem value="march">March</SelectItem>
            <SelectItem value="april">April</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="2026">
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="attendance" stroke="hsl(174, 62%, 32%)" strokeWidth={2} dot={{ r: 4 }} name="Attendance %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {role === "hr_admin" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading">Branch Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={branchComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="branch" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar yAxisId="left" dataKey="activeRate" fill="hsla(120, 70%, 29%, 1.00)" radius={[4, 4, 0, 0]} name="Present Attendance" />
                  <Bar yAxisId="right" dataKey="totalEmployees" fill="hsl(252, 59%, 48%)" radius={[4, 4, 0, 0]} name="Total Staff" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Leave Requests</CardTitle>
            <CardDescription>Total Submitted Leave Forms: {totalLeaveRequests}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar yAxisId="right" dataKey="leave_request" fill="hsl(38, 92%, 50%)" radius={[6, 6, 0, 0]} name="Total Leave Requests" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}