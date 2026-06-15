import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, FileBarChart, Loader2, Users, TrendingUp, History, Calendar, Filter, 
  Activity, Clock, AlertCircle, Sparkles, Plus, Check, Trash2, Building2, UserPlus, 
  Settings2, RefreshCw, BarChart2, PieChart, Info, ShieldAlert, MapPin
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, Cell, PieChart as RechartsPieChart, Pie
} from "recharts";
import LeaveAnalytics from "./LeaveAnalytics";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "../config/api";

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
  if (!clockIn || !clockOut) return "--";
  const start = new Date(clockIn).getTime();
  const end = new Date(clockOut).getTime();
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
  const [activeTab, setActiveTab] = useState<"attendance" | "leave" | "generator" | "settings" | "leave_monitoring">("attendance");
  
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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto px-1 sm:px-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#7B0099] rounded-[20px] text-white shadow-xl shadow-[#7B0099]/20">
            <FileBarChart className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight uppercase leading-none">HR & Staff Insights</h1>
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-1.5 uppercase tracking-widest opacity-60">Enterprise Administration & Analytics Dashboard</p>
          </div>
        </div>
      </div>

      {/* CORE FLOATING SEGMENT TABS & ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="inline-flex bg-gradient-to-r from-[#800A7A] via-[#7B0099] to-[#3d0052] p-1.5 rounded-[18px] w-full lg:w-fit max-w-full shadow-xl overflow-x-auto scrollbar-none border border-[#7B0099]/20 relative z-10">
        <button
          onClick={() => setActiveTab("attendance")}
          className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 text-[11px] font-black rounded-[12px] tracking-wider transition-all uppercase whitespace-nowrap ${
            activeTab === "attendance"
              ? "bg-white text-[#7B0099] shadow-md scale-[1.01]"
              : "text-white/90 hover:text-white hover:bg-white/10 active:bg-white/15"
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          Attendance & Punctuality
        </button>

        {(role === "hr_admin" || role === "managing_director") && (
          <button
            onClick={() => setActiveTab("leave_monitoring")}
            className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 text-[11px] font-black rounded-[12px] tracking-wider transition-all uppercase whitespace-nowrap ${
              activeTab === "leave_monitoring"
                ? "bg-white text-[#7B0099] shadow-md scale-[1.01]"
                : "text-white/90 hover:text-white hover:bg-white/10 active:bg-white/15"
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            Leave Monitoring
          </button>
        )}
        <button
          onClick={() => setActiveTab("generator")}
          className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 text-[11px] font-black rounded-[12px] tracking-wider transition-all uppercase whitespace-nowrap ${
            activeTab === "generator"
              ? "bg-white text-[#7B0099] shadow-md scale-[1.01]"
              : "text-white/90 hover:text-white hover:bg-white/10 active:bg-white/15"
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          Generate Report
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-xl border border-border/50 shadow-inner">
          <input
            type="date"
            className="h-8 bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 p-0 text-foreground cursor-pointer"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          className="gap-2 border-[#7B0099] text-[#7B0099] hover:bg-[#7B0099]/5 rounded-xl font-black text-[10px] uppercase tracking-widest px-5 py-5 shadow-sm active:scale-95 transition-all h-[44px]"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>
    </div>

      {/* ================================================================= */}
      {/* TAB 1: ATTENDANCE & PUNCTUALITY */}
      {/* ================================================================= */}
      {activeTab === "attendance" && (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
          {/* KPI HIGHLIGHT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Card 1: Present Today */}
            <Card className="shadow-md bg-[#eff6ff] dark:bg-[#0c1f3c] hover:bg-[#e0f0ff] dark:hover:bg-[#0e2547] border border-[#dbeafe] dark:border-[#163063]/40 rounded-[24px] relative overflow-hidden transition-all duration-300 group">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest block truncate">Present Today</span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-black text-blue-600 dark:text-blue-400">{attendanceStats.presentToday}</span>
                    <span className="text-[9px] font-black text-blue-700 dark:text-blue-300 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">Active Personnel</span>
                  </div>
                  <p className="text-[9px] text-blue-800/60 dark:text-blue-400/60 font-semibold uppercase tracking-wider">Arrived and clocked in</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Late Today */}
            <Card className="shadow-md bg-[#fffbeb] dark:bg-[#2c1e0e] hover:bg-[#fff7d6] dark:hover:bg-[#342411] border border-[#fef3c7] dark:border-[#4d3214]/40 rounded-[24px] relative overflow-hidden transition-all duration-300 group">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500" />
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest block truncate">Late Today</span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{attendanceStats.lateArrivals}</span>
                    <span className="text-[9px] font-black text-amber-700 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">Post Threshold</span>
                  </div>
                  <p className="text-[9px] text-amber-800/60 dark:text-amber-400/60 font-semibold uppercase tracking-wider">Post {workStartTime} Window</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Absent Today */}
            <Card className="shadow-md bg-[#fef2f2] dark:bg-[#3b1313] hover:bg-[#fee2e2] dark:hover:bg-[#471717] border border-[#fecaca] dark:border-[#631e1e]/40 rounded-[24px] relative overflow-hidden transition-all duration-300 group">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500" />
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <span className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase tracking-widest block truncate">Absent Today</span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-black text-red-600 dark:text-red-400">{attendanceStats.absentToday}</span>
                    <span className="text-[9px] font-black text-red-700 dark:text-red-300 bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">Not Synced</span>
                  </div>
                  <p className="text-[9px] text-red-800/60 dark:text-red-400/60 font-semibold uppercase tracking-wider">Not clocked in today</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Attendance Rate */}
            <Card className="shadow-md bg-[#eefcf2] dark:bg-[#0d2a1a] hover:bg-[#e6f9ed] dark:hover:bg-[#0f331f] border border-[#c3f2d2] dark:border-[#0e4827]/40 rounded-[24px] relative overflow-hidden transition-all duration-300 group">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block truncate">Attendance Rate</span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{attendanceStats.attendanceRate}%</span>
                    <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">▲ Target Met</span>
                  </div>
                  <p className="text-[9px] text-emerald-800/60 dark:text-emerald-400/60 font-semibold uppercase tracking-wider">Excluding active leaves</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TODAY'S ATTENDANCE LIVE PULSE */}
          <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden">
            <div className="bg-[#7B0099]/5 px-6 py-6 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/50 dark:bg-black/20 rounded-xl">
                  <Users className="w-5 h-5 text-[#7B0099]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Today's Attendance</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 italic">Live Pulse • Real-time Stream</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-[10px] font-black rounded-xl border-border/50 bg-white/50 dark:bg-black/20">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={limit} onValueChange={setLimit}>
                  <SelectTrigger className="w-[80px] h-9 text-[10px] font-black rounded-xl border-border/50 bg-white/50 dark:bg-black/20">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="10">10 Rows</SelectItem>
                    <SelectItem value="20">20 Rows</SelectItem>
                    <SelectItem value="50">50 Rows</SelectItem>
                  </SelectContent>
                </Select>
                <Badge className="bg-[#7B0099] text-white font-black text-[10px] px-3.5 py-2 rounded-full shadow-lg shadow-[#7B0099]/20 tracking-wider">
                  {filteredDailyAttendance.length} RECORDS
                </Badge>
              </div>
            </div>
            <CardContent className="p-0">
              {loadingDaily ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-[#7B0099] opacity-40" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Syncing logs...</p>
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/30 text-foreground uppercase text-[10px] font-black tracking-widest border-b border-border/40">
                      <tr>
                        <th className="px-6 py-4">Employee</th>
                        <th className="px-6 py-4">Branch</th>
                        <th className="px-6 py-4">In</th>
                        <th className="px-6 py-4">Out</th>
                        <th className="px-6 py-4 text-center">Work Hrs</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {filteredDailyAttendance.length > 0 ? (
                        filteredDailyAttendance.slice((currentPage - 1) * parseInt(limit), currentPage * parseInt(limit)).map((record) => (
                          <tr key={record.user_id} className="hover:bg-[#7B0099]/5 transition-colors group">
                            <td className="px-6 py-4">
                              <span className="font-black text-foreground group-hover:text-[#7B0099] transition-colors">{record.full_name}</span>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-50">ID: {record.user_id}</p>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground font-black text-[11px] uppercase tracking-widest">{record.branch}</td>
                            <td className="px-6 py-4 font-black text-[#7B0099] text-xs">{formatAttendanceTime(record.clock_in)}</td>
                            <td className="px-6 py-4 text-xs font-bold text-muted-foreground">{record.clock_out ? formatAttendanceTime(record.clock_out) : "--:--"}</td>
                            <td className="px-6 py-4 text-xs font-bold text-muted-foreground text-center">{calculateWorkingHours(record.clock_in, record.clock_out)}</td>
                            <td className="px-6 py-4 text-center">
                              <Badge
                                className={`text-[9px] font-black px-2.5 h-5.5 shadow-sm border-none text-white ${!record.clock_out
                                    ? "bg-[#22C55E]"
                                    : "bg-muted text-muted-foreground opacity-50"
                                  }`}
                              >
                                {!record.time_out && <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-ping" />}
                                {record.time_out ? "CLOCKED OUT" : "PRESENT"}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-20 text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic opacity-30">
                            No logs registered on this date
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {filteredDailyAttendance.length > parseInt(limit) && !loadingDaily && (
                <div className="flex justify-center items-center gap-2 py-4 border-t border-border/40 bg-muted/5">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-xl bg-white/80 dark:bg-black/40 flex items-center justify-center font-black text-foreground hover:bg-[#7B0099]/10 disabled:opacity-50 transition-all shadow-sm border border-border/50 text-xs"
                  >
                    &laquo;
                  </button>
                  {Array.from({ length: Math.ceil(filteredDailyAttendance.length / parseInt(limit)) }).map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black transition-all shadow-sm border text-xs ${currentPage === i + 1 ? "bg-[#7B0099] text-white border-[#7B0099] shadow-[#7B0099]/30 scale-105" : "bg-white/80 dark:bg-black/40 text-foreground border-border/50 hover:bg-[#7B0099]/10"}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredDailyAttendance.length / parseInt(limit)), p + 1))} 
                    disabled={currentPage === Math.ceil(filteredDailyAttendance.length / parseInt(limit))}
                    className="w-8 h-8 rounded-xl bg-white/80 dark:bg-black/40 flex items-center justify-center font-black text-foreground hover:bg-[#7B0099]/10 disabled:opacity-50 transition-all shadow-sm border border-border/50 text-xs"
                  >
                    &raquo;
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ATTENDANCE ANOMALIES */}
          <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-sm sm:text-base font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                  <div className="p-2 bg-rose-500/10 rounded-xl">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                  </div>
                  Attendance Anomalies Detection
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11 mt-1">Automatic detection of lateness and patterns from live data</CardDescription>
              </div>
              
              {allAnomalies.length > 10 && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Show</span>
                    <Select value={anomaliesLimit} onValueChange={setAnomaliesLimit}>
                      <SelectTrigger className="w-[70px] h-8 text-[10px] font-black rounded-xl border-border/50 bg-white/50 dark:bg-black/20">
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {allAnomalies.length > parseInt(anomaliesLimit) && (
                    <div className="flex justify-center items-center gap-1">
                      <button 
                        onClick={() => setAnomaliesCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={anomaliesCurrentPage === 1}
                        className="w-7 h-7 rounded-lg bg-white/80 dark:bg-black/40 flex items-center justify-center font-black text-foreground hover:bg-[#7B0099]/10 disabled:opacity-50 transition-all shadow-sm border border-border/50 text-xs"
                      >
                        &laquo;
                      </button>
                      {Array.from({ length: Math.ceil(allAnomalies.length / parseInt(anomaliesLimit)) }).map((_, i) => (
                        <button 
                          key={i} 
                          onClick={() => setAnomaliesCurrentPage(i + 1)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black transition-all shadow-sm border text-xs ${anomaliesCurrentPage === i + 1 ? "bg-[#7B0099] text-white border-[#7B0099] shadow-[#7B0099]/30 scale-105" : "bg-white/80 dark:bg-black/40 text-foreground border-border/50 hover:bg-[#7B0099]/10"}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button 
                        onClick={() => setAnomaliesCurrentPage(p => Math.min(Math.ceil(allAnomalies.length / parseInt(anomaliesLimit)), p + 1))} 
                        disabled={anomaliesCurrentPage === Math.ceil(allAnomalies.length / parseInt(anomaliesLimit))}
                        className="w-7 h-7 rounded-lg bg-white/80 dark:bg-black/40 flex items-center justify-center font-black text-foreground hover:bg-[#7B0099]/10 disabled:opacity-50 transition-all shadow-sm border border-border/50 text-xs"
                      >
                        &raquo;
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-4 p-6">
                {allAnomalies.slice((anomaliesCurrentPage - 1) * parseInt(anomaliesLimit), anomaliesCurrentPage * parseInt(anomaliesLimit)).map((anomaly) => (
                  <div key={anomaly.id} className="flex items-center justify-between p-4 rounded-2xl border transition-all" style={{ backgroundColor: `${anomaly.color}0D`, borderColor: `${anomaly.color}1A` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${anomaly.color}1A`, color: anomaly.color }}>
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-foreground uppercase tracking-wide">{anomaly.full_name}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{anomaly.branch} • {anomaly.desc}</p>
                      </div>
                    </div>
                    <Badge className="font-black text-[9px] tracking-wider border-none px-3 py-1 uppercase rounded-lg" style={{ backgroundColor: `${anomaly.color}26`, color: anomaly.color }}>
                      {anomaly.title}
                    </Badge>
                  </div>
                ))}

                {allAnomalies.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground uppercase font-bold tracking-widest">
                    No active anomalies detected today
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* LIVE PERFORMANCE PULSE (HORIZONTAL CHARTS & HEATMAPS) */}
          <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
              <div>
                <CardTitle className="text-sm sm:text-lg font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                  <div className="p-2.5 bg-[#7B0099]/10 rounded-xl relative overflow-hidden">
                    <Activity className="w-5 h-5 text-[#7B0099]" />
                  </div>
                  Live Branch Pulse
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-70 ml-12 italic text-muted-foreground mt-1">Real-time branch attendance averages leaderboard</CardDescription>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { value: "all", label: "All Regions" },
                  { value: "North Malaysia", label: "North" },
                  { value: "Central / West Coast", label: "Central" },
                  { value: "South Malaysia", label: "South" },
                  { value: "East Coast / East Malaysia", label: "East" }
                ].map((reg) => (
                  <Button
                    key={reg.value}
                    variant={liveRegion === reg.value ? "default" : "outline"}
                    onClick={() => setLiveRegion(reg.value)}
                    className={`h-8 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 border-border/60 ${
                      liveRegion === reg.value
                        ? "bg-[#7B0099] hover:bg-[#5e0080] text-white shadow-md shadow-[#7B0099]/10"
                        : "text-muted-foreground hover:bg-[#7B0099]/5 hover:text-[#7B0099] bg-white/50 dark:bg-black/10"
                    }`}
                  >
                    {reg.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pt-8 w-full">
              {/* Horizontal Bar Chart */}
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7B0099] animate-pulse" />
                    Branch Leaderboard
                  </h4>
                </div>
                <div className="w-full transition-all duration-500" style={{ height: `${Math.max(250, liveBranchRanking.length * 40)}px` }}>
                  {liveBranchRanking.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={liveBranchRanking} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,0,153,0.05)" horizontal={true} vertical={false} />
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="branch" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: 'hsl(var(--foreground))' }} width={45} />
                        <Tooltip
                          cursor={{ fill: 'rgba(123,0,153,0.03)' }}
                          contentStyle={{ borderRadius: '16px', border: '1px solid rgba(123,0,153,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '12px', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}
                        />
                        <Bar dataKey="rate" radius={[0, 8, 8, 0]} barSize={14}>
                          {liveBranchRanking.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground uppercase font-black">
                      No matching records
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* HISTORICAL CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-sm sm:text-base font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                  <div className="p-2 bg-[#7B0099]/10 rounded-xl">
                    <TrendingUp className="w-4 h-4 text-[#7B0099]" />
                  </div>
                  Monthly Attendance Growth
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyData.length > 0 ? monthlyData : fallbackMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,0,153,0.05)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 900 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="attendance" stroke="#7B0099" strokeWidth={4} dot={{ r: 5, fill: '#7B0099', strokeWidth: 3, stroke: '#fff' }} name="Attendance Rate (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-sm sm:text-base font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                  <div className="p-2 bg-[#7B0099]/10 rounded-xl">
                    <History className="w-4 h-4 text-[#7B0099]" />
                  </div>
                  Absence Volume Pattern
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData.length > 0 ? monthlyData : fallbackMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,0,153,0.05)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="leave_request" fill="#7B0099" radius={[8, 8, 0, 0]} name="Approved Leaves" barSize={35} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: LEAVE UTILIZATION ANALYTICS */}
      {/* ================================================================= */}
      {activeTab === "leave" && (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Department Utilization Bar Chart */}
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden lg:col-span-2">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-sm sm:text-base font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                  <div className="p-2 bg-[#7B0099]/10 rounded-xl">
                    <BarChart2 className="w-4 h-4 text-[#7B0099]" />
                  </div>
                  Leave Utilization by Department
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11">Total leave days taken per department split by category</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loadingLeave ? (
                  <div className="h-[280px] flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#7B0099]" />
                  </div>
                ) : utilizationChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={utilizationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,0,153,0.05)" vertical={false} />
                      <XAxis dataKey="department" tick={{ fontSize: 9, fontWeight: 900 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }} />
                      <Bar dataKey="Cuti Tahunan" fill="#7B0099" name="Annual" stackId="a" barSize={30} />
                      <Bar dataKey="Cuti Sakit" fill="#C2185B" name="Sick" stackId="a" barSize={30} />
                      <Bar dataKey="Unpaid Leave" fill="#EAB308" name="Unpaid" stackId="a" barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground uppercase font-black tracking-widest">
                    No leave data recorded in database
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Leave Type Donut Chart */}
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-sm sm:text-base font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                  <div className="p-2 bg-[#7B0099]/10 rounded-xl">
                    <PieChart className="w-4 h-4 text-[#7B0099]" />
                  </div>
                  Leave Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 flex flex-col items-center">
                {loadingLeave ? (
                  <div className="h-[280px] flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#7B0099]" />
                  </div>
                ) : processedPieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsPieChart>
                        <Pie
                          data={processedPieData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {processedPieData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={distColors[index % distColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2.5 w-full mt-4">
                      {processedPieData.map((item: any, index: number) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: distColors[index % distColors.length] }}></span>
                            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">{item.name}</span>
                          </div>
                          <span className="text-xs font-black text-foreground">{item.value} Days</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground uppercase font-black">
                    No approved leaves distribution
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ACTIVE STAFFING GAPS WARNING */}
          <Card className="border-none shadow-sm bg-rose-500/10 border border-rose-500/20 rounded-[28px] overflow-hidden">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="w-12 h-12 bg-rose-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h4 className="text-sm font-black text-rose-500 uppercase tracking-wider">Critical Staff Capacity Warning</h4>
                <p className="text-[11px] font-semibold text-muted-foreground mt-1 uppercase tracking-wide">
                  System detected overlapping active approved leaves for HOD and Branch Leaders. Ensure operations coverage.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* BRANCH LEADER TIMELINE */}
          <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-sm sm:text-base font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                <div className="p-2 bg-[#7B0099]/10 rounded-xl">
                  <Calendar className="w-4 h-4 text-[#7B0099]" />
                </div>
                HOD & Leader Active Leave Schedule
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11">Chronological roster of key operations managers currently or soon on leave</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingLeave ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="animate-spin text-[#7B0099]" />
                </div>
              ) : leaveUtilization?.leaderLeaves?.length > 0 ? (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/30 text-foreground uppercase text-[10px] font-black tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Leader</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Branch/Dept</th>
                        <th className="px-6 py-4">Timeline</th>
                        <th className="px-6 py-4 text-center">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {leaveUtilization.leaderLeaves.map((leave: any) => (
                        <tr key={leave.leave_id} className="hover:bg-[#7B0099]/5 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-black text-foreground">{leave.full_name}</span>
                          </td>
                          <td className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {leave.role.replace("_", " ")}
                          </td>
                          <td className="px-6 py-4 text-[10px] font-black text-[#7B0099] uppercase tracking-wider">
                            {leave.branch} • {leave.department}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                            {new Date(leave.start_date).toLocaleDateString()} to {new Date(leave.end_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-center font-black text-xs text-foreground font-mono">
                            {leave.days} Days
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-20 text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic opacity-40">
                  No active leader leaves discovered in database
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: GENERATE REPORT SECTION */}
      {/* ================================================================= */}
      {activeTab === "generator" && (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
            
            {/* Generator Settings Form */}
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden lg:col-span-2 p-6 space-y-6">
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
                    className={`p-4 rounded-2xl border text-left flex flex-col gap-1.5 transition-all ${
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
                    className={`p-4 rounded-2xl border text-left flex flex-col gap-1.5 transition-all ${
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
                    className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
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
                    className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
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
                    className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
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
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden p-6 flex flex-col gap-6">
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
      )}

      {/* ================================================================= */}
      {/* TAB 4: LEAVE MONITORING (LeaveAnalytics) */}
      {/* ================================================================= */}
      {activeTab === "leave_monitoring" && (
        <div className="animate-in fade-in duration-500">
          <LeaveAnalytics />
        </div>
      )}

    </div>
  );
}
