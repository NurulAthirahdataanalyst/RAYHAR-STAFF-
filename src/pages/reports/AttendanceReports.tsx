import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { API_BASE_URL } from "@/config/api";
import { writePrintDocument } from "@/utils/security";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Search, X, Users, CheckCircle, Briefcase, CalendarOff, AlertCircle, XCircle, Percent, Clock, MapPin, RotateCcw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { useRole } from "@/contexts/RoleContext";
import { YearPopover } from "@/components/shared/YearPopover";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { CustomDatePicker, TablePagination } from "@/components/common/TablePagination";
import { useCompany } from "@/modules/multi-company/contexts/CompanyContext";

interface ClockSession {
  clock_in: string | null;
  clock_out: string | null;
  time_in: string | null;
  time_out: string | null;
  location?: string | null;
  distance_meters?: number | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

const formatSessionTime = (timeStr?: string | null, isoStr?: string | null): string | null => {
  if (timeStr && timeStr !== "-" && timeStr !== "N/A") {
    return String(timeStr).trim().replace(/^0(\d:)/, "$1");
  }
  if (isoStr) {
    const d = new Date(isoStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-US", {
        timeZone: "Asia/Kuala_Lumpur",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  }
  return null;
};

const calculateSessionDurationMs = (clockIn: string | null | undefined, clockOut: string | null | undefined): number => {
  if (!clockIn) return 0;
  const start = new Date(clockIn).getTime();
  if (isNaN(start)) return 0;
  let end: number;
  if (clockOut) {
    end = new Date(clockOut).getTime();
  } else {
    const clockInDate = new Date(clockIn);
    const klNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const klClockInTime = new Date(clockInDate.getTime() + 8 * 60 * 60 * 1000);
    const isToday =
      klNow.getUTCFullYear() === klClockInTime.getUTCFullYear() &&
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
  return diffMs > 0 ? diffMs : 0;
};

const calculateWorkingHours = (clockIn: string | null | undefined, clockOut: string | null | undefined) => {
  if (!clockIn) return "--";
  const diffMs = calculateSessionDurationMs(clockIn, clockOut);
  if (diffMs <= 0) return "0h 0m";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const calculateTotalWorkingHours = (record: any): string => {
  const sessions: ClockSession[] = Array.isArray(record?.sessions) ? record.sessions : [];
  if (sessions.length === 0) {
    return calculateWorkingHours(record?.clock_in, record?.clock_out);
  }
  let totalMs = 0;
  let hasValidSession = false;
  sessions.forEach((s) => {
    if (s.clock_in) {
      hasValidSession = true;
      totalMs += calculateSessionDurationMs(s.clock_in, s.clock_out);
    }
  });
  if (!hasValidSession) return "--";
  const hours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
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
  const { activeCompany } = useCompany();
  const { role, userBranch, userDepartment, userId, userName, scopeType } = useRole();

  const effectiveScope = useMemo(() => {
    const norm = (role || "").toLowerCase().trim();
    if (norm === 'employee') return 'Own Data Only';

    const s = (scopeType || "").toLowerCase().trim();
    if (s.includes('own') || s.includes('self')) return 'Own Data Only';
    if (s.includes('branch')) return 'Branch Data Only';
    if (s.includes('group') || s.includes('parent')) return 'Parent Group Data';
    if (s.includes('company staff')) return 'Company Staff Data';
    if (norm.includes('hr_admin') || norm.includes('hr admin') || norm.includes('admin') || norm.includes('managing_director') || norm.includes('md')) {
      return 'Parent Group Data';
    }
    if (norm.includes('branch_leader') || norm.includes('branch leader') || norm.includes('branch_officer')) {
      return 'Branch Data Only';
    }
    if (norm.includes('operation_manager') || norm.includes('finance_manager') || norm.includes('head_of_department') || norm.includes('hod') || norm.includes('assure')) {
      return 'Company Staff Data';
    }
    return 'Own Data Only';
  }, [scopeType, role]);

  const isOwnDataOnly = effectiveScope === 'Own Data Only';
  const isBranchOnly = effectiveScope === 'Branch Data Only';
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const tableRef = useRef<HTMLTableElement>(null);
  const [viewType, setViewType] = useState<"day" | "month" | "year">("day");
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [statusFilter, setStatusFilter] = useState("All");

  const months = [
    { value: "1", label: "January" }, { value: "2", label: "February" }, { value: "3", label: "March" },
    { value: "4", label: "April" }, { value: "5", label: "May" }, { value: "6", label: "June" },
    { value: "7", label: "July" }, { value: "8", label: "August" }, { value: "9", label: "September" },
    { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" }
  ];

  useEffect(() => {
    if (viewType === "year") {
      setPageSize(100);
      setCurrentPage(1);
    } else {
      setPageSize(15);
      setCurrentPage(1);
    }
  }, [viewType]);

  useEffect(() => {
    fetchData();
    const handleSwitch = () => {
      fetchData();
    };
    window.addEventListener('rayhar_company_switched', handleSwitch);
    return () => window.removeEventListener('rayhar_company_switched', handleSwitch);
  }, [viewType, date, selectedMonth, selectedYear, role, userBranch, userDepartment, activeCompany?.id, effectiveScope, userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        role: role || "",
        branch: (isOwnDataOnly || isBranchOnly) ? (userBranch || "") : (userBranch || ""),
        department: isOwnDataOnly ? (userDepartment || "") : (userDepartment || ""),
        company_id: (activeCompany?.id || 1).toString(),
        scope_type: effectiveScope,
        userId: userId || "",
        requesterId: userId || ""
      });
      let data: { success: boolean; data: any[]; summary?: any } = { success: true, data: [] };
      const [workAssignRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/work-assignments-all`)
      ]);
      const workAssignData = await workAssignRes.json();

      if (viewType === "day") {
        params.append("date", date);
        const res = await fetch(`${API_BASE_URL}/api/reports/daily-attendance?${params.toString()}`);
        data = await res.json();
      } else if (viewType === "month") {
        params.append("month", selectedMonth);
        params.append("year", selectedYear);
        const res = await fetch(`${API_BASE_URL}/api/reports/monthly-attendance?${params.toString()}`);
        data = await res.json();
      } else if (viewType === "year") {
        // Fetch all 12 months in parallel
        const promises = Array.from({ length: 12 }, (_, i) => {
          const p = new URLSearchParams(params.toString());
          p.append("month", (i + 1).toString());
          p.append("year", selectedYear);
          return fetch(`${API_BASE_URL}/api/reports/monthly-attendance?${p.toString()}`).then(r => r.json());
        });
        const results = await Promise.all(promises);
        let allData: any[] = [];
        let aggSummary = { totalEmployees: 0, present: 0, late: 0, outstation: 0, leave: 0, missingClockOut: 0, absent: 0, complianceRate: 0 };
        let monthsWithData = 0;
        let sumCompliance = 0;
        results.forEach(res => {
          if (res.success && Array.isArray(res.data)) {
            allData = allData.concat(res.data);
            if (res.summary) {
              aggSummary.totalEmployees = Math.max(aggSummary.totalEmployees, res.summary.totalEmployees || 0);
              aggSummary.present += res.summary.present || 0;
              aggSummary.late += res.summary.late || 0;
              aggSummary.outstation += res.summary.outstation || 0;
              aggSummary.leave += res.summary.leave || 0;
              aggSummary.missingClockOut += res.summary.missingClockOut || 0;
              aggSummary.absent += res.summary.absent || 0;
              if (res.summary.complianceRate) {
                sumCompliance += res.summary.complianceRate;
                monthsWithData++;
              }
            }
          }
        });
        if (monthsWithData > 0) aggSummary.complianceRate = Math.round(sumCompliance / monthsWithData);
        data = { success: true, data: allData, summary: aggSummary };
      }
      const assignments = (workAssignData.success && Array.isArray(workAssignData.assignments))
        ? workAssignData.assignments
        : [];

      const toDateOnly = (val: any): string => {
        if (!val) return "";
        if (typeof val === "string") {
          return val.includes("T") ? val.split("T")[0] : val.slice(0, 10);
        }
        if (val instanceof Date) {
          const y = val.getFullYear();
          const m = String(val.getMonth() + 1).padStart(2, "0");
          const d = String(val.getDate()).padStart(2, "0");
          return `${y}-${m}-${d}`;
        }
        return "";
      };

      const getTempBranchForRecord = (userId: string, recordDateStr: string) => {
        if (!userId || !recordDateStr || assignments.length === 0) return null;
        const targetDate = toDateOnly(recordDateStr);
        if (!targetDate) return null;

        const normalizedUserId = String(userId).trim().toUpperCase();

        const match = assignments.find((a: any) => {
          const aUserId = String(a.user_id || "").trim().toUpperCase();
          if (aUserId !== normalizedUserId) return false;
          if (a.status === "Cancelled" || a.status === "Rejected") return false;

          const start = toDateOnly(a.start_date);
          const end = a.end_date ? toDateOnly(a.end_date) : "2099-12-31";
          if (!start) return false;

          return targetDate >= start && targetDate <= end;
        });

        return match ? (match.temp_branch || match.temporary_branch || match.location || null) : null;
      };

      if (data.success && Array.isArray(data.data)) {
        // Group multiple clock-in/out records for the same employee on the same date into 1 single row
        const groupedMap = new Map<string, any>();

        data.data.forEach((r: any) => {
          const recDate = toDateOnly(r.date || (viewType === "day" ? date : r.clock_in));
          const normUid = String(r.user_id || "").trim().toUpperCase();
          const groupKey = viewType === "day" ? normUid : `${normUid}__${recDate}`;

          const addSessionToList = (list: ClockSession[], raw: any) => {
            if (!raw || (!raw.clock_in && !raw.time_in)) return;
            const cIn = raw.clock_in || null;
            const cOut = raw.clock_out || null;
            const tIn = formatSessionTime(raw.time_in, cIn);
            const tOut = formatSessionTime(raw.time_out, cOut);
            const isDuplicate = list.some(
              (existing) =>
                (cIn && existing.clock_in === cIn) ||
                (!cIn && existing.time_in === tIn && existing.time_out === tOut)
            );
            if (!isDuplicate) {
              list.push({
                clock_in: cIn,
                clock_out: cOut,
                time_in: tIn,
                time_out: tOut,
                location: raw.location || raw.clock_in_location || null,
                distance_meters: raw.distance_meters ?? null,
                latitude: raw.latitude ?? raw.clock_in_latitude ?? null,
                longitude: raw.longitude ?? raw.clock_in_longitude ?? null,
              });
            }
          };

          if (!groupedMap.has(groupKey)) {
            const sessions: ClockSession[] = [];
            if (Array.isArray(r.sessions) && r.sessions.length > 0) {
              r.sessions.forEach((s: any) => addSessionToList(sessions, s));
            } else {
              addSessionToList(sessions, r);
            }

            const rawStatus = r.status || "Unknown";
            let normalizedStatus = rawStatus;
            let leaveType = r.leave_type || null;

            if (rawStatus === "Leave (Company Holiday)" || (typeof rawStatus === "string" && rawStatus.includes("Company Holiday"))) {
              normalizedStatus = "Company Leave";
              leaveType = leaveType || "Company Holiday";
            } else if (typeof rawStatus === "string" && (rawStatus.startsWith("Leave (") || rawStatus === "Leave")) {
              leaveType = leaveType || rawStatus.replace(/^Leave\s*\((.*?)\)$/, "$1");
              normalizedStatus = "Approved Leave";
            }

            groupedMap.set(groupKey, {
              ...r,
              date: recDate || r.date,
              temporary_branch: undefined,
              status: normalizedStatus,
              leave_type: leaveType,
              temp_branch: getTempBranchForRecord(r.user_id, recDate),
              sessions,
            });
          } else {
            const existing = groupedMap.get(groupKey);
            if (Array.isArray(r.sessions) && r.sessions.length > 0) {
              r.sessions.forEach((s: any) => addSessionToList(existing.sessions, s));
            } else {
              addSessionToList(existing.sessions, r);
            }
            if (r.is_late) existing.is_late = true;
            if (r.missing_clock_out) existing.missing_clock_out = true;
            if (existing.status === "Absent" && r.status && r.status !== "Absent") {
              const updatedRaw = r.status;
              let updatedNormalized = updatedRaw;
              let updatedLeaveType = r.leave_type || existing.leave_type || null;
              if (updatedRaw === "Leave (Company Holiday)" || (typeof updatedRaw === "string" && updatedRaw.includes("Company Holiday"))) {
                updatedNormalized = "Company Leave";
                updatedLeaveType = updatedLeaveType || "Company Holiday";
              } else if (typeof updatedRaw === "string" && (updatedRaw.startsWith("Leave (") || updatedRaw === "Leave")) {
                updatedLeaveType = updatedLeaveType || updatedRaw.replace(/^Leave\s*\((.*?)\)$/, "$1");
                updatedNormalized = "Approved Leave";
              }
              existing.status = updatedNormalized;
              existing.leave_type = updatedLeaveType;
            }
          }
        });

        let processedData = Array.from(groupedMap.values()).map((item: any) => {
          if (Array.isArray(item.sessions) && item.sessions.length > 0) {
            item.sessions.sort((a: ClockSession, b: ClockSession) => {
              const tA = a.clock_in ? new Date(a.clock_in).getTime() : 0;
              const tB = b.clock_in ? new Date(b.clock_in).getTime() : 0;
              return tA - tB;
            });
            const first = item.sessions[0];
            const last = item.sessions[item.sessions.length - 1];
            item.clock_in = first.clock_in;
            item.time_in = first.time_in;
            item.clock_out = last.clock_out;
            item.time_out = last.time_out;
            item.latitude = first.latitude ?? item.latitude;
            item.longitude = first.longitude ?? item.longitude;
            item.distance_meters = first.distance_meters ?? item.distance_meters;
            item.location = first.location || item.location;
          }
          return item;
        });

        if (viewType === "day") {
          processedData.sort((a: any, b: any) =>
            (a.full_name || "").localeCompare(b.full_name || "")
          );
        } else if (viewType === "month") {
          const today = new Date();
          const myTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
          const todayStr = myTime.toISOString().slice(0, 10);

          const selM = parseInt(selectedMonth);
          const selY = parseInt(selectedYear);
          const isCurrentMonth = (myTime.getMonth() + 1 === selM && myTime.getFullYear() === selY);

          if (isCurrentMonth) {
            processedData = processedData.filter((r: any) => r.date <= todayStr);
          }

          processedData.sort((a: any, b: any) => {
            const dateCmp = (b.date || "").localeCompare(a.date || "");
            if (dateCmp !== 0) return dateCmp;
            return (a.full_name || "").localeCompare(b.full_name || "");
          });
        } else if (viewType === "year") {
          processedData.sort((a: any, b: any) => {
            const aDate = a.date || (a.clock_in ? a.clock_in.slice(0, 10) : "");
            const bDate = b.date || (b.clock_in ? b.clock_in.slice(0, 10) : "");
            const dateCmp = bDate.localeCompare(aDate);
            if (dateCmp !== 0) return dateCmp;
            return (a.full_name || "").localeCompare(b.full_name || "");
          });
        }

        setAttendanceData(processedData);
        setMonthlySummary(data.summary || null);
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

    let matchesStatus = statusFilter === "All" || e.status === statusFilter;
    if (!matchesStatus) {
      if (statusFilter === "Approved Leave") {
        matchesStatus =
          e.status === "Approved Leave" ||
          e.status === "Leave" ||
          (typeof e.status === "string" && e.status.startsWith("Leave") && !e.status.includes("Company Holiday"));
      } else if (statusFilter === "Company Leave") {
        matchesStatus =
          e.status === "Company Leave" ||
          e.status === "Holiday" ||
          (typeof e.status === "string" && (e.status === "Leave (Company Holiday)" || e.status.includes("Company Holiday")));
      } else if (statusFilter === "Weekend") {
        matchesStatus = e.status === "Weekend" || e.status === "Rest Day";
      }
    }

    return matchesSearch && matchesStatus;
  });

  // Determine how many Clock In / Clock Out session column pairs to display (at least 2 pairs, or more if any employee has >2 sessions)
  const maxSessions = Math.max(
    2,
    ...attendanceData.map((r: any) => (Array.isArray(r.sessions) ? r.sessions.length : 0))
  );
  const sessionIndices = Array.from({ length: maxSessions }, (_, idx) => idx);

  const pageCount = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const pagedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, viewType, date, selectedMonth, selectedYear, pageSize]);

  // KPI Calculations (each employee is 1 single row in Day view)
  const totalEmployeesDay = attendanceData.length;
  const presentCountDay = attendanceData.filter(a => a.status === "Present (On Time)" || a.status === "Present (Late)" || a.status === "Missing Clock-Out").length;
  const lateCountDay = attendanceData.filter(a => a.status === "Present (Late)" || a.is_late).length;
  const outstationCountDay = attendanceData.filter(a => a.status === "Outstation").length;
  const leaveCountDay = attendanceData.filter(a => a.status === "Company Leave" || a.status === "Approved Leave" || (typeof a.status === "string" && a.status.startsWith("Leave"))).length;
  const missingClockOutCountDay = attendanceData.filter(a => a.status === "Missing Clock-Out" || a.missing_clock_out).length;
  const absentCountDay = attendanceData.filter(a => a.status === "Absent").length;
  const workingEmployeesDay = totalEmployeesDay - leaveCountDay;
  const attendedEmployeesDay = presentCountDay + outstationCountDay;
  const attendanceRateDay = workingEmployeesDay > 0 ? Math.round((attendedEmployeesDay / workingEmployeesDay) * 100) : 0;

  const totalEmployees = viewType === "day" ? totalEmployeesDay : (monthlySummary?.totalEmployees || 0);
  const presentCount = viewType === "day" ? presentCountDay : (monthlySummary?.present || 0);
  const lateCount = viewType === "day" ? lateCountDay : (monthlySummary?.late || 0);
  const outstationCount = viewType === "day" ? outstationCountDay : (monthlySummary?.outstation || 0);
  const leaveCount = viewType === "day" ? leaveCountDay : (monthlySummary?.leave || 0);
  const missingClockOutCount = viewType === "day" ? missingClockOutCountDay : (monthlySummary?.missingClockOut || 0);
  const absentCount = viewType === "day" ? absentCountDay : (monthlySummary?.absent || 0);
  const attendanceRate = viewType === "day" ? attendanceRateDay : (monthlySummary?.complianceRate || 0);

  const handleResetFilters = () => {
    setStatusFilter("All");
    setSearchQuery("");
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedMonth((new Date().getMonth() + 1).toString());
    setSelectedYear(new Date().getFullYear().toString());
    setCurrentPage(1);
  };

  const getSortedExportList = () => {
    return [...filteredList].sort((a, b) => {
      if (viewType === "day") {
        return (a.full_name || "").localeCompare(b.full_name || "");
      }
      const aDate = a.date || (a.clock_in ? a.clock_in.slice(0, 10) : "");
      const bDate = b.date || (b.clock_in ? b.clock_in.slice(0, 10) : "");
      const dateCmp = bDate.localeCompare(aDate);
      if (dateCmp !== 0) return dateCmp;
      return (a.full_name || "").localeCompare(b.full_name || "");
    });
  };

  const handleExportCSV = () => {
    const sessionHeaders = sessionIndices.flatMap((idx) => [
      `Clock In ${idx + 1}`,
      `Clock Out ${idx + 1}`,
    ]);

    const headers = viewType === "day"
      ? ["Employee ID", "Name", "Location", ...sessionHeaders, "Status", "Working Hours", "Coordinate (Latitude&Longitude)", "Distance", "Location Status"]
      : ["Date", "Employee ID", "Name", "Location", ...sessionHeaders, "Status", "Working Hours", "Coordinate (Latitude&Longitude)", "Distance", "Location Status"];

    const sortedList = getSortedExportList();

    const rows = sortedList.map(a => {
      const workingHrs = calculateTotalWorkingHours(a);
      const coords = a.latitude && a.longitude ? `${Number(a.latitude).toFixed(6)}, ${Number(a.longitude).toFixed(6)}` : "-";
      const distance = a.distance_meters !== null && a.distance_meters !== undefined ? `${Math.round(a.distance_meters)}m` : "-";
      const locationStatus = a.location || a.clock_in_location || "-";
      const branchText = a.temp_branch ? `${a.permanent_branch || a.branch || 'HQ'} (TEMP: ${a.temp_branch})` : (a.permanent_branch || a.branch || 'HQ');

      const sessions: ClockSession[] = Array.isArray(a.sessions) ? a.sessions : [];
      const sessionCells = sessionIndices.flatMap((idx) => {
        const s = sessions[idx];
        if (s && (s.clock_in || s.time_in)) {
          const tIn = s.time_in || "N/A";
          const tOut = s.time_out || "N/A";
          return [`"${tIn.replace(/"/g, '""')}"`, `"${tOut.replace(/"/g, '""')}"`];
        }
        const emptyVal = idx === 0 && sessions.length === 0 ? "N/A" : "-";
        return [`"${emptyVal}"`, `"${emptyVal}"`];
      });

      const displayStatus = a.status
        ? `${a.status}${a.leave_type && a.leave_type !== a.status ? ` (${a.leave_type})` : ''}`
        : '';

      const baseCells = [
        `"${(a.user_id || '').replace(/"/g, '""')}"`,
        `"${(a.full_name || '').replace(/"/g, '""')}"`,
        `"${branchText.replace(/"/g, '""')}"`,
        ...sessionCells,
        `"${displayStatus.replace(/"/g, '""')}"`,
        `"${workingHrs}"`,
        `"${coords}"`,
        `"${distance}"`,
        `"${locationStatus}"`
      ];

      if (viewType === "day") {
        return baseCells;
      } else {
        return [`"${(a.date || '').replace(/"/g, '""')}"`, ...baseCells];
      }
    });

    const csvContent = "\ufeff" + [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", viewType === "day" ? `attendance_report_${date}.csv` : viewType === "month" ? `attendance_report_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.csv` : `attendance_report_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    link.click();
  };

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const sortedList = getSortedExportList();
    const sessionThs = sessionIndices
      .map((idx) => `<th>Clock In ${idx + 1}</th><th>Clock Out ${idx + 1}</th>`)
      .join("");

    const rowsHtml = sortedList
      .map((a) => {
        const workingHrs = calculateTotalWorkingHours(a);
        const branchText = a.temp_branch
          ? `${a.permanent_branch || a.branch || "HQ"} (TEMP: ${a.temp_branch})`
          : a.permanent_branch || a.branch || "HQ";
        const sessions: ClockSession[] = Array.isArray(a.sessions) ? a.sessions : [];
        const sessionTds = sessionIndices
          .map((idx) => {
            const s = sessions[idx];
            if (s && (s.clock_in || s.time_in)) {
              return `<td>${s.time_in || "N/A"}</td><td>${s.time_out || "N/A"}</td>`;
            }
            const emptyVal = idx === 0 && sessions.length === 0 ? "N/A" : "-";
            return `<td>${emptyVal}</td><td>${emptyVal}</td>`;
          })
          .join("");

        const displayStatus = a.status
          ? `${a.status}${a.leave_type && a.leave_type !== a.status ? ` (${a.leave_type})` : ''}`
          : '-';

        const coords = a.latitude && a.longitude ? `${Number(a.latitude).toFixed(6)}, ${Number(a.longitude).toFixed(6)}` : "-";
        const distance = a.distance_meters !== null && a.distance_meters !== undefined ? `${Math.round(a.distance_meters)}m` : "-";
        const locationStatus = a.location || a.clock_in_location || "-";

        return `
          <tr>
            ${viewType !== "day" ? `<td>${formatDate(a.date)}</td>` : ""}
            <td>${a.user_id || "-"}</td>
            <td>${a.full_name || "-"}</td>
            <td>${branchText}</td>
            ${sessionTds}
            <td>${displayStatus}</td>
            <td>${workingHrs}</td>
            <td>${coords}</td>
            <td>${distance}</td>
            <td>${locationStatus}</td>
          </tr>
        `;
      })
      .join("");

    const periodTitle =
      viewType === "day"
        ? `Date: ${formatDate(date)}`
        : viewType === "month"
        ? `Month: ${months.find((m) => m.value === selectedMonth)?.label || selectedMonth} ${selectedYear}`
        : `Year: ${selectedYear}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance Report - ${periodTitle}</title>
          <style>
            @page { size: landscape; margin: 8mm; }
            body { font-family: Arial, sans-serif; padding: 12px; color: #0f172a; margin: 0; }
            h1 { font-size: 16px; margin-bottom: 4px; color: #7b0099; text-transform: uppercase; }
            p { font-size: 10px; color: #475569; margin-top: 0; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; }
            th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; word-break: break-word; }
            th { background-color: #f8fafc; font-weight: 700; text-transform: uppercase; font-size: 8.5px; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Rayhar Attendance Report</h1>
          <p>${periodTitle} | Total Records: ${sortedList.length}</p>
          <table>
            <thead>
              <tr>
                ${viewType !== "day" ? "<th>Date</th>" : ""}
                <th>Employee ID</th>
                <th>Name</th>
                <th>Location</th>
                ${sessionThs}
                <th>Status</th>
                <th>Working Hours</th>
                <th>Coordinate (Latitude&Longitude)</th>
                <th>Distance</th>
                <th>Location Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `;
    writePrintDocument(printWindow, html);
  };

