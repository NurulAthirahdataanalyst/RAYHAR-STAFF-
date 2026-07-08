import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, Search, Clock, FileText, X, Users, CheckCircle, Briefcase, CalendarOff, AlertCircle, XCircle, Percent } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { useRole } from "@/contexts/RoleContext";

const calculateWorkingHours = (clockIn: string | null | undefined, clockOut: string | null | undefined) => {
  if (!clockIn) return "--";
  
  const start = new Date(clockIn).getTime();
  let end;
  
  if (clockOut) {
    end = new Date(clockOut).getTime();
  } else {
    // If clockOut is missing, check if it's today in UTC+8
    const clockInDate = new Date(clockIn);
    const klNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const klClockInTime = new Date(clockInDate.getTime() + 8 * 60 * 60 * 1000);
    
    const isToday = klNow.getUTCFullYear() === klClockInTime.getUTCFullYear() &&
                    klNow.getUTCMonth() === klClockInTime.getUTCMonth() &&
                    klNow.getUTCDate() === klClockInTime.getUTCDate();
    
    if (isToday) {
      end = Date.now();
    } else {
      const klEndOfDay = new Date(klClockInTime);
      klEndOfDay.setUTCHours(23, 59, 59, 999);
      end = klEndOfDay.getTime() - 8 * 60 * 60 * 1000;
    }
  }
  
  const diffMs = end - start;
  if (diffMs < 0) return "--";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export default function AttendanceReports() {
  const { role, userBranch, userDepartment } = useRole();
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // New State variables
  const [viewType, setViewType] = useState<"day" | "month">("day");
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [statusFilter, setStatusFilter] = useState("All");

  const months = [
    { value: "1", label: "January" }, { value: "2", label: "February" }, { value: "3", label: "March" },
    { value: "4", label: "April" }, { value: "5", label: "May" }, { value: "6", label: "June" },
    { value: "7", label: "July" }, { value: "8", label: "August" }, { value: "9", label: "September" },
    { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" }
  ];

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  useEffect(() => {
    fetchData();
  }, [viewType, date, selectedMonth, selectedYear, role, userBranch, userDepartment]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = "";
      const params = new URLSearchParams({
        role: role || "",
        branch: userBranch || "",
        department: userDepartment || ""
      });

      if (viewType === "day") {
        params.append("date", date);
        url = `${API_BASE_URL}/api/reports/daily-attendance?${params.toString()}`;
      } else {
        params.append("month", selectedMonth);
        params.append("year", selectedYear);
        url = `${API_BASE_URL}/api/reports/monthly-attendance?${params.toString()}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success) {
        // We will process the data to include "Status"
        let processedData = data.data.map((r: any) => {
          let calcStatus = r.status || "Unknown"; // from monthly it has status
          return { ...r, status: calcStatus };
        });
        setAttendanceData(processedData);
        if (data.summary) {
          setMonthlySummary(data.summary);
        } else {
          setMonthlySummary(null);
        }
      } else {
        setAttendanceData([]);
        setMonthlySummary(null);
      }
    } catch (error) {
      console.error("Error fetching attendance report:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredList = attendanceData.filter(e => {
    const matchesSearch = 
      e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.user_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.branch?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = statusFilter === "All" || e.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // KPI Calculations (Daily)
  const totalEmployeesDay = filteredList.length;
  const presentCountDay = filteredList.filter(a => a.status === "Present (On Time)" || a.status === "Present (Late)").length;
  const lateCountDay = filteredList.filter(a => a.status === "Present (Late)").length;
  const outstationCountDay = filteredList.filter(a => a.status === "Outstation").length;
  const leaveCountDay = filteredList.filter(a => a.status === "Company Leave" || a.status === "Approved Leave").length;
  const missingClockOutCountDay = filteredList.filter(a => a.status === "Missing Clock-Out").length;
  const absentCountDay = filteredList.filter(a => a.status === "Absent").length;
  
  const workingEmployeesDay = totalEmployeesDay - leaveCountDay;
  const attendedEmployeesDay = presentCountDay + outstationCountDay + missingClockOutCountDay;
  const attendanceRateDay = workingEmployeesDay > 0 ? Math.round((attendedEmployeesDay / workingEmployeesDay) * 100) : 0;

  // Selected KPI Data
  const totalEmployees = viewType === "day" ? totalEmployeesDay : (monthlySummary?.totalEmployees || 0);
  const presentCount = viewType === "day" ? presentCountDay : (monthlySummary?.present || 0);
  const lateCount = viewType === "day" ? lateCountDay : (monthlySummary?.late || 0);
  const outstationCount = viewType === "day" ? outstationCountDay : (monthlySummary?.outstation || 0);
  const leaveCount = viewType === "day" ? leaveCountDay : (monthlySummary?.leave || 0);
  const missingClockOutCount = viewType === "day" ? missingClockOutCountDay : (monthlySummary?.missingClockOut || 0);
  const absentCount = viewType === "day" ? absentCountDay : (monthlySummary?.absent || 0);
  const attendanceRate = viewType === "day" ? attendanceRateDay : (monthlySummary?.complianceRate || 0);



  const handleExportCSV = () => {
    const headers = viewType === "day"
      ? ["Employee ID", "Name", "Branch", "Clock In", "Clock Out", "Status", "Working Hours"]
      : ["Date", "Employee ID", "Name", "Branch", "Clock In", "Clock Out", "Status", "Working Hours"];

    const rows = filteredList.map(a => {
      const workingHrs = calculateWorkingHours(a.clock_in, a.clock_out);
      if (viewType === "day") {
        return [
          `"${(a.user_id || '').replace(/"/g, '""')}"`,
          `"${(a.full_name || '').replace(/"/g, '""')}"`,
          `"${(a.branch || 'HQ').replace(/"/g, '""')}"`,
          `"${(a.time_in || 'N/A').replace(/"/g, '""')}"`,
          `"${(a.time_out || 'N/A').replace(/"/g, '""')}"`,
          `"${(a.status || '').replace(/"/g, '""')}"`,
          `"${workingHrs}"`
        ];
      } else {
        return [
          `"${(a.date || '').replace(/"/g, '""')}"`,
          `"${(a.user_id || '').replace(/"/g, '""')}"`,
          `"${(a.full_name || '').replace(/"/g, '""')}"`,
          `"${(a.branch || 'HQ').replace(/"/g, '""')}"`,
          `"${(a.time_in || 'N/A').replace(/"/g, '""')}"`,
          `"${(a.time_out || 'N/A').replace(/"/g, '""')}"`,
          `"${(a.status || '').replace(/"/g, '""')}"`,
          `"${workingHrs}"`
        ];
      }
    });

    const csvContent = "\ufeff" + [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", viewType === "day" ? `attendance_report_${date}.csv` : `attendance_report_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          
          {/* DAY / MONTH Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewType("day")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewType === "day"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              DAY
            </button>
            <button
              onClick={() => setViewType("month")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewType === "month"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              MONTH
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {viewType === "day" ? (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="appearance-none flex items-center justify-center px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest bg-white h-10"
              />
            ) : (
              <input
                type="month"
                value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                onChange={(e) => {
                  if (e.target.value) {
                    const [yyyy, mm] = e.target.value.split('-');
                    setSelectedYear(yyyy);
                    setSelectedMonth(parseInt(mm).toString());
                  }
                }}
                className="appearance-none flex items-center justify-center px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest bg-white h-10"
              />
            )}
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] bg-white">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Select Status</SelectItem>
                <SelectItem value="Present (On Time)">Present (On Time)</SelectItem>
                <SelectItem value="Present (Late)">Present (Late)</SelectItem>
                <SelectItem value="Approved Leave">Approved Leave</SelectItem>
                <SelectItem value="Company Leave">Company Leave</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
                <SelectItem value="Weekend">Weekend</SelectItem>
                <SelectItem value="Clocked Out">Clocked Out</SelectItem>
              </SelectContent>
            </Select>

            <ExportDropdown onExportCSV={handleExportCSV} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                  <h3 className="text-2xl font-bold mt-1">{totalEmployees}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Present</p>
                  <h3 className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{presentCount}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Late</p>
                  <h3 className="text-2xl font-bold mt-1 text-yellow-600 dark:text-yellow-400">{lateCount}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Outstation</p>
                  <h3 className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{outstationCount}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <CalendarOff className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Leave</p>
                  <h3 className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">{leaveCount}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Missing Clock-Out</p>
                  <h3 className="text-2xl font-bold mt-1 text-orange-600 dark:text-orange-400">{missingClockOutCount}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Absent</p>
                  <h3 className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">{absentCount}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <Percent className="w-6 h-6 text-teal-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Attendance Compliance</p>
                  <h3 className="text-2xl font-bold mt-1 text-teal-600 dark:text-teal-400">{attendanceRate}%</h3>
                </div>
              </CardContent>
            </Card>
          </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg">
              {viewType === "day" ? "Daily Attendance Log" : "Monthly Attendance Log"}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, ID, or branch..."
                className="pl-8 pr-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  type="button"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      {viewType === "month" && <TableHead className="w-[100px]">Date</TableHead>}
                      <TableHead className="w-[100px]">Employee ID</TableHead>
                      <TableHead className="min-w-[150px] max-w-[200px]">Name</TableHead>
                      <TableHead className="w-[80px]">Branch</TableHead>
                      <TableHead className="w-[140px]">Status</TableHead>
                      <TableHead className="w-[90px]">Clock In</TableHead>
                      <TableHead className="w-[90px]">Clock Out</TableHead>
                      <TableHead className="w-[100px]">Working Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={viewType === "month" ? 8 : 7} className="text-center py-8 text-muted-foreground">
                          No attendance records found for this {viewType}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredList.map((req, idx) => (
                        <TableRow key={idx}>
                          {viewType === "month" && <TableCell>{formatDate(req.date)}</TableCell>}
                          <TableCell className="font-medium">{req.user_id}</TableCell>
                          <TableCell className="max-w-[180px] truncate" title={req.full_name}>{req.full_name}</TableCell>
                          <TableCell>{req.branch || "-"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                              req.status === 'Present (On Time)' ? 'bg-green-100 text-green-700' :
                              req.status === 'Present (Late)' ? 'bg-yellow-100 text-yellow-700' :
                              req.status === 'Missing Clock-Out' ? 'bg-orange-100 text-orange-700' :
                              req.status === 'Outstation' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {req.status}
                            </span>
                          </TableCell>
                          <TableCell>{req.time_in || "-"}</TableCell>
                          <TableCell>{req.time_out || "-"}</TableCell>
                          <TableCell>{calculateWorkingHours(req.clock_in, req.clock_out)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
