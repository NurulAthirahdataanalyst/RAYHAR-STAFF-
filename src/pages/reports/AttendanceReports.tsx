import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, Search, Clock, FileText } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { useRole } from "@/contexts/RoleContext";

export default function AttendanceReports() {
  const { role, userBranch, userDepartment } = useRole();
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
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
      } else {
        setAttendanceData([]);
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

  const handleExportCSV = () => {
    const headers = viewType === "day" 
      ? ["Employee ID,Name,Branch,Clock In,Clock Out,Status"]
      : ["Date,Employee ID,Name,Branch,Clock In,Clock Out,Status"];
      
    const rows = filteredList.map(a => {
      if (viewType === "day") {
        return `${a.user_id},"${a.full_name}","${a.branch}",${a.time_in || 'N/A'},${a.time_out || 'N/A'},"${a.status}"`;
      } else {
        return `${a.date},${a.user_id},"${a.full_name}","${a.branch}",${a.time_in || 'N/A'},${a.time_out || 'N/A'},"${a.status}"`;
      }
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", viewType === "day" ? `attendance_report_${date}.csv` : `attendance_report_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.csv`);
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <h3 className="text-3xl font-bold mt-1">{filteredList.length}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clocked In (Total)</p>
                <h3 className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">
                  {filteredList.filter(a => a.status.startsWith("Present")).length}
                </h3>
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
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {viewType === "month" && <TableHead>Date</TableHead>}
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={viewType === "month" ? 7 : 6} className="text-center py-8 text-muted-foreground">
                          No attendance records found for this {viewType}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredList.map((req, idx) => (
                        <TableRow key={idx}>
                          {viewType === "month" && <TableCell>{req.date || "-"}</TableCell>}
                          <TableCell className="font-medium">{req.user_id}</TableCell>
                          <TableCell>{req.full_name}</TableCell>
                          <TableCell>{req.branch || "-"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full \${
                              req.status === 'Present (On Time)' ? 'bg-green-100 text-green-700' :
                              req.status === 'Present (Late)' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {req.status}
                            </span>
                          </TableCell>
                          <TableCell>{req.time_in || "-"}</TableCell>
                          <TableCell>{req.time_out || "-"}</TableCell>
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