  const totalTableColumns = (viewType !== "day" ? 1 : 0) + 8 + maxSessions * 2;

  return (
    <div className="min-h-screen bg-background">

      <div className="w-full py-4 space-y-6">

        {/* Filter Toolbar Line directly under main header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
          {/* LEFT: DAY | MONTH | YEAR View Toggle Bar */}
          <div className="flex items-center gap-4 sm:gap-6 border-b border-gray-200 dark:border-slate-800 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setViewType("day")}
              className={`text-[11px] font-black uppercase tracking-widest pb-3 -mb-[1px] transition-colors border-b-[3px] ${
                viewType === "day"
                  ? "text-[#942392] border-[#942392]"
                  : "text-foreground hover:text-[#ffff00] border-transparent hover:border-[#ffff00]"
              }`}
            >
              DAY
            </button>
            <button
              onClick={() => setViewType("month")}
              className={`text-[11px] font-black uppercase tracking-widest pb-3 -mb-[1px] transition-colors border-b-[3px] ${
                viewType === "month"
                  ? "text-[#942392] border-[#942392]"
                  : "text-foreground hover:text-[#ffff00] border-transparent hover:border-[#ffff00]"
              }`}
            >
              MONTH
            </button>
            <button
              onClick={() => setViewType("year")}
              className={`text-[11px] font-black uppercase tracking-widest pb-3 -mb-[1px] transition-colors border-b-[3px] ${
                viewType === "year"
                  ? "text-[#942392] border-[#942392]"
                  : "text-foreground hover:text-[#ffff00] border-transparent hover:border-[#ffff00]"
              }`}
            >
              YEAR
            </button>
          </div>

          {/* RIGHT: Active Filter Controls (Date/Month Picker, Status Dropdown, Export Button) */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto sm:justify-end">
            {viewType === "day" ? (
              <CustomDatePicker
                value={date}
                onChange={setDate}
                displayFormat="DD/MM/YYYY"
                className="h-9 w-[calc(50%-0.25rem)] sm:w-auto sm:min-w-[140px] shrink-0 px-3 font-black uppercase text-[11px] tracking-widest bg-card border-slate-300 dark:border-slate-700"
              />
            ) : viewType === "month" ? (
              <MonthPicker
                monthYear={selectedMonth === 'all' ? `${selectedYear}-all` : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                onSelectMonthYear={(val) => {
                  const [y, m] = val.split('-');
                  setSelectedYear(y);
                  if (m === 'all') {
                    setSelectedMonth("all");
                  } else {
                    setSelectedMonth(parseInt(m).toString());
                  }
                }}
                className="flex items-center justify-between h-9 px-3 text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 bg-card border border-slate-300 dark:border-slate-700 rounded-md shadow-sm w-[calc(50%-0.25rem)] sm:w-auto sm:min-w-[140px] shrink-0"
              />
            ) : (
              <YearPopover year={selectedYear} onSelectYear={setSelectedYear} className="flex items-center justify-between h-9 px-3 text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 bg-card border border-slate-300 dark:border-slate-700 rounded-md shadow-sm w-[calc(50%-0.25rem)] sm:w-auto sm:min-w-[140px] shrink-0" />
            )}

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[160px] shrink-0 h-9 bg-card">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Present (On Time)">Present (On Time)</SelectItem>
                <SelectItem value="Present (Late)">Present (Late)</SelectItem>
                <SelectItem value="Approved Leave">Approved Leave</SelectItem>
                <SelectItem value="Company Leave">Company Leave</SelectItem>
                <SelectItem value="Outstation">Outstation</SelectItem>
                <SelectItem value="Missing Clock-Out">Missing Clock-Out</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
                <SelectItem value="Weekend">Weekend</SelectItem>
                <SelectItem value="Clocked Out">Clocked Out</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-3 shrink-0 text-[11px] font-black uppercase tracking-widest text-foreground border-slate-300 dark:border-slate-700 bg-card hover:bg-muted hover:text-[#942392] hover:border-[#942392] transition-all rounded-md flex items-center gap-1.5 shadow-xs cursor-pointer group"
              title="Reset all filters to ALL"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#942392] group-hover:-rotate-90 transition-transform duration-200" />
              <span>Reset</span>
            </Button>

            <div className="shrink-0 ml-auto sm:ml-0">
              <ExportDropdown onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <Card className="border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Total Employees</p>
                <h3 className="text-2xl font-bold mt-1">{totalEmployees}</h3>
              </div>
            </CardContent>
          </Card>
          <Card
            className="border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-green-500/50"
            onClick={() => setStatusFilter("Present (On Time)")}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Present</p>
                <h3 className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{presentCount}</h3>
              </div>
            </CardContent>
          </Card>
          <Card
            className="border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-yellow-500/50"
            onClick={() => setStatusFilter("Present (Late)")}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Late</p>
                <h3 className="text-2xl font-bold mt-1 text-yellow-600 dark:text-yellow-400">{lateCount}</h3>
              </div>
            </CardContent>
          </Card>
          <Card
            className="border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-500/50"
            onClick={() => setStatusFilter("Outstation")}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Outstation</p>
                <h3 className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{outstationCount}</h3>
              </div>
            </CardContent>
          </Card>
          <Card
            className="border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-purple-500/50"
            onClick={() => setStatusFilter("Approved Leave")}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <CalendarOff className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Leave</p>
                <h3 className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">{leaveCount}</h3>
              </div>
            </CardContent>
          </Card>
          <Card
            className="border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-orange-500/50"
            onClick={() => setStatusFilter("Missing Clock-Out")}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Missing Clock-Out</p>
                <h3 className="text-2xl font-bold mt-1 text-orange-600 dark:text-orange-400">{missingClockOutCount}</h3>
              </div>
            </CardContent>
          </Card>
          <Card
            className="border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-red-500/50"
            onClick={() => setStatusFilter("Absent")}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Absent</p>
                <h3 className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">{absentCount}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <Percent className="w-6 h-6 text-teal-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Attendance Compliance</p>
                <h3 className="text-2xl font-bold mt-1 text-teal-600 dark:text-teal-400">{attendanceRate}%</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Card */}
        <Card className="border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg">
              {viewType === "day" ? "Daily Attendance Log" : viewType === "month" ? "Monthly Attendance Log" : "Yearly Attendance Log"}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-foreground" />
              <Input
                placeholder="Search name, ID, or branch..."
                className="pl-8 pr-8 h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-foreground hover:text-foreground transition-colors"
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
              <div className="rounded-md border overflow-x-auto">
                <Table ref={tableRef} className="text-xs">
                  <TableHeader>
                    <TableRow>
                      {viewType !== "day" && <TableHead className="w-[100px] whitespace-nowrap">Date</TableHead>}
                      <TableHead className="w-[100px] whitespace-nowrap">Employee ID</TableHead>
                      <TableHead className="min-w-[160px] max-w-[220px]">Name</TableHead>
                      <TableHead className="w-[90px] whitespace-nowrap">Location</TableHead>
                      {sessionIndices.map((idx) => (
                        <Fragment key={`head-session-${idx}`}>
                          <TableHead className="w-[95px] whitespace-nowrap">{`Clock In ${idx + 1}`}</TableHead>
                          <TableHead className="w-[95px] whitespace-nowrap">{`Clock Out ${idx + 1}`}</TableHead>
                        </Fragment>
                      ))}
                      <TableHead className="w-[140px] whitespace-nowrap">Status</TableHead>
                      <TableHead className="w-[110px] whitespace-nowrap">Working Hours</TableHead>
                      <TableHead className="min-w-[180px] whitespace-nowrap">Coordinate (Latitude&Longitude)</TableHead>
                      <TableHead className="w-[100px] whitespace-nowrap">Distance</TableHead>
                      <TableHead className="w-[120px] whitespace-nowrap">Location Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={totalTableColumns} className="text-center py-8 text-foreground">
                          No attendance records found for this {viewType}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedList.map((req, idx) => {
                        const sessions: ClockSession[] = Array.isArray(req.sessions) ? req.sessions : [];
                        return (
                          <TableRow key={`${req.user_id}-${req.date || idx}`}>
                            {viewType !== "day" && <TableCell className="whitespace-nowrap">{formatDate(req.date)}</TableCell>}
                            <TableCell className="font-medium whitespace-nowrap">{req.user_id}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={req.full_name}>{req.full_name}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-xs">{req.permanent_branch || req.branch || "-"}</span>
                                {req.temp_branch && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700 w-fit shadow-xs">
                                    <MapPin className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" /> TEMP ASSIGNMENT : {req.temp_branch}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            {sessionIndices.map((sIdx) => {
                              const s = sessions[sIdx];
                              const hasSession = Boolean(s && (s.clock_in || s.time_in));
                              const inText = hasSession ? (s.time_in || "N/A") : "-";
                              const outText = hasSession ? (s.time_out || "N/A") : "-";
                              return (
                                <Fragment key={`cell-session-${req.user_id}-${sIdx}`}>
                                  <TableCell className="whitespace-nowrap">{inText}</TableCell>
                                  <TableCell className="whitespace-nowrap">{outText}</TableCell>
                                </Fragment>
                              );
                            })}
                            <TableCell>
                              {(() => {
                                const getStatusBadgeStyle = (status: string) => {
                                  if (status === 'Present (On Time)') return { badge: 'bg-[#fdf4ff] text-[#942392] border-[#942392]/20 dark:bg-[#942392]/10', dot: 'bg-[#942392]' };
                                  if (status === 'Present (Late)') return { badge: 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/20', dot: 'bg-yellow-500' };
                                  if (status === 'Missing Clock-Out') return { badge: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20', dot: 'bg-orange-500' };
                                  if (status === 'Outstation') return { badge: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20', dot: 'bg-blue-500' };
                                  if (status === 'Approved Leave' || status === 'Company Leave' || (typeof status === 'string' && status.startsWith('Leave'))) return { badge: 'bg-[#fdf4ff] text-[#942392] border-[#942392]/20 dark:bg-[#942392]/10', dot: 'bg-[#942392]' };
                                  if (status === 'Weekend' || status === 'Rest Day') return { badge: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:border-slate-500/20 dark:text-slate-300', dot: 'bg-slate-400' };
                                  if (status === 'Absent') return { badge: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:border-red-500/20', dot: 'bg-red-500' };
                                  return { badge: 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-500/10 dark:border-slate-500/20', dot: 'bg-slate-400' };
                                };
                                const conf = getStatusBadgeStyle(req.status);
                                const missingConf = req.is_late 
                                  ? { badge: 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/20', dot: 'bg-yellow-500', label: 'Present (Late)' }
                                  : { badge: 'bg-[#fdf4ff] text-[#942392] border-[#942392]/20 dark:bg-[#942392]/10', dot: 'bg-[#942392]', label: 'Present (On Time)' };

                                return (
                                  <div className="flex flex-col items-start gap-1">
                                    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 text-[10px] tracking-wider font-black uppercase rounded-full border shadow-2xs ${conf.badge}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dot}`} />
                                      <span>{req.status}</span>
                                    </span>
                                    {req.leave_type && req.leave_type !== req.status && (
                                      <span className="text-[10px] text-muted-foreground font-semibold pl-1">
                                        {req.leave_type}
                                      </span>
                                    )}
                                    {req.status === 'Missing Clock-Out' && (
                                      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 text-[10px] tracking-wider font-black uppercase rounded-full border shadow-2xs ${missingConf.badge}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${missingConf.dot}`} />
                                        <span>{missingConf.label}</span>
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-medium">{calculateTotalWorkingHours(req)}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {req.latitude && req.longitude
                                ? `${Number(req.latitude).toFixed(6)}, ${Number(req.longitude).toFixed(6)}`
                                : "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {req.distance_meters !== null && req.distance_meters !== undefined
                                ? `${Math.round(req.distance_meters)}m`
                                : "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {(req.location || req.clock_in_location) ? (
                                <span className={`whitespace-nowrap px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                                  (req.location || req.clock_in_location).includes('ON-SITE')
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                }`}>
                                  {req.location || req.clock_in_location}
                                </span>
                              ) : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          {!loading && filteredList.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredList.length}
              pageSize={pageSize}
              pageSizeOptions={viewType === "year" ? [100, 300, 500] : [10, 25, 50, 100]}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              tableRef={tableRef}
            />
          )}
        </Card>

      </div>
    </div>
  );
}
