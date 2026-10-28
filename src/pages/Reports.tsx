import { writePrintDocument } from '@/utils/security';

import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, FileBarChart, Loader2, Users, TrendingUp, History, Calendar, Filter, 
  Activity, Clock, AlertCircle, Sparkles, Plus, Check, Trash2, Building2, UserPlus, 
  Settings2, RefreshCw, BarChart2, PieChart, Info, ShieldAlert, MapPin, ChevronDown, FileText, FileSpreadsheet, Briefcase
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, Cell, PieChart as RechartsPieChart, Pie
} from "recharts";
import LeaveAnalytics from "./LeaveAnalytics";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE_URL } from "../config/api";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { YearPopover } from "@/components/shared/YearPopover";
import { AnimatedCheckbox } from "@/components/ui/animated-checkbox";
import { useCompany } from "@/modules/multi-company/contexts/CompanyContext";

const fallbackMonthlyData = [
  { month: "Jan", attendance: 94, leave_request: 18 },
  { month: "Feb", attendance: 96, leave_request: 12 },
  { month: "Mar", attendance: 93, leave_request: 22 },
  { month: "Apr", attendance: 95, leave_request: 15 },
];

const formatAttendanceTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return "--:--";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

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

interface AttendanceRecord {
  user_id: string;
  full_name: string;
  branch: string;
  clock_in: string;
  clock_out: string | null;
  time_in: string;
  time_out: string | null;
}

interface Branch {
  code: string;
  name: string;
}

interface Department {
  name: string;
  employee_count: number;
}

