import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, FileBarChart, Loader2, Users, TrendingUp, History, Calendar, Filter, 
  Activity, Clock, AlertCircle, Sparkles, Plus, Check, Trash2, Building2, UserPlus, 
  Settings2, RefreshCw, BarChart2, PieChart, Info, ShieldAlert, MapPin, ChevronDown, FileText, FileSpreadsheet
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
  const { role } = useRole();
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
        fetch(`${API_BASE_URL}/api/dashboard-stats?userId=ADMIN&role=hr_admin&branch=All&date=${selectedDate}`)
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
       fill: d.rate >= 90 ? '#22C55E' : d.rate >= 75 ? '#F59E0B' : '#EF4444'
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
        list.push({ id: `${record.user_id}-late`, user_id: record.user_id, full_name: record.full_name, branch: record.branch, type: 'LATE', title: 'Late Checked', desc: `Late Arrival today at ${formatAttendanceTime(record.clock_in)}`, color: '#F59E0B' });
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
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 py-6">
      <Card className="border border-white/60 bg-white/40 dark:bg-card/40 backdrop-blur-2xl shadow-2xl rounded-[32px] overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#7B0099] to-transparent opacity-50" />
        <CardContent className="p-6 sm:p-8">
          <div className="space-y-4 sm:space-y-5">
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border/40">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#7B0099] rounded-[20px] text-white shadow-xl shadow-[#7B0099]/20">
            <FileBarChart className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight uppercase leading-none">Workforce Reports & Analytics</h1>
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-1.5 uppercase tracking-widest opacity-60">Enterprise Administration & Analytics Report</p>
          </div>
        </div>
      </div>
      {/* ================================================================= */}
      {/* GENERATE REPORT SECTION */}
      {/* ================================================================= */}
        <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
            
            {/* Generator Settings Form */}
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] lg:col-span-2 p-4 space-y-4 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#7B0099]/10 transition-all duration-300">
              <div>
                <h3 className="text-base sm:text-lg font-black text-foreground uppercase tracking-tight">Configure Analytical Report</h3>
                <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider opacity-60">Generate targeted PDF/CSV datasets compiled directly from live database logs</p>
              </div>

              {/* 1. Report Type Selection */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">1. Report Type Selection</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    onClick={() => setGeneratorType("trends")}
                    className={`p-4 rounded-2xl border text-left flex flex-col gap-1.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                      generatorType === "trends"
                        ? "border-[#7B0099] bg-[#7B0099]/5 text-foreground"
                        : "border-border/50 bg-background/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 ${generatorType === "trends" ? "text-[#7B0099]" : ""}`} />
                      <span className="text-xs font-black uppercase tracking-wider">Attendance Trends</span>
                    </div>
                    <span className="text-[10px] font-medium opacity-80 leading-normal">Clock-in, late check audits, and raw timelines</span>
                  </button>

                  <button
                    onClick={() => setGeneratorType("leave")}
                    className={`p-4 rounded-2xl border text-left flex flex-col gap-1.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                      generatorType === "leave"
                        ? "border-[#7B0099] bg-[#7B0099]/5 text-foreground"
                        : "border-border/50 bg-background/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <PieChart className={`w-4 h-4 ${generatorType === "leave" ? "text-[#7B0099]" : ""}`} />
                      <span className="text-xs font-black uppercase tracking-wider">Leave Utilization</span>
                    </div>
                    <span className="text-[10px] font-medium opacity-80 leading-normal">Department utilization rates and absence charts</span>
                  </button>
                </div>
              </div>

              {/* 2. Scope Select */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">2. Scope Selection</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Branch Location</label>
                    <Select value={generatorBranch} onValueChange={setGeneratorBranch}>
                      <SelectTrigger className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-border bg-background/30">
                        <SelectValue placeholder="All Branches" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">All Branches</SelectItem>
                        {branches.map(b => (
                          <SelectItem key={b.code} value={b.code} className="text-[10px] font-black uppercase tracking-widest">{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Department</label>
                    <Select value={generatorDept} onValueChange={setGeneratorDept}>
                      <SelectTrigger className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-border bg-background/30">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">All Departments</SelectItem>
                        {departments.map(d => (
                          <SelectItem key={d} value={d} className="text-[10px] font-black uppercase tracking-widest">{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Month</label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-border bg-background/30">
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">All Months</SelectItem>
                        {months.map(m => (
                          <SelectItem key={m.value} value={m.value} className="text-[10px] font-black uppercase tracking-widest">{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Year</label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-border bg-background/30">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">All Years</SelectItem>
                        {years.map(y => (
                          <SelectItem key={y.value} value={y.value} className="text-[10px] font-black uppercase tracking-widest">{y.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 3. Export Format */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">3. Export Format</span>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setGeneratorFormat("csv")}
                    className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                      generatorFormat === "csv"
                        ? "border-[#7B0099] bg-[#7B0099]/5 text-[#7B0099] font-black"
                        : "border-border/50 bg-background/20 text-muted-foreground font-semibold hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-wider">Raw CSV</span>
                  </button>
                  <button
                    onClick={() => setGeneratorFormat("excel")}
                    className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                      generatorFormat === "excel"
                        ? "border-[#7B0099] bg-[#7B0099]/5 text-[#7B0099] font-black"
                        : "border-border/50 bg-background/20 text-muted-foreground font-semibold hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <FileBarChart className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-wider">Excel Sheet</span>
                  </button>
                  <button
                    onClick={() => setGeneratorFormat("pdf")}
                    className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                      generatorFormat === "pdf"
                        ? "border-[#7B0099] bg-[#7B0099]/5 text-[#7B0099] font-black"
                        : "border-border/50 bg-background/20 text-muted-foreground font-semibold hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <FileBarChart className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-wider">PDF report</span>
                  </button>
                </div>
              </div>
            </Card>

            {/* Synthesis Preview Panel */}
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden p-4 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#7B0099]/10 transition-all duration-300">
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-widest">Synthesis Preview</h4>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider opacity-60 mt-0.5">Real-time compilation preview</p>
              </div>

              {/* Counter Display */}
              <div className="bg-muted/30 border border-border/30 rounded-2xl p-5 text-center flex flex-col gap-1 items-center justify-center select-none shadow-inner">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Live Compiled Dataset</span>
                <span className="text-3xl font-black text-[#7B0099] font-mono mt-1">
                  {dailyAttendance.length} Records
                </span>
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1 flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Synced Live via SSE
                </span>
              </div>

              {/* Distribution Heatmap Mini Grid */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Active Scope Preview</span>
                <div className="grid grid-cols-6 gap-1 bg-background/20 border border-border/30 rounded-xl p-2.5">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const fill = i % 3 === 0 ? 'bg-[#7B0099]/20' : i % 3 === 1 ? 'bg-[#7B0099]/60' : 'bg-[#7B0099]';
                    return <div key={i} className={`h-4.5 rounded-[3px] ${fill}`} />;
                  })}
                </div>
              </div>

              {/* Compile Button */}
              <Button
                onClick={triggerGenerateReport}
                disabled={isGenerating}
                className="w-full py-6 rounded-[18px] bg-gradient-to-tr from-[#5e0080] via-[#7B0099] to-purple-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-[#7B0099]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
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
        </div>
      </CardContent>
     </Card>
    </div>
  );
}
