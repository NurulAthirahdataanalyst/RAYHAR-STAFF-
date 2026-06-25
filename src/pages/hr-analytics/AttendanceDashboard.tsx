
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
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("all");

  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("last7");
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
    try {
      const [resDaily, resStats] = await Promise.all([
        fetch(`${API_BASE_URL}/api/reports/daily-attendance?date=${selectedDate}&role=${role || ""}&branch=${userBranch || ""}&department=${userDepartment || ""}`),
        fetch(`${API_BASE_URL}/api/dashboard-stats?userId=ADMIN&role=${role || ""}&branch=${userBranch || "All"}&department=${userDepartment || "All"}&date=${selectedDate}`)
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
        
        let status = r.time_out ? "Clocked Out" : "Present";
        if (r.clock_in && new Date(r.clock_in).getHours() >= 9) { // Simple late check
          status = "Late";
        }
        const matchesStatus = selectedStatusFilter === "all" || 
          (selectedStatusFilter === "present" && status === "Present") ||
          (selectedStatusFilter === "late" && status === "Late") ||
          (selectedStatusFilter === "absent" && status === "Absent") ||
          (selectedStatusFilter === "clocked_out" && status === "Clocked Out");
          
        return matchesBranch && matchesDept && matchesSearch && matchesStatus;
      });
  }, [dailyAttendance, selectedBranchFilter, selectedDepartmentFilter, searchTerm, selectedStatusFilter]);


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
    <div className="space-y-4 animate-in fade-in duration-500 max-w-[1600px] w-full mx-auto px-4 py-4">

      {/* ── LIVE PRESENCE PANEL ─────────────────────────────────────────── */}
      <Card className="border border-white/60 bg-white/40 backdrop-blur-2xl rounded-xl shadow-md overflow-hidden ring-1 ring-black/5">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 md:px-6 pt-4 pb-3 border-b border-white/60 bg-white/30 backdrop-blur-md">
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

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 p-4 md:p-5 bg-transparent">
            {/* Present */}
            <div
              className="relative overflow-hidden p-4 flex flex-col gap-2 text-left rounded-lg border-y border-r border-l-4 bg-[#F2F7FE] border-r-blue-100 border-y-blue-100 border-l-blue-600"
            >
              <div className="flex justify-between items-start w-full relative z-10">
                <span className="text-[11px] font-black text-blue-800 uppercase tracking-widest mt-1">Present Today</span>
                <div className="w-10 h-10 rounded-[14px] bg-blue-100/60 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="relative z-10 mt-[-16px]">
                <div className="flex items-end gap-2">
                  <span className="text-3xl leading-none font-black text-blue-700 tracking-tight">{liveStats.present}</span>
                  <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest mb-1 shadow-sm">
                    Active Personnel
                  </span>
                </div>
                <p className="text-[10px] font-black text-blue-500/80 uppercase tracking-widest mt-3">
                  Arrived and Clocked In
                </p>
              </div>
            </div>

            {/* Late */}
            <div
              className="relative overflow-hidden p-4 flex flex-col gap-2 text-left rounded-lg border-y border-r border-l-4 bg-[#FFFDF4] border-r-amber-100 border-y-amber-100 border-l-amber-500"
            >
              <div className="flex justify-between items-start w-full relative z-10">
                <span className="text-[11px] font-black text-amber-800 uppercase tracking-widest mt-1">Late Today</span>
                <div className="w-10 h-10 rounded-[14px] bg-amber-100/60 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <div className="relative z-10 mt-[-16px]">
                <div className="flex items-end gap-2">
                  <span className="text-3xl leading-none font-black text-amber-600 tracking-tight">{liveStats.late}</span>
                  <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest mb-1 shadow-sm">
                    Post Threshold
                  </span>
                </div>
                <p className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest mt-3">
                  Post {workStartTime} Window
                </p>
              </div>
            </div>

            {/* Absent */}
            <div
              className="relative overflow-hidden p-4 flex flex-col gap-2 text-left rounded-lg border-y border-r border-l-4 bg-[#FFF6F6] border-r-red-100 border-y-red-100 border-l-red-500"
            >
              <div className="flex justify-between items-start w-full relative z-10">
                <span className="text-[11px] font-black text-red-800 uppercase tracking-widest mt-1">Absent Today</span>
                <div className="w-10 h-10 rounded-[14px] bg-red-100/60 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="relative z-10 mt-[-16px]">
                <div className="flex items-end gap-2">
                  <span className="text-3xl leading-none font-black text-red-600 tracking-tight">{liveStats.absent}</span>
                  <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest mb-1 shadow-sm">
                    Not Synced
                  </span>
                </div>
                <p className="text-[10px] font-black text-red-500/80 uppercase tracking-widest mt-3">
                  Not Clocked In Today
                </p>
              </div>
            </div>

            {/* Attendance Rate */}
            <div
              className="relative overflow-hidden p-4 flex flex-col gap-2 text-left rounded-lg border-y border-r border-l-4 bg-[#F2FBF5] border-r-emerald-100 border-y-emerald-100 border-l-emerald-500"
            >
              <div className="flex justify-between items-start w-full relative z-10">
                <span className="text-[11px] font-black text-emerald-800 uppercase tracking-widest mt-1">Attendance Rate</span>
                <div className="w-10 h-10 rounded-[14px] bg-emerald-100/60 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="relative z-10 mt-[-16px]">
                <div className="flex items-end gap-2">
                  <span className="text-3xl leading-none font-black text-emerald-700 tracking-tight">
                    {liveStats.total > 0 ? Math.round((liveStats.present / liveStats.total) * 100) : 0}%
                  </span>
                  <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 mb-1 shadow-sm">
                    <span className="text-[10px]">▲</span> Target Met
                  </span>
                </div>
                <p className="text-[10px] font-black text-emerald-600/80 uppercase tracking-widest mt-3">
                  Excluding Active Leaves
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ADMIN ATTENDANCE TABLE */}
      <Card className="border border-gray-200/80 bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-800">Admin Attendance</h2>
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

              {/* Status Filter */}
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs font-medium rounded-md border-gray-200 bg-white text-gray-700 shadow-sm">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="all">Select Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
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

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
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
              <span className="text-xs text-gray-500">Entries</span>
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

                      let status = record.time_out ? "Clocked Out" : "Present";
                      if (isLate && !record.time_out) {
                        status = "Late";
                      }
                      
                      const statusClass = status === "Present" 
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : status === "Late"
                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                        : "bg-gray-50 text-gray-600 border border-gray-100";

                      const workHrsStr = calculateWorkingHours(record.clock_in, record.clock_out);
                      const workHrsNum = parseFloat(workHrsStr.replace('h', '.').replace('m', '')) || 0;
                      const isGoodHrs = workHrsNum >= 8.0;

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
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${statusClass}`}>
                              <span className={`w-1 h-1 rounded-full mr-1 ${status === 'Present' ? 'bg-green-500' : status === 'Late' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                              {status}
                            </span>
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
      
      {/* HISTORICAL CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-gray-200 bg-white rounded-lg shadow-sm overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 border-b border-gray-100 flex flex-row items-center gap-2">
            <div className="p-2 bg-[#7B0099]/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-[#7B0099]" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-gray-800 uppercase">Monthly Attendance Growth</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 px-2 pb-2">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData.length > 0 ? monthlyData : fallbackMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: '#64748B' }} domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="attendance" stroke="#7B0099" strokeWidth={3} dot={{ r: 4, fill: '#7B0099', strokeWidth: 2, stroke: '#fff' }} name="Attendance Rate (%)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col lg:col-span-2">
          <CardHeader className="pb-4 pt-6 px-6 sm:px-8 border-b border-gray-100 flex flex-row items-start justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl sm:text-2xl font-bold text-[#0f172a]">Attendance Overview</CardTitle>
              <p className="text-[13px] text-gray-500 font-medium">Track and monitor attendance statistics for today</p>
            </div>
            <Button variant="outline" size="sm" className="h-9 text-[13px] px-3 border-gray-200 bg-white text-gray-700 shadow-sm flex items-center gap-2 rounded-lg">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>Today</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="pt-6 px-6 sm:px-8 pb-6 flex-1 flex flex-col">
            
            {/* Main Content Box */}
            <div className="border border-gray-200 rounded-xl overflow-hidden flex flex-col md:flex-row">
              
              {/* Left Column: Gauge Chart */}
              <div className="flex-1 md:border-r border-b md:border-b-0 border-gray-200 p-6 flex flex-col items-center justify-center bg-gray-50/30">
                <div className="relative h-[220px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { name: 'Late', value: liveStats.late || 21, color: '#0F4C5C' },
                          { name: 'Present', value: (liveStats.present || 59) - (liveStats.late || 0) > 0 ? (liveStats.present || 59) - (liveStats.late || 0) : 59, color: '#10B981' },
                          { name: 'Permission', value: liveStats.onLeave || 2, color: '#F59E0B' },
                          { name: 'Absent', value: liveStats.absent || 15, color: '#EF4444' },
                        ]}
                        cx="50%"
                        cy="100%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius="68%"
                        outerRadius="100%"
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {[
                          { name: 'Late', value: liveStats.late || 21, color: '#0F4C5C' },
                          { name: 'Present', value: (liveStats.present || 59) - (liveStats.late || 0) > 0 ? (liveStats.present || 59) - (liveStats.late || 0) : 59, color: '#10B981' },
                          { name: 'Permission', value: liveStats.onLeave || 2, color: '#F59E0B' },
                          { name: 'Absent', value: liveStats.absent || 15, color: '#EF4444' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-[70%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center flex flex-col items-center">
                    <span className="text-[13px] text-gray-500 font-medium mb-1">Total Attendance</span>
                    <span className="text-5xl font-black text-[#0f172a]">{liveStats.total || 15}</span>
                    <span className="text-[13px] text-gray-500 font-medium mt-1">Employees</span>
                  </div>
                </div>
                <div className="text-center mt-6 text-[13px]">
                  <span className="text-[#10B981] font-bold flex items-center justify-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> 7% present today
                  </span> 
                  <span className="text-gray-400 ml-2">| vs Yesterday</span>
                </div>
              </div>

              {/* Right Column: Status Legend */}
              <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center bg-white">
                <h3 className="text-[15px] font-bold text-[#0f172a] mb-6">Attendance Status</h3>
                <div className="space-y-6">
                  {[
                    { label: 'Present', count: (liveStats.present || 0) - (liveStats.late || 0) || 1, value: liveStats.total ? Math.round((((liveStats.present || 0) - (liveStats.late || 0)) / liveStats.total) * 100) : 7, color: '#10B981' },
                    { label: 'Late', count: liveStats.late || 0, value: liveStats.total ? Math.round(((liveStats.late || 0) / liveStats.total) * 100) : 0, color: '#0F4C5C' },
                    { label: 'Permission', count: liveStats.onLeave || 0, value: liveStats.total ? Math.round(((liveStats.onLeave || 0) / liveStats.total) * 100) : 0, color: '#F59E0B' },
                    { label: 'Absent', count: liveStats.absent || 14, value: liveStats.total ? Math.round(((liveStats.absent || 0) / liveStats.total) * 100) : 93, color: '#EF4444' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                          <span className="text-[14px] text-gray-700 font-medium">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-8">
                          <span className="text-[14px] text-gray-800 font-medium">{item.count}</span>
                          <span className="text-[14px] font-bold w-8 text-right" style={{ color: item.color }}>{item.value}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 ml-7" style={{ width: 'calc(100% - 28px)' }}>
                        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Total Absentees Footer Block */}
            <div className="mt-6 border border-gray-200 rounded-xl p-4 sm:p-5 flex items-center justify-between bg-white shadow-sm">
              <div className="flex flex-col gap-2">
                <span className="text-[14px] font-bold text-[#0f172a]">Total Absentees</span>
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">JS</div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-green-100 flex items-center justify-center text-[10px] font-bold text-green-700">AK</div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-purple-100 flex items-center justify-center text-[10px] font-bold text-purple-700">MF</div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-[#ef476f] flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                    +{liveStats.absent > 3 ? liveStats.absent - 3 : 11}
                  </div>
                </div>
              </div>
              <Button variant="outline" className="text-[#f97316] border-[#fdba74] hover:bg-[#fff7ed] hover:text-[#ea580c] transition-colors rounded-lg font-bold text-[13px] h-10 px-4">
                <FileText className="w-4 h-4 mr-2" /> View Full Details
              </Button>
            </div>

            {/* Footer Line */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Data is updated in real-time</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Last updated: May 29, 2025 09:30 AM</span>
                <RefreshCw className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