export default function Reports() {
  const { role, userBranch, userDepartment, userId } = useRole();
  const { companies, activeCompany } = useCompany();
  const normRole = (role || "").toLowerCase().trim();
  const isHRAdmin = ['hr_admin', 'admin', 'hr'].includes(normRole);
  const isMD_OM = ['managing_director', 'operation_manager', 'finance_manager', 'md'].includes(normRole);
  const isFullAdmin = isHRAdmin || isMD_OM;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("presenceSidebarCollapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    const handleSidebarChange = () => {
      setSidebarCollapsed(localStorage.getItem("presenceSidebarCollapsed") === "true");
    };
    window.addEventListener("presenceSidebarCollapsedChanged", handleSidebarChange);
    return () => {
      window.removeEventListener("presenceSidebarCollapsedChanged", handleSidebarChange);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<"attendance" | "leave" | "generator" | "settings" | "leave_monitoring">("generator");
  
  // Dynamic Lists from Database
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [deptStats, setDeptStats] = useState<Department[]>([]);

  // Attendance & Punctuality State
  const [dailyAttendance, setDailyAttendance] = useState<AttendanceRecord[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({
    presentToday: 0,
    lateArrivals: 0,
    absentToday: 0,
    attendanceRate: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [branchComparison, setBranchComparison] = useState<any[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [totalLeaveRequests, setTotalLeaveRequests] = useState(0);
  const [limit, setLimit] = useState("10");
  const [anomaliesLimit, setAnomaliesLimit] = useState("10");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [periodMode, setPeriodMode] = useState<"year" | "month">("month");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [anomaliesCurrentPage, setAnomaliesCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [limit, selectedBranchFilter, selectedDate]);

  useEffect(() => {
    setAnomaliesCurrentPage(1);
  }, [anomaliesLimit, selectedBranchFilter, selectedDate]);

  const liveTimeRange = "today";
  const [liveRegion, setLiveRegion] = useState("all");

  // Leave Utilization State
  const [leaveUtilization, setLeaveUtilization] = useState<any>(null);
  const [loadingLeave, setLoadingLeave] = useState(false);

  // Settings config values (Dynamic fetch with static fallback)
  const [workStartTime, setWorkStartTime] = useState("09:00 AM");

  // Multi-Company Checkbox Filter for HR
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>(() => {
    return activeCompany?.id ? [activeCompany.id] : [1];
  });

  useEffect(() => {
    const handleCompanySwitched = (e: any) => {
      const newId = e.detail?.company_id || e.detail?.company?.id;
      if (newId) {
        setSelectedCompanyIds([newId]);
      }
    };
    window.addEventListener('rayhar_company_switched', handleCompanySwitched);
    return () => window.removeEventListener('rayhar_company_switched', handleCompanySwitched);
  }, []);

  // Filtered branches based on company selection
  const filteredBranches = useMemo(() => {
    if (!isFullAdmin || selectedCompanyIds.length === 0 || selectedCompanyIds.length === companies.length) {
      return branches;
    }
    return branches.filter((b: any) => {
      const bCompanyId = b.company_id || (b.code?.toUpperCase() === 'RAYRENT' ? 2 : 1);
      return selectedCompanyIds.includes(bCompanyId);
    });
  }, [branches, selectedCompanyIds, companies.length, isFullAdmin]);

  // Report Generator State
  const [generatorType, setGeneratorType] = useState<"stability" | "trends" | "leave" | "financial" | "outstation" | "company_leave">("trends");
  const [generatorDept, setGeneratorDept] = useState("all");
  const [generatorBranch, setGeneratorBranch] = useState("all");
  const [generatorRange, setGeneratorRange] = useState("ytd");
  const [generatorFormat, setGeneratorFormat] = useState<"pdf" | "excel" | "csv">("pdf");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);

  useEffect(() => {
    if (generatorBranch !== 'all' && filteredBranches.length > 0 && !filteredBranches.some(b => b.code === generatorBranch)) {
      setGeneratorBranch('all');
    }
  }, [filteredBranches, generatorBranch]);

  // Sync role-based default scope
  useEffect(() => {
    const norm = (role || "").toLowerCase().trim();
    if (norm === "branch_leader" && userBranch) {
      setGeneratorBranch(userBranch);
    } else if ((norm === "head_of_department" || norm === "hod") && userDepartment) {
      setGeneratorDept(userDepartment);
    }
  }, [role, userBranch, userDepartment]);

  const fetchPreviewCount = useCallback(async () => {
    try {
      const norm = (role || "").toLowerCase().trim();
      const isBL = norm === "branch_leader";
      const isHOD = norm === "head_of_department" || norm === "hod";

      const effectiveBranch = isBL ? (userBranch || generatorBranch) : generatorBranch;
      const effectiveDept = isHOD ? (userDepartment || generatorDept) : generatorDept;

      const companiesParam = (!isFullAdmin || selectedCompanyIds.length === 0 || selectedCompanyIds.length === companies.length)
        ? "all"
        : selectedCompanyIds.join(",");

      const params = new URLSearchParams({
        type: generatorType,
        month: selectedMonth,
        year: selectedYear,
        branch: effectiveBranch || "all",
        department: effectiveDept || "all",
        companies: companiesParam,
        requesterRole: role || "",
        requesterBranch: userBranch || "",
        requesterDept: userDepartment || "",
        requesterId: userId || ""
      });
      const response = await fetch(`${API_BASE_URL}/api/reports/generator?${params}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setPreviewCount(data.data.length);
      } else {
        setPreviewCount(0);
      }
    } catch (e) {
      console.error("Error fetching preview count:", e);
      setPreviewCount(0);
    }
  }, [generatorType, selectedMonth, selectedYear, generatorBranch, generatorDept, selectedCompanyIds, companies.length, isFullAdmin, role, userBranch, userDepartment, userId]);

  useEffect(() => {
    fetchPreviewCount();
  }, [fetchPreviewCount]);

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
    { value: "2027", label: "2027" },
    { value: "2026", label: "2026" },
    { value: "2025", label: "2025" },
    { value: "2024", label: "2024" },
  ];

  // Load Initial Lists
  const fetchLists = useCallback(async () => {
    try {
      // 1. Fetch Branches
      const branchRes = await fetch(`${API_BASE_URL}/api/branches`);
      const branchData = await branchRes.json();
      if (branchData.success) setBranches(branchData.branches);

      // 2. Fetch Departments
      const deptRes = await fetch(`${API_BASE_URL}/api/departments`);
      const deptData = await deptRes.json();
      if (deptData.success) {
        setDeptStats(deptData.departments);
        setDepartments(deptData.departments.map((d: any) => d.name));
      }

      // 3. Fetch Settings for Late Arrival Threshold
      const settingsRes = await fetch(`${API_BASE_URL}/api/settings`);
      const settingsData = await settingsRes.json();
      if (settingsData.success && settingsData.settings?.lateThreshold) {
        setWorkStartTime(settingsData.settings.lateThreshold);
      }
    } catch (e) {
      console.error("Error loading system lists:", e);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  // Fetch Attendance Data
  const fetchDailyAttendance = async () => {
    setLoadingDaily(true);
    try {
      const [resDaily, resStats] = await Promise.all([
        fetch(`${API_BASE_URL}/api/reports/daily-attendance?date=${selectedDate}`),
        fetch(`${API_BASE_URL}/api/dashboard-stats?userId=${userId || "ADMIN"}&role=${role}&branch=${encodeURIComponent(userBranch || "All")}&department=${encodeURIComponent(userDepartment || "")}&date=${selectedDate}`)
      ]);
      const data = await resDaily.json();
      const statsData = await resStats.json();

      if (data.success) {
        setDailyAttendance(data.report);
      }

      if (statsData.success && statsData.stats) {
        const s = statsData.stats;
        const total = s.totalEmployees || 0;
        const present = s.presentToday || 0;
        const late = s.lateArrivals || 0;
        const onLeave = s.onLeave || 0;
        const absent = Math.max(0, total - present - onLeave);
        const rate = (total - onLeave) > 0 ? Math.round((present / (total - onLeave)) * 100) : 0;

        setAttendanceStats({
          presentToday: present,
          lateArrivals: late,
          absentToday: absent,
          attendanceRate: rate,
        });
      }
    } catch (error) {
      console.error("Error fetching daily attendance & stats:", error);
    } finally {
      setLoadingDaily(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const params = new URLSearchParams({ month: selectedMonth.toString(), year: selectedYear.toString(), date: selectedDate });
      const response = await fetch(`${API_BASE_URL}/api/reports/analytics?${params}`);
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

  const fetchTotalLeaveRequests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/total-leave-requests`);
      const data = await response.json();
      if (data.success) {
        setTotalLeaveRequests(data.totalLeaveRequests);
      }
    } catch (error) {
      console.error("Error fetching total leave requests:", error);
    }
  };

  // Fetch Leave Utilization
  const fetchLeaveUtilization = async () => {
    setLoadingLeave(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/leave-utilization`);
      const data = await response.json();
      if (data.success) {
        setLeaveUtilization(data);
      }
    } catch (e) {
      console.error("Error fetching leave utilization:", e);
    } finally {
      setLoadingLeave(false);
    }
  };

  useEffect(() => {
    if (activeTab === "attendance") {
      fetchDailyAttendance();
      fetchAnalytics();
      fetchTotalLeaveRequests();
    } else if (activeTab === "leave") {
      fetchLeaveUtilization();
    }
  }, [activeTab, selectedMonth, selectedYear, selectedDate]);

  // Handle SSE live stream refresh
  useEffect(() => {
    const streamUrl = `${API_BASE_URL}/api/presence/stream`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        if (activeTab === "attendance") {
          fetchDailyAttendance();
          fetchAnalytics();
        } else if (activeTab === "leave") {
          fetchLeaveUtilization();
        }
      } catch (err) {
        console.error("Error updating stream in reports:", err);
      }
    };

    return () => eventSource.close();
  }, [activeTab, selectedMonth, selectedYear, selectedDate]);

  // Export CSV Handler
  const handleExport = () => {
    if (dailyAttendance.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = ["Employee Name", "Branch", "Time In", "Time Out", "Status"];
    const rows = dailyAttendance.map(r => [
      r.full_name,
      r.branch,
      formatAttendanceTime(r.clock_in),
      r.clock_out ? formatAttendanceTime(r.clock_out) : "--:--",
      r.time_out ? "Clocked Out" : "Active"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];

    link.setAttribute("href", url);
    link.setAttribute("download", `Rayhar_Attendance_Report_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    link.click();

    toast.success("CSV Report exported successfully!");
  };

  // Export PDF Handler
  const handleExportPDF = () => {
    if (dailyAttendance.length === 0) {
      toast.error("No data to export");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Could not open print window. Please allow popups.");
      return;
    }

    const rowsHtml = dailyAttendance.map(r => {
      const timeIn = formatAttendanceTime(r.clock_in);
      const timeOut = r.clock_out ? formatAttendanceTime(r.clock_out) : "--:--";
      const status = r.time_out ? "Clocked Out" : "Active";
      const badgeClass = r.time_out ? "badge-ontime" : "badge-remote";
      return `
        <tr>
          <td>${r.full_name}</td>
          <td>${r.branch}</td>
          <td>${timeIn}</td>
          <td>${timeOut}</td>
          <td><span class="badge ${badgeClass}">${status}</span></td>
        </tr>
      `;
    }).join("");

    const displayDate = selectedDate ? new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString();

    writePrintDocument(printWindow, `
      <html>
        <head>
          <title>Rayhar Daily Attendance Report - ${displayDate}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 40px; }
            h1 { color: #942392; margin-bottom: 5px; font-size: 24px; font-weight: 800; }
            h2 { color: #64748b; font-size: 13px; margin-top: 0; font-weight: 600; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .meta-item { font-size: 13px; }
            .meta-item strong { color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #942392; color: white; text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            tr:nth-child(even) td { background: #f8fafc; }
            .badge { padding: 4px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; white-space: nowrap; display: inline-block; }
            .badge-ontime { background: #d1fae5; color: #065f46; }
            .badge-remote { background: #dbeafe; color: #1d4ed8; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1 style="margin: 0; font-size: 28px; letter-spacing: -0.5px;">RAYHAR GROUP</h1>
              <h2 style="margin: 2px 0 24px 0; font-size: 13px; font-weight: 700; color: #64748b;">Daily Attendance Report</h2>
            </div>
            <button onclick="window.print();" style="background: #942392; color: white; border: none; padding: 10px 20px; font-weight: 800; border-radius: 8px; cursor: pointer; font-size: 12px; transition: background 0.2s;">PRINT REPORT</button>
          </div>
          
          <div class="meta-grid">
            <div class="meta-item"><strong>Date:</strong> ${displayDate}</div>
            <div class="meta-item"><strong>Total Records:</strong> ${dailyAttendance.length}</div>
          </div>

          <table>
            <thead>
               <tr>
                 <th>Employee Name</th>
                 <th>Branch</th>
                 <th>Time In</th>
                 <th>Time Out</th>
                 <th>Status</th>
               </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `, { autoPrint: true });
  };

  // Generate Report action using real data
  const triggerGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const norm = (role || "").toLowerCase().trim();
      const isBL = norm === "branch_leader";
      const isHOD = norm === "head_of_department" || norm === "hod";

      const effectiveBranch = isBL ? (userBranch || generatorBranch) : generatorBranch;
      const effectiveDept = isHOD ? (userDepartment || generatorDept) : generatorDept;

      const companiesParam = (!isFullAdmin || selectedCompanyIds.length === 0 || selectedCompanyIds.length === companies.length)
        ? "all"
        : selectedCompanyIds.join(",");

      const params = new URLSearchParams({
        type: generatorType,
        month: selectedMonth,
        year: selectedYear,
        branch: effectiveBranch || "all",
        department: effectiveDept || "all",
        companies: companiesParam,
        requesterRole: role || "",
        requesterBranch: userBranch || "",
        requesterDept: userDepartment || "",
        requesterId: userId || ""
      });
      
      const response = await fetch(`${API_BASE_URL}/api/reports/generator?${params}`);
      const data = await response.json();
      
      if (data.success) {
        let reportName = selectedMonth === 'all'
          ? `Rayhar_${generatorType.toUpperCase()}_Report_${selectedYear}.csv`
          : `Rayhar_${generatorType.toUpperCase()}_Report_${selectedMonth}_${selectedYear}.csv`;
        let headers: string[] = [];
        let rows: any[] = [];
        
        if (generatorType === "trends" || generatorType === "stability") {
          headers = ["Employee ID", "Employee Name", "Company", "Branch", "Date", "Status", "Clock In", "Clock Out", "Total Hours"];
          rows = data.data.map((r: any) => {
             const dateStr = r.date || (r.clock_in ? new Date(r.clock_in).toLocaleDateString() : "--");
             const timeIn = r.clock_in ? new Date(r.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "--:--";
             const timeOut = r.clock_out ? new Date(r.clock_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "--:--";
             const statusStr = r.status || "Present";
             const totalHrs = r.total_hours || calculateWorkingHours(r.clock_in, r.clock_out);
             const compName = r.company_name || (r.branch === 'RAYRENT' ? 'RayRent' : 'Rayhar Travels');
             return [r.user_id, r.full_name, compName, r.branch, dateStr, statusStr, timeIn, timeOut, totalHrs];
          });
        } else if (generatorType === "outstation") {
          headers = ["Event Name", "Destination", "Start Date", "End Date", "Days", "Status", "Employee Name", "Company", "Department", "Branch"];
          rows = data.data.map((r: any) => [
            r.event_name, r.destination, 
            new Date(r.start_date).toLocaleDateString(), 
            new Date(r.end_date).toLocaleDateString(), 
            r.total_days, r.status, r.full_name, r.company_name || (r.branch === 'RAYRENT' ? 'RayRent' : 'Rayhar Travels'), r.department, r.branch
          ]);
        } else if (generatorType === "company_leave") {
          headers = ["Leave Name", "Type", "Start Date", "End Date", "Applies To", "Branch", "Department", "Status"];
          rows = data.data.map((r: any) => [
            r.leave_name, r.leave_type || "N/A", 
            new Date(r.start_date).toLocaleDateString(), 
            new Date(r.end_date).toLocaleDateString(), 
            r.applies_to, r.branch_id || "All", r.department_id || "All", r.status
          ]);
        } else {
          headers = ["Employee ID", "Employee Name", "Company", "Branch", "Department", "Leave Type", "Days", "Status"];
          rows = data.data.map((r: any) => [r.user_id, r.full_name, r.company_name || (r.branch === 'RAYRENT' ? 'RayRent' : 'Rayhar Travels'), r.branch, r.department, r.leave_type, r.days, r.status]);
        }
        
        if (rows.length === 0) {
           toast.error("No data found for the selected filters.");
           setIsGenerating(false);
           return;
        }
        
        const escapeCsv = (val: any) => {
          if (val === null || val === undefined) return '';
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        if (generatorFormat === 'pdf') {
          const printWindow = window.open("", "_blank");
          if (!printWindow) {
            toast.error("Could not open print window. Please allow popups.");
            return;
          }
          
          const rowsHtml = rows.map(r => `<tr>${r.map((c: any) => `<td>${escapeCsv(c)}</td>`).join('')}</tr>`).join('');
          const headersHtml = headers.map(h => `<th>${h}</th>`).join('');
          
          writePrintDocument(printWindow, `
            <html>
              <head>
                <title>${reportName.replace('.csv', '')}</title>
                <style>
                  body { font-family: 'Inter', sans-serif; padding: 20px; color: #1e293b; }
                  h2 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; font-size: 24px; font-weight: 800; }
                  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                  th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                  th { background: #f8fafc; font-weight: 700; color: #475569; }
                </style>
              </head>
              <body>
                <h2>${reportName.replace('.csv', '').replace(/_/g, ' ')}</h2>
                <table>
                  <thead><tr>${headersHtml}</tr></thead>
                  <tbody>${rowsHtml}</tbody>
                </table>
              </body>
            </html>
          `, { autoPrint: true, closeAfterPrint: true });
          toast.success(`${generatorType.toUpperCase()} Analytical Report PDF generated successfully!`);
        } else if (generatorFormat === 'excel') {
          const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(escapeCsv).join(","))
          ].join("\n");
          // Add BOM to make Excel recognize UTF-8 properly
          const blob = new Blob(["\ufeff", csvContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", reportName.replace('.csv', '.xlsx'));
          link.style.visibility = 'hidden';
          link.click();
          toast.success(`${generatorType.toUpperCase()} Analytical Report Excel sheet generated!`);
        } else {
          const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(escapeCsv).join(","))
          ].join("\n");
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", reportName);
          link.style.visibility = 'hidden';
          link.click();
          toast.success(`${generatorType.toUpperCase()} Analytical Report CSV generated successfully!`);
        }
      } else {
         toast.error("Failed to generate report");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error generating report");
    } finally {
      setIsGenerating(false);
    }
  };



  // Region/Department helpers
  const branchRegions: Record<string, string> = {
    "HQ": "East Coast / East Malaysia",
    "KMM": "East Coast / East Malaysia",
    "CNH": "East Coast / East Malaysia",
    "KBG": "East Coast / East Malaysia",
    "TGG": "East Coast / East Malaysia",
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
       fill: d.rate >= 90 ? '#16A34A' : d.rate >= 75 ? '#EAB308' : '#DC2626'
    }));

  // Calculate live values
  const activeRateAvg = branchComparison.length > 0
    ? Math.round(branchComparison.reduce((sum, b) => sum + (b.activeRate || 0), 0) / branchComparison.length)
    : 95;

  const totalStaffCount = branchComparison.reduce((sum, b) => sum + Number(b.totalEmployees || 0), 0);

  const filteredDailyAttendance = selectedBranchFilter === "all" ? dailyAttendance : dailyAttendance.filter((r) => r.branch === selectedBranchFilter);

  const allAnomalies = useMemo(() => {
    return filteredDailyAttendance.flatMap(record => {
      const list = [];
      if ((record as any).is_late) {
        list.push({ id: `${record.user_id}-late`, user_id: record.user_id, full_name: record.full_name, branch: record.branch, type: 'LATE', title: 'Late Checked', desc: `Late Arrival today at ${formatAttendanceTime(record.clock_in)}`, color: '#EAB308' });
      }
      if ((record as any).is_early_leaver) {
        list.push({ id: `${record.user_id}-early`, user_id: record.user_id, full_name: record.full_name, branch: record.branch, type: 'EARLY LEAVE', title: 'Early Leave', desc: `Clocked out early at ${formatAttendanceTime(record.clock_out)}`, color: '#F43F5E' });
      }
      if ((record as any).missing_clock_out) {
        list.push({ id: `${record.user_id}-missing`, user_id: record.user_id, full_name: record.full_name, branch: record.branch, type: 'MISSING OUT', title: 'Missing Clock-Out', desc: `No clock-out recorded for this shift`, color: '#8B5CF6' });
      }
      if ((record as any).is_overtime) {
        list.push({ id: `${record.user_id}-overtime`, user_id: record.user_id, full_name: record.full_name, branch: record.branch, type: 'OVERTIME', title: 'Overtime', desc: `Logged more than 9 hours for this shift`, color: '#3B82F6' });
      }
      return list;
    });
  }, [filteredDailyAttendance]);

  // Deduplicate daily attendance by user_id to count each employee once based on first punch
  const uniqueDailyAttendance = useMemo(() => {
    const map = new Map<number | string, any>();
    filteredDailyAttendance.forEach(r => {
      if (!map.has(r.user_id)) {
        map.set(r.user_id, r);
      }
    });
    return Array.from(map.values());
  }, [filteredDailyAttendance]);

  // Late check count (arrived past dynamic threshold) based on unique employees
  const lateArrivalsCount = uniqueDailyAttendance.filter(r => (r as any).is_late).length;

  const lateRate = uniqueDailyAttendance.length > 0 
    ? Math.round((lateArrivalsCount / uniqueDailyAttendance.length) * 100) 
    : 0;

  // Leave analytics processors
  const rawUtilizationData = leaveUtilization?.departmentUtilization || [];
  const processedLeaveTypes = ["Cuti Tahunan", "Cuti Sakit", "Unpaid Leave"];
  const utilizationChartData = Array.from(new Set(rawUtilizationData.map((r: any) => r.department))).map((dept: any) => {
    const row: any = { department: dept };
    processedLeaveTypes.forEach(type => {
      const match = rawUtilizationData.find((r: any) => r.department === dept && r.leave_type === type);
      row[type] = match ? parseInt(match.total_days) : 0;
    });
    return row;
  });

  const distColors = ['#942392', '#C2185B', '#EAB308'];
  const rawTypeDist = leaveUtilization?.leaveTypeDistribution || [];
  return (
    <div className={`p-4 ${sidebarCollapsed ? "md:p-8" : "md:p-6"} space-y-6 w-full transition-all duration-300`}>
      <Card className="border border-white/60 bg-white/40 dark:bg-card/40 backdrop-blur-2xl shadow-2xl rounded-[32px] overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#942392] to-transparent opacity-50" />
        <CardContent className="p-6 sm:p-8">
          {/* GENERATE REPORT SECTION */}
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
              
              {/* Generator Settings Form */}
              <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] lg:col-span-2 p-4 space-y-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-foreground uppercase tracking-tight">Configure Analytical Report</h3>
                  <p className="text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-wider">Generate targeted PDF/CSV datasets compiled directly from live database logs</p>
                </div>

                  {/* 1. Report Type Selection */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">1. Report Type Selection</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <button
                        onClick={() => setGeneratorType("trends")}
                        className={`p-4 rounded-xl border-2 text-left flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                          generatorType === "trends"
                            ? "border-[#942392] dark:border-fuchsia-500 bg-[#942392]/5 dark:bg-[#942392]/20 text-foreground"
                            : "border-border/40 dark:border-slate-800 bg-white/40 dark:bg-card/20 text-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            generatorType === "trends" ? "bg-[#942392]/15 dark:bg-[#942392]/30 text-[#942392] dark:text-fuchsia-300" : "bg-muted dark:bg-slate-800 text-foreground"
                          }`}>
                            <Clock className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Attendance Trends</span>
                        </div>
                        <hr className="border-border/50 dark:border-slate-800 my-2.5 w-full" />
                        <span className="text-[10px] font-medium leading-normal text-foreground dark:text-slate-300">Clock-in, late check audits, and raw timelines</span>
                      </button>

                      <button
                        onClick={() => setGeneratorType("leave")}
                        className={`p-4 rounded-xl border-2 text-left flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                          generatorType === "leave"
                            ? "border-[#942392] dark:border-fuchsia-500 bg-[#942392]/5 dark:bg-[#942392]/20 text-foreground"
                            : "border-border/40 dark:border-slate-800 bg-white/40 dark:bg-card/20 text-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            generatorType === "leave" ? "bg-[#942392]/15 dark:bg-[#942392]/30 text-[#942392] dark:text-fuchsia-300" : "bg-muted dark:bg-slate-800 text-foreground"
                          }`}>
                            <PieChart className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Leave Utilization</span>
                        </div>
                        <hr className="border-border/50 dark:border-slate-800 my-2.5 w-full" />
                        <span className="text-[10px] font-medium leading-normal text-foreground dark:text-slate-300">Department utilization rates and absence charts</span>
                      </button>

                      <button
                        onClick={() => setGeneratorType("outstation")}
                        className={`p-4 rounded-xl border-2 text-left flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                          generatorType === "outstation"
                            ? "border-[#942392] dark:border-fuchsia-500 bg-[#942392]/5 dark:bg-[#942392]/20 text-foreground"
                            : "border-border/40 dark:border-slate-800 bg-white/40 dark:bg-card/20 text-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            generatorType === "outstation" ? "bg-[#942392]/15 dark:bg-[#942392]/30 text-[#942392] dark:text-fuchsia-300" : "bg-muted dark:bg-slate-800 text-foreground"
                          }`}>
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Outstation Assignment</span>
                        </div>
                        <hr className="border-border/50 dark:border-slate-800 my-2.5 w-full" />
                        <span className="text-[10px] font-medium leading-normal text-foreground dark:text-slate-300">Official business travel and assignment activities</span>
                      </button>

                      <button
                        onClick={() => setGeneratorType("company_leave")}
                        className={`p-4 rounded-xl border-2 text-left flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                          generatorType === "company_leave"
                            ? "border-[#942392] dark:border-fuchsia-500 bg-[#942392]/5 dark:bg-[#942392]/20 text-foreground"
                            : "border-border/40 dark:border-slate-800 bg-white/40 dark:bg-card/20 text-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            generatorType === "company_leave" ? "bg-[#942392]/15 dark:bg-[#942392]/30 text-[#942392] dark:text-fuchsia-300" : "bg-muted dark:bg-slate-800 text-foreground"
                          }`}>
                            <Building2 className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Company Leave Calendar</span>
                        </div>
                        <hr className="border-border/50 dark:border-slate-800 my-2.5 w-full" />
                        <span className="text-[10px] font-medium leading-normal text-foreground dark:text-slate-300">Corporate holidays and organization-wide leave schedule</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Scope Select */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">2. Scope Selection</span>
                    {/* Multi-Company Checkbox Filter for HR */}
                    {isFullAdmin && (
                      <div className="p-3.5 rounded-2xl border-2 border-[#942392]/20 bg-[#942392]/5 dark:bg-[#942392]/10 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#942392]" />
                            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
                              Company Scope Filter
                            </span>
                            <span className="text-[9px] text-muted-foreground font-semibold hidden sm:inline">
                              (Check all companies or select individual companies to export)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedCompanyIds.length === companies.length) {
                                setSelectedCompanyIds([1]);
                              } else {
                                setSelectedCompanyIds(companies.map(c => c.id));
                              }
                            }}
                            className="text-[10px] font-black text-[#942392] hover:underline cursor-pointer"
                          >
                            {selectedCompanyIds.length === companies.length ? "Reset to Main Only" : "Select All Companies"}
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {/* All Companies Toggle */}
                          <div
                            onClick={() => {
                              if (selectedCompanyIds.length === companies.length) {
                                setSelectedCompanyIds([1]);
                              } else {
                                setSelectedCompanyIds(companies.map(c => c.id));
                              }
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
                              selectedCompanyIds.length === companies.length && companies.length > 0
                                ? "bg-[#942392] border-[#942392] text-white shadow-sm"
                                : "bg-card/70 border-border/60 text-foreground hover:border-[#942392]/50"
                            }`}
                          >
                            <AnimatedCheckbox
                              checked={selectedCompanyIds.length === companies.length && companies.length > 0}
                              readOnly
                              color="#ffffff"
                              size={16}
                            />
                            <span className="text-[10px] uppercase tracking-wider font-black">All Companies</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${
                              selectedCompanyIds.length === companies.length
                                ? "bg-white/20 text-white"
                                : "bg-muted text-foreground"
                            }`}>
                              {companies.length}
                            </span>
                          </div>

                          {/* Individual Company Checkboxes */}
                          {companies.map((comp) => {
                            const isChecked = selectedCompanyIds.includes(comp.id);
                            return (
                              <div
                                key={comp.id}
                                onClick={() => {
                                  setSelectedCompanyIds(prev => {
                                    if (prev.includes(comp.id)) {
                                      const next = prev.filter(id => id !== comp.id);
                                      return next.length > 0 ? next : [comp.id];
                                    } else {
                                      return [...prev, comp.id];
                                    }
                                  });
                                }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
                                  isChecked
                                    ? "bg-[#942392]/10 border-[#942392] text-[#942392] dark:text-fuchsia-300 shadow-xs"
                                    : "bg-card/70 border-border/60 text-foreground hover:border-[#942392]/50"
                                }`}
                              >
                                <AnimatedCheckbox
                                  checked={isChecked}
                                  readOnly
                                  color="#942392"
                                  size={16}
                                />
                                <span className="text-[10px] uppercase tracking-wider font-black">{comp.company_name}</span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0 h-4 border ${
                                    comp.company_type === 'main'
                                      ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50"
                                      : "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-50/50"
                                  }`}
                                >
                                  {comp.company_type === 'main' ? 'Main' : 'Subsidiary'}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {(() => {
                      const norm = (role || "").toLowerCase().trim();
                      const isHRAdmin = norm === 'hr_admin' || norm === 'admin' || norm === 'hr';
                      const isMD_OM = norm === 'managing_director' || norm === 'operation_manager' || norm === 'finance_manager' || norm === 'md';
                      const isFullAdmin = isHRAdmin || isMD_OM;
                      const isBranchLeader = norm === 'branch_leader';
                      const isHOD = norm === 'head_of_department' || norm === 'hod';
                      const isEmployee = norm === 'employee' || norm === 'branch_officer';

                      return (
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          {/* Branch Selection or Locked Branch */}
                          {isFullAdmin ? (
                            <div className="space-y-1.5 min-w-0">
                              <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Branch Location</label>
                              <Select value={generatorBranch} onValueChange={setGeneratorBranch}>
                                <SelectTrigger className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-border bg-background/30">
                                  <SelectValue placeholder="All Branches" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">All Branches</SelectItem>
                                   {filteredBranches.map(b => (
                                     <SelectItem key={b.code} value={b.code} className="text-[10px] font-black uppercase tracking-widest">
                                       {b.code} - {b.name ? b.name.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : b.name}
                                     </SelectItem>
                                   ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : isBranchLeader ? (
                            <div className="space-y-1.5 min-w-0">
                              <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Branch Location (Locked)</label>
                              <div className="w-full h-11 px-3.5 flex items-center justify-between text-xs font-black uppercase tracking-widest rounded-xl border border-[#942392]/30 bg-[#942392]/5 text-[#942392] truncate shadow-xs">
                                <span>{userBranch || "Your Branch"}</span>
                                <Badge variant="outline" className="text-[8px] border-[#942392]/40 text-[#942392] font-black uppercase tracking-wider">YOUR BRANCH</Badge>
                              </div>
                            </div>
                          ) : isHOD ? (
                            <div className="space-y-1.5 min-w-0">
                              <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Branch Location</label>
                              <Select value={generatorBranch} onValueChange={setGeneratorBranch}>
                                <SelectTrigger className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-border bg-background/30">
                                  <SelectValue placeholder="All Branches" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">All Branches</SelectItem>
                                   {filteredBranches.map(b => (
                                     <SelectItem key={b.code} value={b.code} className="text-[10px] font-black uppercase tracking-widest">
                                       {b.code} - {b.name ? b.name.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : b.name}
                                     </SelectItem>
                                   ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : null}

                          {/* Department Selection or Locked Department */}
                          {isFullAdmin ? (
                            <div className="space-y-1.5 min-w-0">
                              <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Department</label>
                              <Select value={generatorDept} onValueChange={setGeneratorDept}>
                                <SelectTrigger className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-border bg-background/30">
                                  <SelectValue placeholder="All Departments" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">All Departments</SelectItem>
                                   {departments.map(d => (
                                     <SelectItem key={d} value={d} className="text-[10px] font-black uppercase tracking-widest">{d ? d.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : d}</SelectItem>
                                   ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : isHOD ? (
                            <div className="space-y-1.5 min-w-0">
                              <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Department (Locked)</label>
                              <div className="w-full h-11 px-3.5 flex items-center justify-between text-xs font-black uppercase tracking-widest rounded-xl border border-[#942392]/30 bg-[#942392]/5 text-[#942392] truncate shadow-xs">
                                <span>{userDepartment || "Your Department"}</span>
                                <Badge variant="outline" className="text-[8px] border-[#942392]/40 text-[#942392] font-black uppercase tracking-wider">YOUR DEPT</Badge>
                              </div>
                            </div>
                          ) : isBranchLeader ? (
                            <div className="space-y-1.5 min-w-0">
                              <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Department</label>
                              <Select value={generatorDept} onValueChange={setGeneratorDept}>
                                <SelectTrigger className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-border bg-background/30">
                                  <SelectValue placeholder="All Departments" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">All Departments</SelectItem>
                                   {departments.map(d => (
                                     <SelectItem key={d} value={d} className="text-[10px] font-black uppercase tracking-widest">{d ? d.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : d}</SelectItem>
                                   ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : null}

                          <div className="space-y-1.5 col-span-2 sm:col-span-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Period</label>
                              <div className="flex items-center bg-white dark:bg-slate-900 rounded-full p-1 border border-slate-200 dark:border-slate-800 shadow-sm gap-0.5">
                                <button 
                                  type="button"
                                  onClick={() => { setPeriodMode("year"); setSelectedMonth("all"); }} 
                                  className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${periodMode === 'year' ? 'bg-[#ffff00] text-[#942392] shadow-sm' : 'text-slate-600 dark:text-white hover:text-[#942392] dark:hover:text-[#ffff00]'}`}
                                >
                                  Year
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => { setPeriodMode("month"); setSelectedMonth((new Date().getMonth() + 1).toString()); }} 
                                  className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${periodMode === 'month' ? 'bg-[#ffff00] text-[#942392] shadow-sm' : 'text-slate-600 dark:text-white hover:text-[#942392] dark:hover:text-[#ffff00]'}`}
                                >
                                  Month
                                </button>
                              </div>
                            </div>
                            {periodMode === 'year' ? (
                              <YearPopover
                                year={selectedYear}
                                onSelectYear={(y) => { setSelectedYear(y); setSelectedMonth("all"); }}
                                className="w-full h-11 px-3.5 flex items-center justify-between text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/80 text-foreground dark:text-white outline-none cursor-pointer hover:border-[#942392] dark:hover:border-[#942392] transition-colors focus:ring-1 focus:ring-[#942392]"
                              />
                            ) : (
                              <MonthPicker
                                hideAllYear={true}
                                monthYear={selectedMonth === 'all' ? `${selectedYear}-${String(new Date().getMonth()+1).padStart(2, '0')}` : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                                onSelectMonthYear={(val) => {
                                  const [y, m] = val.split('-');
                                  setSelectedYear(y);
                                  setSelectedMonth(m);
                                }}
                                className="w-full h-11 px-3.5 flex items-center justify-between text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/80 text-foreground dark:text-white outline-none cursor-pointer hover:border-[#942392] dark:hover:border-[#942392] transition-colors focus:ring-1 focus:ring-[#942392]"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

              {/* 3. Export Format */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-foreground uppercase tracking-widest">3. Export Format</span>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setGeneratorFormat("csv")}
                    className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                      generatorFormat === "csv"
                        ? "border-[#942392] dark:border-fuchsia-500/50 bg-[#942392]/5 dark:bg-[#942392]/20 text-[#942392] dark:text-fuchsia-300 font-black"
                        : "border-border/50 dark:border-slate-800 bg-background/20 dark:bg-slate-900/40 text-foreground dark:text-slate-300 font-semibold hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-wider">Raw CSV</span>
                  </button>
                  <button
                    onClick={() => setGeneratorFormat("excel")}
                    className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                      generatorFormat === "excel"
                        ? "border-[#942392] dark:border-fuchsia-500/50 bg-[#942392]/5 dark:bg-[#942392]/20 text-[#942392] dark:text-fuchsia-300 font-black"
                        : "border-border/50 dark:border-slate-800 bg-background/20 dark:bg-slate-900/40 text-foreground dark:text-slate-300 font-semibold hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <FileBarChart className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-wider">Excel Sheet</span>
                  </button>
                  <button
                    onClick={() => setGeneratorFormat("pdf")}
                    className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                      generatorFormat === "pdf"
                        ? "border-[#942392] dark:border-fuchsia-500/50 bg-[#942392]/5 dark:bg-[#942392]/20 text-[#942392] dark:text-fuchsia-300 font-black"
                        : "border-border/50 dark:border-slate-800 bg-background/20 dark:bg-slate-900/40 text-foreground dark:text-slate-300 font-semibold hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <FileBarChart className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-wider">PDF report</span>
                  </button>
                </div>
              </div>
            </Card>

            {/* Synthesis Preview Panel */}
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden p-4 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-widest">Synthesis Preview</h4>
                <p className="text-[9px] font-bold text-foreground uppercase tracking-wider mt-0.5">Real-time compilation preview</p>
              </div>

              {/* Counter Display */}
              <div className="bg-muted/30 dark:bg-slate-900/60 border border-border/40 dark:border-slate-800 rounded-2xl p-5 text-center flex flex-col gap-1 items-center justify-center select-none shadow-inner">
                <span className="text-[9px] font-black text-foreground dark:text-slate-300 uppercase tracking-widest">Live Compiled Dataset</span>
                <span className="text-3xl font-black text-[#942392] dark:text-fuchsia-300 font-mono mt-1 drop-shadow-sm">
                  {previewCount.toLocaleString()} Records
                </span>
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1 flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Synced Live via SSE
                </span>
              </div>

              {/* Active Scope Summary */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-foreground uppercase tracking-widest">Active Scope Preview</span>
                <div className="bg-background/40 border border-border/40 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-muted-foreground uppercase text-[9px]">Company:</span>
                    <span className="font-black text-[#942392] dark:text-fuchsia-300 text-right truncate max-w-[150px]">
                      {selectedCompanyIds.length === companies.length
                        ? "ALL COMPANIES (" + companies.length + ")"
                        : companies.filter(c => selectedCompanyIds.includes(c.id)).map(c => c.company_name).join(", ") || "None"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-muted-foreground uppercase text-[9px]">Branch:</span>
                    <span className="font-bold text-foreground text-right">{generatorBranch === 'all' ? 'All Branches' : generatorBranch}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-muted-foreground uppercase text-[9px]">Department:</span>
                    <span className="font-bold text-foreground text-right truncate max-w-[140px]">{generatorDept === 'all' ? 'All Departments' : generatorDept}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-muted-foreground uppercase text-[9px]">Period:</span>
                    <span className="font-bold text-foreground text-right">
                      {periodMode === 'year' ? selectedYear : (months.find(m => m.value === selectedMonth)?.label + " " + selectedYear)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compile Button */}
              <Button
                onClick={triggerGenerateReport}
                disabled={isGenerating}
                className="w-full py-6 rounded-[18px] bg-[#FFFE00] hover:bg-[#E6E500] text-[#942392] ring-2 ring-[#942392] font-black text-xs uppercase tracking-widest shadow-xl shadow-[#942392]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </Card>

          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);
}



