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
import { Search, CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";

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

        const targetDate = new Date(selectedDate);

        if (dateViewMode === 'DAY') {
          // Fetch today's global attendance
          const attRes = await fetch(`${API_BASE_URL}/api/reports/daily-attendance?date=${selectedDate}`);
          const attData = await attRes.json();
          const globalAttendance = attData.success ? (attData.report || attData.data || []) : [];

          // Map attendance to our team employees
          const teamIds = new Set(teamEmployees.map((e: any) => e.user_id));
          const filteredAttendance = globalAttendance.filter((a: any) => teamIds.has(a.user_id));
          setAttendanceData(filteredAttendance);
        } else {
          // Fetch monthly attendance
          const month = targetDate.getMonth() + 1;
          const year = targetDate.getFullYear();
          const attRes = await fetch(`${API_BASE_URL}/api/reports/monthly-attendance?month=${month}&year=${year}&role=${role}&branch=${encodeURIComponent(userBranch || "")}&department=${encodeURIComponent(userDepartment || "")}`);
          const attData = await attRes.json();
          const monthlyAttendance = attData.success ? (attData.report || attData.data || []) : [];
          
          const teamIds = new Set(teamEmployees.map((e: any) => e.user_id));
          const filteredAttendance = monthlyAttendance.filter((a: any) => teamIds.has(a.user_id));
          setAttendanceData(filteredAttendance);
        }

      } catch (error) {
        console.error("Error fetching team attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role, userBranch, userDepartment, selectedDate, dateViewMode]);

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
  let mergedList: any[] = [];
  
  if (dateViewMode === 'DAY') {
    mergedList = employees.map(emp => {
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
        workingHours,
        date: selectedDate
      };
    });
  } else {
    // MONTH view
    mergedList = attendanceData.map(att => {
      const emp = employees.find(e => e.user_id === att.user_id) || {};
      
      let workingHours = "--";
      if (att && att.clock_in && att.clock_out) {
        const diffMs = new Date(att.clock_out).getTime() - new Date(att.clock_in).getTime();
        const hrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        workingHours = `${hrs}h ${mins}m`;
      }

      let statusLabel = att.status || "Present";
      if (statusLabel.includes('Present')) statusLabel = 'Present';
      else if (statusLabel.includes('Leave')) statusLabel = 'Leave';

      let lateLabel = "--";
      if (att.is_late) {
        lateLabel = "Late"; 
      } else if (att.clock_in) {
        lateLabel = "00:00";
      }

      return {
        ...emp,
        user_id: att.user_id,
        full_name: att.full_name || emp.full_name,
        department: emp.department || att.department,
        time_in: att.time_in || "--",
        time_out: att.time_out || "--",
        status: statusLabel,
        late: lateLabel,
        workingHours,
        date: att.date
      };
    });
  }

  // Metrics computed from merged list to reflect displayed statuses
  const presentCount = mergedList.filter(e => e.status === 'Present' || e.status === 'Outstation').length;
  const lateCount = mergedList.filter(e => (e.status === 'Present' || e.status === 'Outstation') && e.late !== '00:00' && e.late !== '--').length;
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
            <CardTitle className="text-lg whitespace-nowrap">{dateViewMode === 'DAY' ? "Today's Attendance Log" : "Monthly Attendance Log"}</CardTitle>
            
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
              {/* Date Filter */}
              <div className="relative">
                {dateViewMode === "DAY" ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="appearance-none flex items-center justify-center px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-[34px] gap-2 hover:border-[#7B0099] hover:ring-1 hover:ring-[#7B0099] transition-all">
                        {new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()} <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1" align="start">
                      <CalendarWidget
                        mode="single"
                        selected={new Date(selectedDate)}
                        onSelect={(d) => {
                          if (d) setSelectedDate(new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0]);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <input
                    type="month"
                    value={`${new Date(selectedDate).getFullYear()}-${String(new Date(selectedDate).getMonth() + 1).padStart(2, '0')}`}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedDate(`${e.target.value}-01`);
                      }
                    }}
                    className="appearance-none flex items-center justify-center px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-[34px] hover:border-[#7B0099] hover:ring-1 hover:ring-[#7B0099] transition-all"
                  />
                )}
              </div>

              {/* Day / Month Toggle */}
              <div className="flex items-center bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-md p-1 shadow-sm">
                <button 
                  onClick={() => setDateViewMode('DAY')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${dateViewMode === 'DAY' ? 'bg-[#FFFE00] text-[#7B0099] ring-1 ring-[#7B0099] shadow' : 'text-gray-500 hover:text-gray-900 dark:text-gray-100'}`}
                >
                  DAY
                </button>
                <button 
                  onClick={() => setDateViewMode('MONTH')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${dateViewMode === 'MONTH' ? 'bg-[#FFFE00] text-[#7B0099] ring-1 ring-[#7B0099] shadow' : 'text-gray-500 hover:text-gray-900 dark:text-gray-100'}`}
                >
                  MONTH
                </button>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-md p-1 shadow-sm overflow-x-auto">
                <button 
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${statusFilter === 'ALL' ? 'bg-[#FFFE00] text-[#7B0099] ring-1 ring-[#7B0099] shadow' : 'text-gray-500 hover:text-gray-900 dark:text-gray-100'}`}
                >
                  ALL
                </button>
                <button 
                  onClick={() => setStatusFilter('ON TIME')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${statusFilter === 'ON TIME' ? 'bg-[#FFFE00] text-[#7B0099] ring-1 ring-[#7B0099] shadow' : 'text-gray-500 hover:text-gray-900 dark:text-gray-100'}`}
                >
                  ON TIME
                </button>
                <button 
                  onClick={() => setStatusFilter('LATE')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${statusFilter === 'LATE' ? 'bg-[#FFFE00] text-[#7B0099] ring-1 ring-[#7B0099] shadow' : 'text-gray-500 hover:text-gray-900 dark:text-gray-100'}`}
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
                  className="pl-9 h-9 rounded-full border-gray-200 dark:border-slate-800 bg-white dark:bg-card shadow-sm text-sm"
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
                    {dateViewMode === 'MONTH' && <TableHead>Date</TableHead>}
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
                    filteredList.map((emp, idx) => (
                      <TableRow key={dateViewMode === 'MONTH' ? `${emp.user_id}-${emp.date}-${idx}` : emp.user_id}>
                        {dateViewMode === 'MONTH' && (
                          <TableCell className="whitespace-nowrap font-medium text-gray-700">
                            {new Date(emp.date).toLocaleDateString('en-GB')}
                          </TableCell>
                        )}
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
                              ${emp.status === "Outstation" ? "bg-pink-500 hover:bg-pink-600 text-white" : ""}
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
