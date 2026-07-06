import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Clock, AlertCircle, Building2, Calendar, Download, ChevronDown } from "lucide-react";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportToCSV } from "@/utils/export";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function TeamAttendance() {
  const { role, userBranch, userDepartment } = useRole();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateViewMode, setDateViewMode] = useState("DAY");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("page-header-actions"));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch employees for this manager
        const empParams = new URLSearchParams({
          role: role || "",
          branch: userBranch || "",
          department: userDepartment || "",
        });
        const empRes = await fetch(`${API_BASE_URL}/api/employees?${empParams}`);
        const empData = await empRes.json();
        
        let teamEmployees = empData.success ? empData.employees : [];
        if (role === 'head_of_department') {
          teamEmployees = teamEmployees.filter((e: any) => e.department === userDepartment && e.branch === userBranch);
        }
        setEmployees(teamEmployees);

        // Fetch today's global attendance
        const attRes = await fetch(`${API_BASE_URL}/api/reports/daily-attendance?date=${selectedDate}`);
        const attData = await attRes.json();
        const globalAttendance = attData.success ? (attData.report || attData.data || []) : [];

        // Map attendance to our team employees
        const teamIds = new Set(teamEmployees.map((e: any) => e.user_id));
        const filteredAttendance = globalAttendance.filter((a: any) => teamIds.has(a.user_id));
        setAttendanceData(filteredAttendance);

      } catch (error) {
        console.error("Error fetching team attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role, userBranch, userDepartment, selectedDate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate metrics (will compute after merging attendance into employee list)
  const totalTeam = employees.length;

  // Merge employee info with their attendance
  const mergedList = employees.map(emp => {
    const att = attendanceData.find(a => a.user_id === emp.user_id);
    let workingHours = "--";
    if (att && att.clock_in && att.clock_out) {
      const diffMs = new Date(att.clock_out).getTime() - new Date(att.clock_in).getTime();
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      workingHours = `${hrs}h ${mins}m`;
    }
    
    let statusLabel = "Absent";
    let lateLabel = "--";

    if (att) {
      if (att.status === "Present (On Time)" || att.status === "Present (Late)") {
        statusLabel = "Present";
      } else if (att.status === "Approved Leave") {
        statusLabel = "Leave";
      } else {
        statusLabel = att.status || "Absent";
      }

      if (att.is_late && att.late_minutes != null && att.late_minutes > 0) {
        const hrs = Math.floor(att.late_minutes / 60);
        const mins = att.late_minutes % 60;
        lateLabel = hrs > 0
          ? `${hrs}h ${String(mins).padStart(2, '0')}m`
          : `${mins} mins`;
      } else if (att && att.clock_in) {
        lateLabel = "00:00";
      }
    }

    return {
      ...emp,
      time_in: att?.time_in || "--",
      time_out: att?.time_out || "--",
      status: statusLabel,
      late: lateLabel,
      workingHours
    };
  });

  // Metrics computed from merged list to reflect displayed statuses
  const presentCount = mergedList.filter(e => e.status === 'Present').length;
  const lateCount = mergedList.filter(e => e.status === 'Present' && e.late !== '00:00' && e.late !== '--').length;
  const absentCount = mergedList.filter(e => e.status === 'Absent').length;

  let filteredList = mergedList.filter(e => 
    e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.user_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (statusFilter === "ON TIME") {
    filteredList = filteredList.filter(e => e.status === "Present" && e.late === "00:00");
  } else if (statusFilter === "LATE") {
    filteredList = filteredList.filter(e => e.status === "Present" && e.late !== "00:00" && e.late !== "--");
  }

  return (
    <div className="min-h-screen bg-background">
      {portalTarget && createPortal(
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs font-semibold border-primary/20 bg-primary/5 px-3 py-1.5 flex items-center shadow-sm">
            <Building2 className="w-3.5 h-3.5 mr-1.5 text-primary" />
            {role === 'hr_admin' ? 'All Branches' : userBranch || 'HQ'}
          </Badge>
          {role === 'head_of_department' && (
            <Badge variant="outline" className="text-xs font-semibold border-primary/20 bg-primary/5 px-3 py-1.5 flex items-center shadow-sm">
              <Users className="w-3.5 h-3.5 mr-1.5 text-primary" />
              {userDepartment || 'All Departments'}
            </Badge>
          )}
        </div>,
        portalTarget
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Size</p>
                <h3 className="text-3xl font-bold mt-1">{totalTeam}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Present Today</p>
                <h3 className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">{presentCount}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Late Today</p>
                <h3 className="text-3xl font-bold mt-1 text-amber-600 dark:text-amber-400">{lateCount}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Absent</p>
                <h3 className="text-3xl font-bold mt-1 text-red-600 dark:text-red-400">{absentCount}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <CardTitle className="text-lg whitespace-nowrap">Today's Attendance Log</CardTitle>
            
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
              {/* Date Picker */}
              <div className="relative inline-flex">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" size="sm" className="bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100 h-9 rounded-md px-4 flex items-center gap-2 shadow-sm text-xs font-bold pointer-events-none">
                  <span>{`${new Date(selectedDate).getDate()}/${(new Date(selectedDate).getMonth() + 1).toString().padStart(2, '0')}/${new Date(selectedDate).getFullYear()}`}</span>
                  <Calendar className="w-4 h-4 text-gray-600" />
                </Button>
              </div>

              {/* Day / Month Toggle */}
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-md p-1 shadow-sm">
                <button 
                  onClick={() => setDateViewMode('DAY')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${dateViewMode === 'DAY' ? 'bg-[#7B0099] text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  DAY
                </button>
                <button 
                  onClick={() => setDateViewMode('MONTH')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${dateViewMode === 'MONTH' ? 'bg-[#7B0099] text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  MONTH
                </button>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-md p-1 shadow-sm overflow-x-auto">
                <button 
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${statusFilter === 'ALL' ? 'bg-[#7B0099] text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  ALL
                </button>
                <button 
                  onClick={() => setStatusFilter('ON TIME')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${statusFilter === 'ON TIME' ? 'bg-[#7B0099] text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  ON TIME
                </button>
                <button 
                  onClick={() => setStatusFilter('LATE')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${statusFilter === 'LATE' ? 'bg-[#7B0099] text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  LATE
                </button>
              </div>

              <ExportDropdown 
                onExportCSV={() => exportToCSV(filteredList, 'Team_Attendance')} 
                onExportPDF={() => window.print()} 
              />

              {/* Search */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search employee..."
                  className="pl-9 h-9 rounded-full border-gray-200 bg-white shadow-sm text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Working Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No team members found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredList.map((emp) => (
                      <TableRow key={emp.user_id}>
                        <TableCell className="font-medium">{emp.user_id}</TableCell>
                        <TableCell>{emp.full_name}</TableCell>
                        <TableCell>{emp.department || "-"}</TableCell>
                        <TableCell>{emp.time_in}</TableCell>
                        <TableCell>{emp.time_out}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={emp.status === "Present" ? "default" : (emp.status === "Absent" ? "destructive" : "secondary")} 
                            className={`
                              ${emp.status === "Present" ? "bg-green-500 hover:bg-green-600" : ""} 
                              ${emp.status === "Company Leave" ? "bg-violet-500 hover:bg-violet-600 text-white" : ""} 
                              ${emp.status === "Leave" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""} 
                              ${emp.status === "Holiday" ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}
                              ${emp.status === "Weekend" ? "bg-slate-400 hover:bg-slate-500 text-white" : ""}
                            `}
                          >
                            {emp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-rose-600">{emp.late}</TableCell>
                        <TableCell className="font-medium text-gray-700">{emp.workingHours}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
