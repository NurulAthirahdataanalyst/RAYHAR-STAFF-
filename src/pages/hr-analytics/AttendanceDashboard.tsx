
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, FileBarChart, Loader2, Users, TrendingUp, History, Calendar, Filter, 
  Activity, Clock, AlertCircle, Sparkles, Plus, Check, CheckCircle2, Trash2, Building2, UserPlus, 
  Settings2, RefreshCw, BarChart2, PieChart, Info, ShieldAlert, MapPin, ChevronDown, FileText, FileSpreadsheet, Search
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, Cell, PieChart as RechartsPieChart, Pie
} from "recharts";


import { useState, useEffect, useCallback, useMemo, useRef } from "react";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "../../config/api";
import { ExportDropdown } from "@/components/shared/ExportDropdown";

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
  department?: string;
}

interface Branch {
  code: string;
  name: string;
}

interface Department {
  name: string;
  employee_count: number;
}

const parseThreshold = (thresholdStr: string) => {
  const match = thresholdStr.match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
  if (!match) return { hour: 9, minute: 0 };
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const ampm = match[3];
  if (ampm) {
    if (ampm.toUpperCase() === "PM" && hour < 12) hour += 12;
    if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
  }
  return { hour, minute };
};

export default function AttendanceDashboard() {
  const { role, userBranch, userDepartment } = useRole();
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

  const [activeTab, setActiveTab] = useState<"attendance" | "leave" | "generator" | "settings" | "leave_monitoring">("attendance");
  
  // Dynamic Lists from Database
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [deptStats, setDeptStats] = useState<Department[]>([]);

  // ── LIVE SSE PRESENCE STATE ──────────────────────────────────────────
  const [liveStats, setLiveStats] = useState<{
    present: number; late: number; absent: number; onLeave: number; total: number;
  }>({ present: 0, late: 0, absent: 0, onLeave: 0, total: 0 });
  const [liveEmployees, setLiveEmployees] = useState<Array<{
    user_id: string; full_name: string; branch: string; department: string;
    clock_in: string | null; clock_out: string | null; status: string;
  }>>([]);
  const [liveLastUpdated, setLiveLastUpdated] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);

  const liveEsRef = useRef<EventSource | null>(null);

  // Attendance & Punctuality State
  const [dailyAttendance, setDailyAttendance] = useState<AttendanceRecord[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [absentEmployees, setAbsentEmployees] = useState<any[]>([]);
  const [loadingAbsent, setLoadingAbsent] = useState(false);
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
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [absentSearchTerm, setAbsentSearchTerm] = useState("");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("all");

  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("last7");
  const [currentPage, setCurrentPage] = useState(1);
  const [anomaliesCurrentPage, setAnomaliesCurrentPage] = useState(1);
  const [absentCurrentPage, setAbsentCurrentPage] = useState(1);
  const [absentLimit, setAbsentLimit] = useState("10");

  useEffect(() => {
    setCurrentPage(1);
  }, [limit, selectedBranchFilter, selectedDate]);

  useEffect(() => {
    setAnomaliesCurrentPage(1);
  }, [anomaliesLimit, selectedBranchFilter, selectedDate]);

  useEffect(() => {
    setAbsentCurrentPage(1);
  }, [absentLimit, selectedBranchFilter, selectedDate, absentSearchTerm]);

  const liveTimeRange = "today";
  const [liveRegion, setLiveRegion] = useState("all");

  // Leave Utilization State
  const [leaveUtilization, setLeaveUtilization] = useState<any>(null);
  const [loadingLeave, setLoadingLeave] = useState(false);
  const [hoveredSlice, setHoveredSlice] = useState<any>(null);

  // Settings config values (Dynamic fetch with static fallback)
  const [workStartTime, setWorkStartTime] = useState("09:00 AM");

  // Report Generator State
  const [generatorType, setGeneratorType] = useState<"stability" | "trends" | "leave" | "financial">("trends");
  const [generatorDept, setGeneratorDept] = useState("all");
  const [generatorBranch, setGeneratorBranch] = useState("all");
  const [generatorRange, setGeneratorRange] = useState("ytd");
  const [generatorFormat, setGeneratorFormat] = useState<"pdf" | "excel" | "csv">("pdf");
  const [isGenerating, setIsGenerating] = useState(false);

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
      const branchRes = await fetch(`${API_BASE_URL}/api/branches`);
      const branchData = await branchRes.json();
      if (branchData.success) setBranches(branchData.branches);

      const deptRes = await fetch(`${API_BASE_URL}/api/departments`);
      const deptData = await deptRes.json();
      if (deptData.success) {
        setDeptStats(deptData.departments);
        setDepartments(deptData.departments.map((d: any) => d.name));
      }

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
    setLoadingAbsent(true);
    try {
      const [resDaily, resStats, resAbsent] = await Promise.all([
        fetch(`${API_BASE_URL}/api/reports/daily-attendance?date=${selectedDate}&role=${role || ""}&branch=${userBranch || ""}&department=${userDepartment || ""}`),
        fetch(`${API_BASE_URL}/api/dashboard-stats?userId=ADMIN&role=${role || ""}&branch=${userBranch || "All"}&department=${userDepartment || "All"}&date=${selectedDate}`),
        fetch(`${API_BASE_URL}/api/reports/absent-employees?date=${selectedDate}&role=${role || ""}&branch=${userBranch || ""}&department=${userDepartment || ""}`)
      ]);
      const data = await resDaily.json();
      const statsData = await resStats.json();
      const absentData = await resAbsent.json();

      if (data.success) {
        setDailyAttendance(data.report);
      }

      if (absentData.success) {
        setAbsentEmployees(absentData.report);
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
      setLoadingAbsent(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const params = new URLSearchParams({ 
        month: selectedMonth.toString(), 
        year: selectedYear.toString(), 
        date: selectedDate,
        role: role || "",
        branch: userBranch || "",
        department: userDepartment || ""
      });
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
      const params = new URLSearchParams({
        role: role || "",
        branch: userBranch || "",
        department: userDepartment || ""
      });
      const response = await fetch(`${API_BASE_URL}/api/reports/total-leave-requests?${params}`);
      const data = await response.json();
      if (data.success) setTotalLeaveRequests(data.totalLeaveRequests);
    } catch (error) {
      console.error("Error fetching total leave requests:", error);
    }
  };

  const fetchLeaveUtilization = async () => {
    setLoadingLeave(true);
    try {
      const params = new URLSearchParams({
        role: role || "",
        branch: userBranch || "",
        department: userDepartment || ""
      });
      const response = await fetch(`${API_BASE_URL}/api/reports/leave-utilization?${params}`);
      const data = await response.json();
      if (data.success) setLeaveUtilization(data);
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

  // ── LIVE-STATS SSE CONNECTION ─────────────────────────────────────────
  useEffect(() => {
    const url = `${API_BASE_URL}/api/presence/live-stats?date=${selectedDate}&role=${role || ""}&branch=${userBranch || ""}&department=${userDepartment || ""}`;
    const es = new EventSource(url);
    liveEsRef.current = es;

    es.onopen = () => setLiveConnected(true);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'presence_update') {
          setLiveStats(data.stats);
          setLiveEmployees(data.employees || []);
          setLiveLastUpdated(data.timestamp);
          setLiveConnected(true);
          setAttendanceStats(prev => ({
            ...prev,
            presentToday: data.stats.present,
            lateArrivals: data.stats.late,
            absentToday: data.stats.absent,
          }));
        }
      } catch (err) {
        console.error('live-stats parse error:', err);
      }
    };
    es.onerror = () => setLiveConnected(false);

    return () => { es.close(); liveEsRef.current = null; };
  }, [selectedDate]);

  // Handle SSE live stream refresh (table data)
  useEffect(() => {
    const streamUrl = `${API_BASE_URL}/api/presence/stream`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = () => {
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

    const headers = ["Employee Name", "Branch", "Time In", "Time Out", "Attendance Status", "Work Status"];
    const rows = dailyAttendance.map(r => {
      let isLate = false;
      if (r.clock_in) {
        const { hour: threshHour, minute: threshMin } = parseThreshold(workStartTime);
        const klTimeIn = new Date(new Date(r.clock_in).getTime() + 8 * 60 * 60 * 1000);
        isLate = klTimeIn.getUTCHours() > threshHour || (klTimeIn.getUTCHours() === threshHour && klTimeIn.getUTCMinutes() > threshMin);
      }
      const attStatus = r.clock_in ? (isLate ? "Present (Late)" : "Present (On Time)") : "Absent";
      
      let workStatus = "Checked In";
      if (r.clock_out) {
         const workHrsStr = calculateWorkingHours(r.clock_in, r.clock_out);
         const workHrsNum = parseFloat(workHrsStr.replace('h', '.').replace('m', '')) || 0;
         workStatus = workHrsNum >= 8.0 ? "Clocked Out" : "Clocked Out Early";
      }

      return [
        r.full_name,
        r.branch,
        formatAttendanceTime(r.clock_in),
        r.clock_out ? formatAttendanceTime(r.clock_out) : "--:--",
        attStatus,
        workStatus
      ];
    });

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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

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
      
      let isLate = false;
      if (r.clock_in) {
        const { hour: threshHour, minute: threshMin } = parseThreshold(workStartTime);
        const klTimeIn = new Date(new Date(r.clock_in).getTime() + 8 * 60 * 60 * 1000);
        isLate = klTimeIn.getUTCHours() > threshHour || (klTimeIn.getUTCHours() === threshHour && klTimeIn.getUTCMinutes() > threshMin);
      }
      const attStatus = r.clock_in ? (isLate ? "Present (Late)" : "Present (On Time)") : "Absent";
      
      let workStatus = "Checked In";
      if (r.clock_out) {
         const workHrsStr = calculateWorkingHours(r.clock_in, r.clock_out);
         const workHrsNum = parseFloat(workHrsStr.replace('h', '.').replace('m', '')) || 0;
         workStatus = workHrsNum >= 8.0 ? "Clocked Out" : "Clocked Out Early";
      }

      const badgeClass = attStatus.includes("On Time") ? "badge-ontime" : attStatus.includes("Late") ? "badge-late" : "badge-absent";
      return `
        <tr>
          <td>${r.full_name}</td>
          <td>${r.branch}</td>
          <td>${timeIn}</td>
          <td>${timeOut}</td>
          <td><span class="badge ${badgeClass}">${attStatus}</span> <span class="badge ${workStatus.includes('Early') ? 'badge-late' : 'badge-remote'}">${workStatus}</span></td>
        </tr>
      `;
    }).join("");

    const displayDate = selectedDate ? new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString();

    printWindow.document.write(`
      <html>
        <head>
          <title>Rayhar Daily Attendance Report - ${displayDate}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 40px; }
            h1 { color: #7B0099; margin-bottom: 5px; font-size: 24px; font-weight: 800; }
            h2 { color: #64748b; font-size: 13px; margin-top: 0; font-weight: 600; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .meta-item { font-size: 13px; }
            .meta-item strong { color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #7B0099; color: white; text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
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
            <button onclick="window.print();" style="background: #7B0099; color: white; border: none; padding: 10px 20px; font-weight: 800; border-radius: 8px; cursor: pointer; font-size: 12px; transition: background 0.2s;">PRINT REPORT</button>
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
          
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Generate Report action using real data
  const triggerGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        type: generatorType,
        month: selectedMonth,
        year: selectedYear,
        branch: generatorBranch,
        department: generatorDept
      });
      
      const response = await fetch(`${API_BASE_URL}/api/reports/generator?${params}`);
      const data = await response.json();
      
      if (data.success) {
        let reportName = `Rayhar_${generatorType.toUpperCase()}_Report_${selectedMonth}_${selectedYear}.csv`;
        let headers: string[] = [];
        let rows: any[] = [];
        
        if (generatorType === "trends" || generatorType === "stability") {
          headers = ["Employee ID", "Employee Name", "Branch", "Date", "Clock In", "Clock Out", "Total Hours"];
          rows = data.data.map((r: any) => {
             const dateStr = new Date(r.clock_in).toLocaleDateString();
             const timeIn = new Date(r.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
             const timeOut = r.clock_out ? new Date(r.clock_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "--:--";
             const totalHrs = calculateWorkingHours(r.clock_in, r.clock_out);
             return [r.user_id, r.full_name, r.branch, dateStr, timeIn, timeOut, totalHrs];
          });
        } else {
          headers = ["Employee ID", "Employee Name", "Branch", "Leave Type", "Days", "Status"];
          rows = data.data.map((r: any) => [r.user_id, r.full_name, r.branch, r.leave_type, r.days, r.status]);
        }
        
        if (rows.length === 0) {
           toast.error("No data found for the selected filters.");
           setIsGenerating(false);
           return;
        }
        
        const csvContent = [
          headers.join(","),
          ...rows.map(row => row.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", reportName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`${generatorType.toUpperCase()} Analytical Report generated successfully!`);
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

  
  const getMockDepartment = (userId: string) => {
    const hash = userId.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const depts = ["UI/UX Team", "Development", "HR", "Managing Director", "Marketing", "Sales"];
    return depts[hash % depts.length];
  };

  const filteredDailyAttendance = useMemo(() => {
    return dailyAttendance
      .map(r => ({
        ...r,
        department: r.department || getMockDepartment(r.user_id)
      }))
      .filter((r) => {
        const matchesBranch = selectedBranchFilter === "all" || r.branch === selectedBranchFilter;
        const matchesDept = selectedDepartmentFilter === "all" || r.department === selectedDepartmentFilter;
        const matchesSearch = r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || r.user_id.toLowerCase().includes(searchTerm.toLowerCase());
        
        let isLate = false;
        if (r.clock_in) {
          const { hour: threshHour, minute: threshMin } = parseThreshold(workStartTime);
          const thresholdDate = new Date(r.clock_in);
          thresholdDate.setHours(threshHour, threshMin, 0, 0);
          if (new Date(r.clock_in).getTime() > thresholdDate.getTime()) {
            isLate = true;
          }
        }
        
        let attStatus = "Absent";
        if (r.clock_in) {
          attStatus = isLate ? "Present (Late)" : "Present (On Time)";
        }

        const matchesStatus = selectedStatusFilter === "all" || 
          (selectedStatusFilter === "present_on_time" && attStatus === "Present (On Time)") ||
          (selectedStatusFilter === "present_late" && attStatus === "Present (Late)") ||
          (selectedStatusFilter === "absent" && attStatus === "Absent") ||
          (selectedStatusFilter === "clocked_out" && r.time_out != null);
          
        return matchesBranch && matchesDept && matchesSearch && matchesStatus;
      })
  }, [dailyAttendance, selectedBranchFilter, selectedDepartmentFilter, searchTerm, selectedStatusFilter]);

  const filteredAbsentEmployees = useMemo(() => {
    return absentEmployees.filter((r) => {
      const matchesBranch = selectedBranchFilter === "all" || r.branch === selectedBranchFilter;
      const matchesDept = selectedDepartmentFilter === "all" || r.department === selectedDepartmentFilter;
      const matchesSearch = absentSearchTerm === "" || 
        r.full_name?.toLowerCase().includes(absentSearchTerm.toLowerCase()) ||
        r.user_id?.toLowerCase().includes(absentSearchTerm.toLowerCase());
      return matchesBranch && matchesDept && matchesSearch;
    });
  }, [absentEmployees, selectedBranchFilter, selectedDepartmentFilter, searchTerm]);


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

  // Late check count (arrived past dynamic threshold)
  const lateArrivalsCount = filteredDailyAttendance.filter(r => (r as any).is_late).length;

  const lateRate = filteredDailyAttendance.length > 0 
    ? Math.round((lateArrivalsCount / filteredDailyAttendance.length) * 100) 
    : 4;

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

  const distColors = ['#7B0099', '#C2185B', '#EAB308'];
  const rawTypeDist = leaveUtilization?.leaveTypeDistribution || [];
  const processedPieData = rawTypeDist.map((r: any) => ({
    name: r.leave_type,
    value: parseInt(r.total_days)
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 pt-2 pb-6">

      {/* ── LIVE PRESENCE PANEL ─────────────────────────────────────────── */}
      <Card className="border border-gray-200/80 bg-white rounded-xl shadow-sm overflow-hidden ring-1 ring-black/5">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 md:px-6 pt-4 pb-3 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-[#800A7A] to-[#a855f7] rounded-xl shadow-md">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-black text-gray-800 uppercase tracking-wide">Live Attendance Status</h2>
                  {liveConnected ? (
                    <span className="flex items-center gap-1.5 bg-red-500 text-white border border-red-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-widest shadow-sm shadow-red-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-gray-200 text-gray-600 border border-gray-300 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Connecting…
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  {liveLastUpdated
                    ? `Updated ${new Date(liveLastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`
                    : `From ${liveStats.total || totalStaffCount || '—'} active employees`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative inline-flex">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" size="sm" className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 h-9 rounded-lg px-3 flex items-center gap-1.5 shadow-sm text-xs font-medium pointer-events-none">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>{`${new Date(selectedDate).getDate()}/${new Date(selectedDate).getMonth() + 1}/${new Date(selectedDate).getFullYear()}`}</span>
                </Button>
              </div>
              
              <ExportDropdown onExportCSV={handleExport} onExportPDF={handleExportPDF} />
            </div>
          </div>

          {/* Dense KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 md:p-6 bg-gray-50/50">
            <div className="flex flex-col bg-white border border-gray-200 rounded-[10px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="text-[13px] font-medium text-gray-500 mb-1">Total Present</span>
              <span className="text-[32px] font-bold text-gray-900 leading-none">
                {liveStats.total > 0 ? Math.round((liveStats.present / liveStats.total) * 100) : 0}%
              </span>
            </div>
            <div className="flex flex-col bg-white border border-gray-200 rounded-[10px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="text-[13px] font-medium text-gray-500 mb-1">Present (On Time)</span>
              <span className="text-[32px] font-bold text-gray-900 leading-none">
                {liveStats.total > 0 ? Math.round(((liveStats.present - liveStats.late) / liveStats.total) * 100) : 0}%
              </span>
            </div>
            <div className="flex flex-col bg-white border border-gray-200 rounded-[10px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="text-[13px] font-medium text-gray-500 mb-1">Present (Late)</span>
              <span className="text-[32px] font-bold text-gray-900 leading-none">
                {liveStats.total > 0 ? Math.round((liveStats.late / liveStats.total) * 100) : 0}%
              </span>
            </div>
            <div className="flex flex-col bg-white border border-gray-200 rounded-[10px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="text-[13px] font-medium text-gray-500 mb-1">Absent</span>
              <span className="text-[32px] font-bold text-gray-900 leading-none">
                {liveStats.total > 0 ? Math.round((liveStats.absent / liveStats.total) * 100) : 0}%
              </span>
            </div>
            <div className="flex flex-col bg-white border border-gray-200 rounded-[10px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="text-[13px] font-medium text-gray-500 mb-1">Leave</span>
              <span className="text-[32px] font-bold text-gray-900 leading-none">
                {liveStats.total > 0 ? Math.round((liveStats.onLeave / liveStats.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FILTER BAR SECTION */}
      <Card className="border border-gray-200/80 bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" /> Analytics Filters
            </h2>
            <p className="text-[10px] text-gray-400 font-medium ml-6 mt-0.5 uppercase tracking-widest">
              {filteredDailyAttendance.length} Records Found
            </p>
          </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Filter */}
              <div className="relative">
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-3 pr-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#7B0099] h-8 shadow-sm"
                />
              </div>

              {/* Department Filter */}
              <Select value={selectedDepartmentFilter} onValueChange={setSelectedDepartmentFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs font-medium rounded-md border-gray-200 bg-white text-gray-700 shadow-sm">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept, idx) => (
                    <SelectItem key={idx} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Branch Filter */}
              <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs font-medium rounded-md border-gray-200 bg-white text-gray-700 shadow-sm">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="all">All Branch</SelectItem>
                  {branches.map((b, idx) => (
                    <SelectItem key={idx} value={b.code}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs font-medium rounded-md border-gray-200 bg-white text-gray-700 shadow-sm">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="all">Select Status</SelectItem>
                  <SelectItem value="present_on_time">Present (On Time)</SelectItem>
                  <SelectItem value="present_late">Present (Late)</SelectItem>
                  <SelectItem value="clocked_out">Clocked Out</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] h-8 text-xs font-medium rounded-md border-gray-200 bg-white text-gray-700 shadow-sm">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="last7">Sort By : Last 7 Days</SelectItem>
                  <SelectItem value="name">Sort By : Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
      </Card>

      {/* ADMIN ATTENDANCE TABLE */}
      <Card className="border border-gray-200/80 bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-bold text-gray-800">Admin Attendance</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500">Row Per Page</span>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger className="w-[60px] h-7 text-[11px] font-semibold rounded-md border-gray-200 bg-white text-gray-700 shadow-sm">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative w-full sm:w-[220px]">
              <Search className="absolute left-3 top-2 h-3 w-3 text-gray-400" />
              <input 
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 w-full text-[11px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7B0099] h-7 shadow-sm"
              />
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {loadingDaily ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#7B0099] opacity-40" />
              <p className="text-xs font-medium text-gray-500 animate-pulse">Syncing logs...</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/80 text-gray-500 uppercase text-[9px] font-bold tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2 w-4">
                      <input type="checkbox" className="rounded border-gray-300 text-[#7B0099] focus:ring-[#7B0099]" />
                    </th>
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Time In</th>
                    <th className="px-4 py-2">Time Out</th>
                    <th className="px-4 py-2">Late</th>
                    <th className="px-4 py-2">Working Hours</th>
                    <th className="px-4 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDailyAttendance.length > 0 ? (
                    filteredDailyAttendance.slice((currentPage - 1) * parseInt(limit), currentPage * parseInt(limit)).map((record) => {
                      const clockInDate = record.clock_in ? new Date(record.clock_in) : null;
                      let isLate = false;
                      let lateMinStr = "0 Min";
                      if (clockInDate) {
                        const { hour: threshHour, minute: threshMin } = parseThreshold(workStartTime);
                        const thresholdDate = new Date(clockInDate);
                        thresholdDate.setHours(threshHour, threshMin, 0, 0);
                        const diffMs = clockInDate.getTime() - thresholdDate.getTime();
                        if (diffMs > 0) {
                          isLate = true;
                          lateMinStr = `${Math.floor(diffMs / 60000)} Min`;
                        }
                      }

                      const workHrsStr = calculateWorkingHours(record.clock_in, record.clock_out);
                      const workHrsNum = parseFloat(workHrsStr.replace('h', '.').replace('m', '')) || 0;
                      const isGoodHrs = workHrsNum >= 8.0;

                      let attStatus = "Absent";
                      if (record.clock_in) {
                        attStatus = isLate ? "Present (Late)" : "Present (On Time)";
                      }
                      
                      let workStatus = "Checked In";
                      if (record.clock_out) {
                        workStatus = isGoodHrs ? "Clocked Out" : "Clocked Out Early";
                      }
                      
                      const attStatusClass = attStatus === "Present (On Time)" 
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : attStatus === "Present (Late)"
                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                        : "bg-red-50 text-red-700 border border-red-100";

                      const workStatusClass = workStatus === "Checked In"
                        ? "bg-blue-50 text-blue-700 border border-blue-100"
                        : workStatus === "Clocked Out Early"
                        ? "bg-rose-50 text-rose-700 border border-rose-100"
                        : "bg-gray-50 text-gray-700 border border-gray-100";

                      return (
                        <tr key={record.user_id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-2">
                            <input type="checkbox" className="rounded border-gray-300 text-[#7B0099] focus:ring-[#7B0099]" />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-md bg-[#7B0099]/10 text-[#7B0099] font-bold flex items-center justify-center text-xs uppercase shadow-sm">
                                {record.full_name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-semibold text-gray-800 block text-xs">{record.full_name}</span>
                                <span className="text-[10px] text-gray-400 capitalize">{((record as any).role || "").replace(/_/g, ' ')} • {record.branch}{record.branch === "HQ" && record.department ? `, • ${record.department}` : ""}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${attStatusClass}`}>
                                <span className={`w-1 h-1 rounded-full mr-1 ${attStatus === 'Present (On Time)' ? 'bg-green-500' : attStatus === 'Present (Late)' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                {attStatus}
                              </span>
                              {record.clock_in && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${workStatusClass}`}>
                                  {workStatus}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-[11px] text-gray-600 font-medium">{formatAttendanceTime(record.clock_in)}</td>
                          <td className="px-4 py-2 text-[11px] text-gray-600 font-medium">{record.clock_out ? formatAttendanceTime(record.clock_out) : "--:--"}</td>
                          <td className="px-4 py-2 text-[11px] text-gray-500 font-medium">{lateMinStr}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${isGoodHrs ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {workHrsStr === '--' ? '0.00 Hrs' : workHrsStr.replace('h', '.').replace('m', '') + ' Hrs'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button className="text-gray-400 hover:text-gray-600 p-1">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-xs font-bold text-gray-400 uppercase tracking-wider italic">
                        No logs registered on this date
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {filteredDailyAttendance.length > parseInt(limit) && !loadingDaily && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-[11px] text-gray-500">
                Showing {((currentPage - 1) * parseInt(limit)) + 1} to {Math.min(currentPage * parseInt(limit), filteredDailyAttendance.length)} of {filteredDailyAttendance.length} entries
              </span>
              <div className="flex items-center gap-1.5">
                <Button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-md text-[11px] font-medium border-gray-200 bg-white"
                >
                  Previous
                </Button>
                {Array.from({ length: Math.ceil(filteredDailyAttendance.length / parseInt(limit)) }).map((_, i) => (
                  <Button 
                    key={i} 
                    onClick={() => setCurrentPage(i + 1)}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    size="sm"
                    className={`h-7 w-7 rounded-md text-[11px] font-medium ${currentPage === i + 1 ? 'bg-[#7B0099] hover:bg-[#5e0080] text-white border-[#7B0099]' : 'border-gray-200 bg-white'}`}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button 
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredDailyAttendance.length / parseInt(limit)), p + 1))} 
                  disabled={currentPage === Math.ceil(filteredDailyAttendance.length / parseInt(limit))}
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-md text-[11px] font-medium border-gray-200 bg-white"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* EMPLOYEE ABSENTEEISM TABLE */}
      <Card className="border border-gray-200/80 bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-800">Employee Absenteeism</h2>
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-red-50 text-red-600 border border-red-100">
              {filteredAbsentEmployees.length} Absent Today
            </span>
          </div>
          
          <div className="flex items-center gap-3 mt-3 sm:mt-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500">Row Per Page</span>
              <Select value={absentLimit} onValueChange={setAbsentLimit}>
                <SelectTrigger className="w-[60px] h-7 text-[11px] font-semibold rounded-md border-gray-200 bg-white text-gray-700 shadow-sm">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative w-full sm:w-[220px]">
              <Search className="absolute left-3 top-2 h-3 w-3 text-gray-400" />
              <input 
                type="text"
                placeholder="Search..."
                value={absentSearchTerm}
                onChange={(e) => setAbsentSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 w-full text-[11px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7B0099] h-7 shadow-sm"
              />
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {loadingAbsent ? (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-[#7B0099] opacity-40" />
              <p className="text-xs font-medium text-gray-500 animate-pulse">Checking absent employees...</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/80 text-gray-500 uppercase text-[9px] font-bold tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2">Branch</th>
                    <th className="px-4 py-2">Department</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAbsentEmployees.length > 0 ? (
                    filteredAbsentEmployees.slice((absentCurrentPage - 1) * parseInt(absentLimit), absentCurrentPage * parseInt(absentLimit)).map((emp) => (
                      <tr key={emp.user_id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-md bg-red-500/10 text-red-600 font-bold flex items-center justify-center text-xs uppercase shadow-sm">
                              {emp.full_name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-800 block text-xs">{emp.full_name}</span>
                              <span className="text-[10px] text-gray-400 mt-0.5 block">{emp.user_id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-[11px] text-gray-600 font-medium">{emp.branch || "HQ"}</td>
                        <td className="px-4 py-2 text-[11px] text-gray-600 font-medium">{emp.department || "—"}</td>
                        <td className="px-4 py-2 text-[11px] text-gray-600 font-medium capitalize">
                          {emp.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-50 text-red-700 border border-red-100">
                            <span className="w-1 h-1 rounded-full mr-1 bg-red-500" />
                            Absent
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-xs font-bold text-gray-400 uppercase tracking-wider italic">
                        All hands on deck! No employees are absent today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* HISTORICAL CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Monthly Attendance Trend */}
        <Card className="border border-gray-200/80 bg-white rounded-xl shadow-sm overflow-hidden lg:col-span-7 flex flex-col h-fit">
          <CardHeader className="pb-4 pt-5 px-6 border-b border-gray-100 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-700" />
              <CardTitle className="text-[16px] font-semibold text-gray-900">Monthly Attendance Trend</CardTitle>
            </div>
            <p className="text-[12px] text-gray-500 pl-7">Attendance rate over the last 6 months.</p>
          </CardHeader>
          <CardContent className="pt-6 px-6 pb-6">
            <div className="flex items-center gap-6 mb-6">
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-gray-500 mb-1">Average Attendance</span>
                <span className="text-[32px] font-bold text-gray-900 leading-none">95%</span>
              </div>
              <div className="flex flex-col justify-end pb-1">
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded text-[12px]">
                  <TrendingUp className="w-3 h-3" /> +2.1%
                </span>
                <span className="text-[12px] text-gray-500 mt-1">vs Last Month</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthlyData.length > 0 ? monthlyData : fallbackMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#111827', fontWeight: 600 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke="#0F4C5C" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#0F4C5C', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 6, fill: '#16A34A', strokeWidth: 0 }}
                  name="Attendance Rate (%)" 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Overview */}
        <Card className="border border-gray-200/80 bg-white rounded-xl shadow-sm overflow-hidden lg:col-span-5 flex flex-col h-fit">
          <CardHeader className="pb-4 pt-5 px-6 border-b border-gray-100 flex flex-row items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-gray-700" />
                <CardTitle className="text-[16px] font-semibold text-gray-900">Attendance Overview</CardTitle>
              </div>
              <p className="text-[12px] text-gray-500 pl-7">Track and monitor attendance statistics for today.</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-[12px] px-3 border-gray-200 bg-white text-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex items-center gap-1.5 rounded-md">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <span>Today</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </Button>
          </CardHeader>
          <CardContent className="pt-6 px-6 pb-6 flex-1 flex flex-col">
            
            {/* KPI micro-header */}
            <div className="grid grid-cols-5 gap-2 mb-6 border-b border-gray-100 pb-4">
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-medium text-gray-500 uppercase text-center leading-tight">Total<br/>Employees</span>
                <span className="text-[18px] font-bold text-gray-900">{liveStats.total || 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-medium text-gray-500 uppercase text-center leading-tight">Total<br/>Present</span>
                <span className="text-[18px] font-bold text-gray-900">{liveStats.present || 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-medium text-gray-500 uppercase text-center leading-tight">Present<br/>(On Time)</span>
                <span className="text-[18px] font-bold text-gray-900">{Math.max(0, (liveStats.present || 0) - (liveStats.late || 0))}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-medium text-gray-500 uppercase text-center leading-tight">Present<br/>(Late)</span>
                <span className="text-[18px] font-bold text-gray-900">{liveStats.late || 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-medium text-gray-500 uppercase text-center leading-tight">Absent<br/>&nbsp;</span>
                <span className="text-[18px] font-bold text-gray-900">{liveStats.absent || 0}</span>
              </div>
            </div>

            {/* Main Content Box */}
            <div className="flex flex-col gap-6">
              
              {/* Top: Donut Chart & Breakdown */}
              <div className="flex flex-row items-center gap-8">
                <div className="relative h-[160px] w-[160px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { name: 'Present (On Time)', value: Math.max(0, (liveStats.present || 0) - (liveStats.late || 0)), color: '#16A34A' },
                          { name: 'Present (Late)', value: liveStats.late || 0, color: '#EAB308' },
                          { name: 'On Leave', value: liveStats.onLeave || 0, color: '#3B82F6' },
                          { name: 'Absent', value: liveStats.absent || 0, color: '#DC2626' },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={6}
                        onMouseEnter={(entry) => setHoveredSlice(entry)}
                        onMouseLeave={() => setHoveredSlice(null)}
                      >
                        {[
                          { name: 'Present (On Time)', value: Math.max(0, (liveStats.present || 0) - (liveStats.late || 0)), color: '#16A34A' },
                          { name: 'Present (Late)', value: liveStats.late || 0, color: '#EAB308' },
                          { name: 'On Leave', value: liveStats.onLeave || 0, color: '#3B82F6' },
                          { name: 'Absent', value: liveStats.absent || 0, color: '#DC2626' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[28px] font-black text-gray-900 leading-none">
                      {hoveredSlice ? hoveredSlice.value : (liveStats.total || 0)}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-1 text-center max-w-[90px] truncate">
                      {hoveredSlice ? hoveredSlice.name : "Total"}
                    </span>
                  </div>
                </div>

                {/* Status Legend */}
                <div className="flex-1 flex flex-col justify-center space-y-3">
                  {[
                    { name: 'Present (On Time)', value: Math.max(0, (liveStats.present || 0) - (liveStats.late || 0)), color: '#16A34A' },
                    { name: 'Present (Late)', value: liveStats.late || 0, color: '#EAB308' },
                    { name: 'On Leave', value: liveStats.onLeave || 0, color: '#3B82F6' },
                    { name: 'Absent', value: liveStats.absent || 0, color: '#DC2626' },
                  ].map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-[12px] font-bold text-gray-700 truncate">
                          {entry.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[13px] font-black text-gray-900">
                          {entry.value}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400 min-w-[32px] text-right">
                          ({liveStats.total > 0 ? Math.round((entry.value / liveStats.total) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anomaly Insight Section */}
              {((liveStats.absent || 14) / (liveStats.total || 15)) > 0.2 && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="text-[13px] font-semibold">Attendance dropped {Math.round(((liveStats.absent || 14)/(liveStats.total || 15))*100)}% this month.</span>
                  </div>
                  <p className="text-[12px] text-amber-700 pl-6">
                    Primary cause:<br />
                    <span className="font-medium text-amber-900">{liveStats.absent || 14} employees currently absent.</span>
                  </p>
                  <div className="pl-6 pt-1">
                    <button className="text-[12px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1">
                      View Employees <ChevronDown className="w-3 h-3 -rotate-90" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
