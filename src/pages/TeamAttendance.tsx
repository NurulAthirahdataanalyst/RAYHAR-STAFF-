import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Clock, AlertCircle, Building2, CalendarDays, Search, MapPin, X, ChevronLeft, ChevronRight } from 'lucide-react';

import PageActions from "@/components/layout/PageActions";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportToCSV } from "@/utils/export";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MonthPicker } from "@/components/shared/MonthPicker";
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

  const [entriesPerPage, setEntriesPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedDate, dateViewMode, entriesPerPage]);

  
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [apiBranches, setApiBranches] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/branches`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.branches) {
          setApiBranches(data.branches);
        }
      })
      .catch(console.error);
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const openHistory = async (userId: string) => {
    setHistoryFor(userId);
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/employee-location-history?userId=${encodeURIComponent(userId)}&days=14`);
      const j = await res.json();
      
      const now = new Date();
      const attRes = await fetch(`${API_BASE_URL}/api/attendance/history?userId=${encodeURIComponent(userId)}&month=all&year=${now.getFullYear()}`);
      const attJ = await attRes.json();
      const attendanceLogs = attJ.success && attJ.history ? attJ.history : [];

      if (j && j.success) {
        const sorted = (j.history || []).slice().sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        sorted.forEach((loc: any) => {
          const locTime = new Date(loc.timestamp).getTime();
          const matchingAtt = attendanceLogs.find((a: any) => {
            if (!a.clock_in) return false;
            const ciTime = new Date(a.clock_in).getTime();
            if (Math.abs(locTime - ciTime) < 120000) return true;
            if (a.clock_out) {
              const coTime = new Date(a.clock_out).getTime();
              if (Math.abs(locTime - coTime) < 120000) return true;
            }
            return false;
          });
          
          if (matchingAtt) {
            const ciTime = new Date(matchingAtt.clock_in).getTime();
            const coTime = matchingAtt.clock_out ? new Date(matchingAtt.clock_out).getTime() : 0;
            if (Math.abs(locTime - ciTime) < 120000) loc.attendance_status = "Clock In";
            else if (coTime && Math.abs(locTime - coTime) < 120000) loc.attendance_status = "Clock Out";
          }
        });
        
        setHistory(sorted);
      } else {
        setHistory([]);
      }
    } catch (e) {
      setHistory([]);
    }
    setHistoryLoading(false);
  };

  const closeHistory = () => {
    setHistoryFor(null);
    setHistory([]);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && historyFor) {
        closeHistory();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [historyFor]);

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
        const [empRes, workAssignRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/employees?${empParams}`),
          fetch(`${API_BASE_URL}/api/work-assignments-all`)
        ]);
        const empData = await empRes.json();
        const workAssignData = await workAssignRes.json();
        
        const tempMap: Record<string, string> = {};
        if (workAssignData.success && Array.isArray(workAssignData.assignments)) {
          workAssignData.assignments.forEach((a: any) => {
            if (a.status === 'Active') {
              tempMap[a.user_id] = a.temp_branch;
            }
          });
        }
        
        let teamEmployees = empData.success ? empData.employees.map((e: any) => ({
          ...e,
          temp_branch: e.temp_branch || tempMap[e.user_id] || null
        })) : [];
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
          statusLabel = att.clock_out ? "Clocked Out" : "Present";
        } else if (att.status === "Approved Leave") {
          statusLabel = "Leave";
        } else {
          statusLabel = att.status || "Absent";
          if (statusLabel === "Missing Clock-Out" && att.clock_out) {
            statusLabel = "Clocked Out";
          }
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
        date: selectedDate,
        clock_in_location: att?.clock_in_location || null
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
      if (statusLabel.includes('Present')) {
        statusLabel = att.clock_out ? "Clocked Out" : "Present";
      } else if (statusLabel.includes('Leave')) {
        statusLabel = 'Leave';
      } else if (statusLabel === "Missing Clock-Out" && att.clock_out) {
        statusLabel = "Clocked Out";
      }

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
  } else if (statusFilter === "ABSENT") {
    filteredList = filteredList.filter(e => e.status === "Absent");
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredList.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + entriesPerPage);


  return (
    <div className="min-h-screen bg-background space-y-6 animate-in fade-in duration-500 pb-8">
      
      
      

      <div className="w-full py-0">
        {/* Metrics */}
        
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 border-l-[#7B0099]">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Team Size</p>
                <h3 className="text-3xl font-bold mt-1">{totalTeam}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 border-l-green-500">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Present Today</p>
                <h3 className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">{presentCount}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 border-l-amber-500">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Late Today</p>
                <h3 className="text-3xl font-bold mt-1 text-amber-600 dark:text-amber-400">{lateCount}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 border-l-red-500">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Absent</p>
                <h3 className="text-3xl font-bold mt-1 text-red-600 dark:text-red-400">{absentCount}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-col gap-4 bg-white dark:bg-card">
            {/* Row 1: Title and Export Button */}
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg whitespace-nowrap text-slate-800 dark:text-slate-100 font-black">
                {dateViewMode === 'DAY' ? "Today's Attendance Log" : "Monthly Attendance Log"}
              </CardTitle>
              
              <ExportDropdown 
                onExportCSV={() => exportToCSV(filteredList, 'Team_Attendance')} 
                onExportPDF={() => window.print()} 
              />
            </div>

            {/* Row 2: DAY/MONTH toggle and Filters */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 w-full">
              {/* Left side: DAY / MONTH Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-900/50 rounded-lg p-1 border border-slate-300 dark:border-slate-700">
                <button 
                  onClick={() => setDateViewMode('DAY')}
                  className={`h-7 px-4 text-[11px] font-bold tracking-widest rounded-md transition-all ${dateViewMode === 'DAY' ? 'bg-[#7B0099] text-white shadow-sm' : 'text-foreground hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  DAY
                </button>
                <button 
                  onClick={() => setDateViewMode('MONTH')}
                  className={`h-7 px-4 text-[11px] font-bold tracking-widest rounded-md transition-all ${dateViewMode === 'MONTH' ? 'bg-[#7B0099] text-white shadow-sm' : 'text-foreground hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  MONTH
                </button>
              </div>

              {/* Right side: Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                {/* Date Filter */}
                <div className="relative">
                  {dateViewMode === "DAY" ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="appearance-none flex items-center justify-center px-4 py-2 bg-white dark:bg-card border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-[34px] gap-2 hover:border-[#7B0099] hover:ring-1 hover:ring-[#7B0099] transition-all">
                          {new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()} <CalendarDays className="w-4 h-4 text-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 overflow-hidden border-none shadow-xl" align="start">
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
                    <MonthPicker
                      monthYear={`${new Date(selectedDate).getFullYear()}-${String(new Date(selectedDate).getMonth() + 1).padStart(2, '0')}`}
                      onSelectMonthYear={(val) => {
                        setSelectedDate(`${val}-01`);
                      }}
                      className="appearance-none flex items-center justify-between gap-3 min-w-[140px] px-4 py-2 bg-white dark:bg-card border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none focus:border-[#7B0099] focus:ring-1 focus:ring-[#7B0099] uppercase tracking-widest h-[34px]"
                    />
                  )}
                </div>

                {/* Status Toggle */}
                <div className="flex items-center bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-md p-1 shadow-sm overflow-x-auto">
                  {["ALL", "ON TIME", "LATE", "ABSENT"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${statusFilter === status ? 'bg-white dark:bg-card text-foreground shadow-sm ring-1 ring-[#7B0099]' : 'text-foreground hover:text-gray-900 dark:text-gray-100'}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="flex flex-wrap items-center gap-3">
                  

                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 absolute left-3 text-foreground" />
                    <Input
                      placeholder="Search Employee..."
                      className="pl-9 h-[34px] w-[200px] text-xs bg-white dark:bg-card"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground z-10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Working Hours</TableHead>
                      <TableHead>Coordinate (Latitude, Longitude)</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Location Status</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {paginatedList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-foreground">
                        No team members found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedList.map((emp, idx) => (
                      <TableRow key={dateViewMode === 'MONTH' ? `${emp.user_id}-${emp.date}-${idx}` : emp.user_id}>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {emp.date ? new Date(emp.date).toLocaleDateString('en-GB') : new Date(selectedDate).toLocaleDateString('en-GB')}
                          </TableCell>
                          <TableCell className="font-medium">{emp.user_id}</TableCell>
                          <TableCell>
                            <span className="font-medium text-xs">{emp.full_name}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-xs">{emp.branch || "-"}</span>
                              {(emp.temp_branch || (emp as any).temporary_branch) && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700 w-fit shadow-xs mt-0.5">
                                  <MapPin className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" /> Temp: {emp.temp_branch || (emp as any).temporary_branch}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`whitespace-nowrap px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                              emp.status === 'Present' || emp.status === 'Present (On Time)' ? 'bg-green-100 text-green-700' :
                              emp.status === 'Present (Late)' ? 'bg-yellow-100 text-yellow-700' :
                              emp.status === 'Clocked Out' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' :
                              emp.status === 'Missing Clock-Out' ? 'bg-orange-100 text-orange-700' :
                              emp.status === 'Outstation' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {emp.status}
                            </span>
                          </TableCell>
                          <TableCell>{emp.time_in || "-"}</TableCell>
                          <TableCell>{emp.time_out || "-"}</TableCell>
                          <TableCell className="font-medium text-gray-700">{emp.workingHours}</TableCell>
                  <TableCell>{emp.latitude && emp.longitude ? `${Number(emp.latitude).toFixed(6)}, ${Number(emp.longitude).toFixed(6)}` : (emp.clock_in_location || "N/A")}</TableCell>
                  <TableCell>{emp.distance_meters != null ? `${Math.round(emp.distance_meters)} m` : "N/A"}</TableCell>
                          <TableCell>
                            <Button onClick={() => openHistory(emp.user_id)} variant="outline" size="sm">History</Button>
                          </TableCell>
                        </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
              {filteredList.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                    <span>TOTAL SHOWING {startIndex + 1} TO {Math.min(startIndex + entriesPerPage, filteredList.length)} OF {filteredList.length} ENTRIES</span>
                    <div className="flex items-center gap-2">
                      <span>Show</span>
                      <Select 
                        value={entriesPerPage.toString()} 
                        onValueChange={(val) => { setEntriesPerPage(Number(val)); setCurrentPage(1); }}
                      >
                        <SelectTrigger className="h-7 text-[10px] font-bold rounded border-border w-[60px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[10px] font-bold rounded"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      {"<"}
                    </Button>
                    <div className="flex items-center gap-1 overflow-x-auto max-w-[150px] sm:max-w-none scrollbar-hide">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-7 w-7 p-0 text-[10px] font-bold rounded ${currentPage === pageNum ? 'bg-[#7B0099] text-white hover:bg-[#680082]' : 'text-foreground'}`}
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[10px] font-bold rounded"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      {">"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

      </div>

      {historyFor && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) closeHistory(); }}>
          <div className="w-full max-w-5xl bg-card rounded-lg p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black uppercase">Location History - {employees.find(e => e.user_id === historyFor)?.full_name || historyFor}</h3>
              <Button onClick={closeHistory} variant="ghost" size="sm">Close</Button>
            </div>
            <div className="flex-1 border border-border rounded-lg flex flex-col overflow-hidden relative"><div className="flex-1 overflow-auto" id="team-location-history-scroll">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm border-b">
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Coordinate (Latitude, Longitude)</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Distance from Branch</TableHead>
                    <TableHead>Location Status</TableHead>
                    <TableHead>Attendance Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Loading history...</TableCell></TableRow>
                  ) : history.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No history found</TableCell></TableRow>
                  ) : (
                    history.map((h, i) => {
                      const emp = employees.find(e => e.user_id === historyFor);
                      const branchName = emp?.branch || "HQ";
                      
                      let distance: number | null = null;
                      // We don't have apiBranches in TeamAttendance, so distance might be N/A
                      
                          const branchData = apiBranches.find((b: any) => b.branch_code === branchName);
                          if (branchData && branchData.latitude && branchData.longitude && h.lat && h.lng) {
                            distance = calculateDistance(Number(h.lat), Number(h.lng), Number(branchData.latitude), Number(branchData.longitude));
                          }
                      const isNoGPS = Number(h.lat) === 0 && Number(h.lng) === 0;

                      return (
                        <TableRow key={i}>
                          <TableCell>{new Date(h.timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
                          <TableCell>{isNoGPS ? "N/A" : `${Number(h.lat).toFixed(7)}, ${Number(h.lng).toFixed(7)}`}</TableCell>
                          <TableCell>{branchName}</TableCell>
                          <TableCell>{isNoGPS ? "-" : (distance !== null ? `${Math.round(distance)} m` : "N/A")}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-200 dark:border-green-800/30 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                              On-site
                            </span>
                          </TableCell>
                          <TableCell>
                            {h.attendance_status ? (
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${
                                h.attendance_status === 'Clock In' 
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${h.attendance_status === 'Clock In' ? 'bg-blue-500' : 'bg-indigo-500'}`} />
                                {h.attendance_status}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


