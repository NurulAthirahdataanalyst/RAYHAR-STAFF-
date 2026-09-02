import { StaffProfileDialog } from '@/components/shared/StaffProfileDialog';
import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import PageActions from "@/components/layout/PageActions";
import { YearPopover } from "@/components/shared/YearPopover";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { exportToCSV } from "@/utils/export";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, UserCheck, CalendarDays, Calendar as CalendarIcon, Clock, FileCheck, CheckCircle2, XCircle, AlertTriangle, Building2, Download, ChevronRight, ChevronDown, Wifi, WifiOff, TrendingUp, MapPin, Plane, FileText, AlertCircle, Award, ChevronLeft } from "lucide-react";
import { getCleanReason } from "@/lib/leaveStorage";
import { format, subDays, addDays, startOfWeek, endOfWeek } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Sector, AreaChart, Area, ReferenceArea } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EmployeesRequiringAttentionCard } from '@/components/shared/EmployeesRequiringAttentionCard';
import { MissingPunchCard } from "./MissingPunchCard";

const COLORS = ['#4f46e5', '#eab308', '#94a3b8', '#DC2626', '#a855f7', '#f746b9']; // Present, Late, On Leave, Absent, Comp Leave, Outstation

const BRANCH_NAMES: Record<string, string> = {
  HQ: "HQ",
  KMM: "KMM - Kemaman",
  TGG: "TGG - Kuala Terengganu",
  CNH: "CNH - Cheneh",
  KBG: "KBG - Kuala Berang",
  DGN: "DGN - Dungun",
  JTH: "JTH - Jertih",
  KBR: "KBR - Kota Baru",
  RMP: "RMP - Rompin",
  MZM: "MZM - Muadzam Shah",
  SHA: "SHA - Shah Alam",
  BBB: "BBB - Bandar Baru Bangi",
  KUL: "KUL - Kuala Lumpur",
  IPH: "IPH - Ipoh",
  MJG: "MJG - Manjung",
  MLK: "MLK - Melaka",
  KKS: "KKS - Kuala Kangsar",
  TWU: "TWU - Tawau",
  SNS: "SNS - Seremban",
  AOR: "AOR - Alor Setar",
  BTM: "BTM - Bertam",
  BTP: "BTP - Batu Pahat",
  JB: "JB - Johor Bharu"
};

const cardHoverEffects: Record<string, string> = {
  emerald: "cursor-pointer transition-all duration-200 hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-900/50",
  orange: "cursor-pointer transition-all duration-200 hover:border-orange-500 hover:ring-1 hover:ring-orange-500 hover:bg-orange-50/50 dark:hover:bg-slate-900/50",
  purple: "cursor-pointer transition-all duration-200 hover:border-purple-500 hover:ring-1 hover:ring-purple-500 hover:bg-purple-50/50 dark:hover:bg-slate-900/50",
  red: "cursor-pointer transition-all duration-200 hover:border-red-500 hover:ring-1 hover:ring-red-500 hover:bg-red-50/50 dark:hover:bg-slate-900/50",
  amber: "cursor-pointer transition-all duration-200 hover:border-amber-500 hover:ring-1 hover:ring-amber-500 hover:bg-amber-50/50 dark:hover:bg-slate-900/50",
  blue: "cursor-pointer transition-all duration-200 hover:border-blue-500 hover:ring-1 hover:ring-blue-500 hover:bg-blue-50/50 dark:hover:bg-slate-900/50",
  indigo: "cursor-pointer transition-all duration-200 hover:border-indigo-500 hover:ring-1 hover:ring-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-slate-900/50",
  slate: "cursor-pointer transition-all duration-200 hover:border-slate-500 hover:ring-1 hover:ring-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-900/50",
};
const cardHoverEffect = cardHoverEffects.purple;

const AVATAR_COLORS = [
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-pink-100 text-pink-700",
  "bg-amber-100 text-amber-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-rose-100 text-rose-700",
];
const getAvatarColor = (str: string) => AVATAR_COLORS[(str || '').charCodeAt(0) % AVATAR_COLORS.length];

interface LiveEmp {
  user_id: string;
  full_name: string;
  initials: string;
  branch: string;
  department: string;
  role: string;
  clock_in: string | null;
  clock_out: string | null;
  late_minutes: number;
  is_late: boolean;
}

interface PendingItem {
  id: number;
  user_id: string;
  name: string;
  initials: string;
  leave_type: string;
  dates: string;
  days: string;
  reason: string;
  status: string;
}

export default function WorkforceInsights() {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const { role, userBranch, userDepartment, userId } = useRole();
  const scopeLabel = role === "head_of_department" || role === "hod" ? userDepartment : (role === "branch_leader" ? userBranch : "");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [isAllMonth, setIsAllMonth] = useState(false);
  const [trendWeekStart, setTrendWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 6 })
  );
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [day, setDay] = useState(new Date().getDate().toString().padStart(2, '0'));
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('day');
  const [selectedRegion, setSelectedRegion] = useState<string>('All Regions');

  const regionMap: Record<string, string> = {
    'AOR': 'Northern', 'Alor Setar': 'Northern', 'BTM': 'Northern', 'Bertam': 'Northern', 'IPH': 'Northern', 'Ipoh': 'Northern', 'KKS': 'Northern', 'Kuala Kangsar': 'Northern', 'MJG': 'Northern', 'Manjung': 'Northern',
    'HQ': 'Central', 'Rayhar HQ': 'Central', 'BBB': 'Central', 'Bandar Baru Bangi': 'Central', 'SHA': 'Central', 'Shah Alam': 'Central', 'KUL': 'Central', 'Kuala Lumpur': 'Central',
    'BPT': 'Southern', 'Batu Pahat': 'Southern', 'JHB': 'Southern', 'Johor Bahru': 'Southern', 'MLK': 'Southern', 'Melaka': 'Southern', 'SNS': 'Southern', 'Seremban': 'Southern',
    'KMM': 'East Coast', 'Kemaman': 'East Coast', 'CNH': 'East Coast', 'Cheneh': 'East Coast', 'DGN': 'East Coast', 'Dungun': 'East Coast', 'JTH': 'East Coast', 'Jertih': 'East Coast', 'KBG': 'East Coast', 'Kuala Berang': 'East Coast', 'TGG': 'East Coast', 'Kuala Terengganu': 'East Coast', 'KBR': 'East Coast', 'Kota Bharu': 'East Coast', 'MZM': 'East Coast', 'Muadzam Shah': 'East Coast', 'RMP': 'East Coast', 'Rompin': 'East Coast',
    'TWU': 'East Malaysia', 'Tawau': 'East Malaysia', 'RRR': 'East Coast'
  };
  const regionOrder = ['Central', 'Northern', 'Southern', 'East Coast', 'East Malaysia'];

  const displayDate = viewMode === 'day' 
    ? `${day}/${month}/${year}` 
    : `${new Date(0, parseInt(month) - 1).toLocaleString('en', { month: 'long' }).toUpperCase()}, ${year}`;

  const selectedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  const sseTargetDate = viewMode === 'day' ? selectedDate : new Date();
  const sseWeekStart = startOfWeek(sseTargetDate, { weekStartsOn: 6 });
  const isViewingSseWeek = trendWeekStart.getTime() === sseWeekStart.getTime();
  const isViewingSseWeekRef = useRef(isViewingSseWeek);
  useEffect(() => {
    isViewingSseWeekRef.current = isViewingSseWeek;
  }, [isViewingSseWeek]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setDay(date.getDate().toString().padStart(2, '0'));
      setMonth((date.getMonth() + 1).toString().padStart(2, '0'));
      setYear(date.getFullYear().toString());
    }
  };

  useEffect(() => {
    setTrendWeekStart(startOfWeek(selectedDate, { weekStartsOn: 6 }));
  }, [day, month, year]);

  // â”€â”€ SSE Live Feed State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [clockInOut, setClockInOut] = useState<LiveEmp[]>([]);
  const [lateList, setLateList] = useState<LiveEmp[]>([]);
  const [absentList, setAbsentList] = useState<LiveEmp[]>([]);
  const [pendingApprovalsList, setPendingApprovalsList] = useState<PendingItem[]>([]);
  const [upcomingOutstationList, setUpcomingOutstationList] = useState<any[]>([]);
  const [activeOutstationList, setActiveOutstationList] = useState<any[]>([]);
  const [outstationSummary, setOutstationSummary] = useState<any>(null);
  const [liveMonthlyComp, setLiveMonthlyComp] = useState<any>(null);
  const [liveLeaveTrend, setLiveLeaveTrend] = useState<any>(null);
  const [liveWeeklyAttendanceTrend, setLiveWeeklyAttendanceTrend] = useState<any[] | null>(null);
  const [liveHrAlerts, setLiveHrAlerts] = useState<any[] | null>(null);
  const [missingPunchYesterdayLive, setMissingPunchYesterdayLive] = useState<number | null>(null);
  const [feedConnected, setFeedConnected] = useState(false);
  const [liveEmployees, setLiveEmployees] = useState<any[]>([]);
  const [tempAssignments, setTempAssignments] = useState<any[]>([]);

  const isAdminRole = ["hr_admin", "managing_director", "operation_manager", "finance_manager"].includes(role || "");

  // SSE connection for live feed
  useEffect(() => {
    if (!isAdminRole) return;
    const params = new URLSearchParams({
      role: role || "",
      branch: userBranch || "",
      department: userDepartment || "",
      month: month.toString(),
      year: year.toString()
    });
    if (viewMode === 'day') {
      params.append('date', `${year}-${month}-${day}`);
    }
    const es = new EventSource(`${API_BASE_URL}/api/workforce/live-feed?${params}`);
    es.onopen = () => setFeedConnected(true);
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'workforce_feed') {
          setClockInOut(d.clockInOut || []);
          setLateList(d.lateList || []);
          setAbsentList(d.absentList || []);
          setPendingApprovalsList(d.pendingApprovals || []);
          setUpcomingOutstationList(d.upcomingOutstationList || []);
          setActiveOutstationList(d.activeOutstationList || []);
          setOutstationSummary(d.outstationSummary || d.outstationAnalytics || null);
          setLiveMonthlyComp(d.monthlyComparison || null);
          setLiveLeaveTrend(d.leaveTrend || d.leaveAnalytics?.monthlyTrend || null);
          setLiveWeeklyAttendanceTrend(prev => isViewingSseWeekRef.current ? (d.weeklyAttendanceTrend || null) : prev);
          setLiveHrAlerts(d.hrAlerts || null);
          if (d.missingPunchYesterday !== undefined) setMissingPunchYesterdayLive(d.missingPunchYesterday);
          setFeedConnected(true);
        }
      } catch {}
    };
    es.onerror = () => setFeedConnected(false);
    return () => es.close();
  }, [role, userBranch, userDepartment, isAdminRole, month, year, day, viewMode]);

  // SSE connection for live stats (to get liveEmployees)
  useEffect(() => {
    if (!isAdminRole) return;
    const url = `${API_BASE_URL}/api/presence/live-stats?date=${year}-${month}-${day}&role=${encodeURIComponent(role || "")}&branch=${encodeURIComponent(userBranch || "")}&department=${encodeURIComponent(userDepartment || "")}`;
    const es = new EventSource(url);
    
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'presence_update') {
          setLiveEmployees(data.employees || []);
        }
      } catch (err) {}
    };
    return () => es.close();
  }, [role, userBranch, userDepartment, isAdminRole, month, year, day]);

  const getApprovalState = (userRole: string | undefined, itemStatus: string) => {
    const normRole = (userRole || '').toLowerCase();
    const st = itemStatus || '';

    // 1. Is this item waiting for userRole to approve?
    let canApprove = false;
    
    if (['head_of_department', 'branch_leader', 'hod'].includes(normRole)) {
      canApprove = st === 'Pending' || st.startsWith('Pending HOD') || st === 'Pending Branch Leader';
    } else if (['operation_manager', 'operation', 'finance_manager', 'finance'].includes(normRole)) {
      canApprove = st === 'Pending Operation' || st === 'Pending Operation Manager' || st === 'Pending Finance' || st === 'Pending Finance Manager';
    } else if (['managing_director', 'md'].includes(normRole)) {
      canApprove = st === 'Pending MD' || st === 'Pending Managing Director';
    }

    // HR & Employees NEVER get approve/decline buttons
    if (['hr_admin', 'hr', 'employee'].includes(normRole)) {
      canApprove = false;
    }

    // 2. Display Status Badge text & styling
    let displayStatus = st;
    let statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";

    if (canApprove) {
      displayStatus = "Pending Your Approval";
      statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
    } else if (st === 'Pending' || st.startsWith('Pending HOD') || st === 'Pending Branch Leader') {
      displayStatus = "Pending HOD / Branch Leader";
      statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
    } else if (st === 'Pending Operation' || st === 'Pending Operation Manager' || st === 'Pending Finance' || st === 'Pending Finance Manager') {
      displayStatus = "Pending Operation Manager";
      statusBadgeClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
    } else if (st === 'Pending MD' || st === 'Pending Managing Director') {
      displayStatus = "Pending Managing Director";
      statusBadgeClass = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20";
    } else if (st === 'Approved') {
      displayStatus = "Approved";
      statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
    } else if (st === 'Rejected') {
      displayStatus = "Rejected";
      statusBadgeClass = "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
    }

    return { canApprove, displayStatus, statusBadgeClass };
  };

  const handleApproveLeave = async (id: number) => {
    setPendingApprovalsList(prev => prev.filter(item => item.id !== id));
    try {
      await fetch(`${API_BASE_URL}/api/leave-requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Approve', status: 'Approved', approver_id: userId, role: role })
      });
    } catch (err) { console.error('Approve error:', err); }
  };

  const handleDeclineLeave = async (id: number) => {
    setPendingApprovalsList(prev => prev.filter(item => item.id !== id));
    try {
      await fetch(`${API_BASE_URL}/api/leave-requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Reject', status: 'Rejected', approver_id: userId, role: role })
      });
    } catch (err) { console.error('Decline error:', err); }
  };

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        role: role || "",
        branch: userBranch || "",
        department: userDepartment || "",
        month: month,
        year: year
      });
      if (viewMode === 'day') {
        params.append('date', `${year}-${month}-${day}`);
      }
      
      const [res, tempRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/reports/workforce-insights?${params}`),
        fetch(`${API_BASE_URL}/api/work-assignments-all?${params}`)
      ]);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || "Failed to fetch data");
      }

      if (tempRes.ok) {
        const tempJson = await tempRes.json();
        if (tempJson.success) {
          setTempAssignments(tempJson.assignments);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyTrendOnly = async (weekStart: Date) => {
    try {
      const params = new URLSearchParams({
        role: role || "",
        branch: userBranch || "",
        department: userDepartment || "",
        month: month,
        year: year,
        weekStartDate: format(weekStart, 'yyyy-MM-dd'),
        date: format(selectedDate, 'yyyy-MM-dd')
      });
      const res = await fetch(`${API_BASE_URL}/api/reports/workforce-insights?${params}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.attendanceOverview?.weeklyAttendanceTrend) {
          setLiveWeeklyAttendanceTrend(json.attendanceOverview.weeklyAttendanceTrend);
        }
      }
    } catch (err) {
      console.error("Error fetching weekly trend:", err);
    }
  };

  // When trendWeekStart changes (but not on initial mount where fetchInsights covers it), we fetch just the weekly trend
  useEffect(() => {
    if (data) {
      fetchWeeklyTrendOnly(trendWeekStart);
    }
  }, [trendWeekStart, role, userBranch, userDepartment]);

  useEffect(() => { fetchInsights(); }, [role, userBranch, userDepartment, month, year, day, viewMode]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">Error: {error}. The backend may still be deploying.</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-foreground">No data available</div>;

  const onTimeCount = Math.max(0, data.teamAvailability.present - data.teamAvailability.late);
  const donutData = [
    { name: 'On Time', value: onTimeCount },
    { name: 'Late', value: data.teamAvailability.late },
    { name: 'On Leave', value: data.teamAvailability.onLeave },
    { name: 'Absent', value: data.teamAvailability.absent },
    { name: 'Comp Leave', value: data.teamAvailability.companyLeave || 0 },
    { name: 'Outstation', value: data.topKpi?.outstationToday || 0 },
  ];

  const availableToday = data.teamAvailability.present;
  const totalTeam = availableToday + data.teamAvailability.onLeave + data.teamAvailability.absent + (data.teamAvailability.companyLeave || 0) + (data.topKpi?.outstationToday || 0);
  const availabilityRate = totalTeam > 0 ? Math.round((availableToday / totalTeam) * 100) : 0;

  // Simulated Leave Utilization Trend Data (Time Normalized in Hours)
  const leaveTrendData = [
    { month: 'Jan', Annual: 45, Sick: 20, Replacement: 0 },
    { month: 'Feb', Annual: 55, Sick: 35, Replacement: 8 },
    { month: 'Mar', Annual: 40, Sick: 15, Replacement: 0 },
    { month: 'Apr', Annual: 75, Sick: 50, Replacement: 16 },
    { month: 'May', Annual: 60, Sick: 25, Replacement: 8 },
    { month: 'Jun', Annual: ((data.leave?.annual || 0) + (data.leave?.emergency || 0)) * 8, Sick: (data.leave?.medical || 0) * 8, Replacement: (data.leave?.replacement || 0) * 8 }
  ];
  const currentMonthSick = leaveTrendData[5].Sick;
  const prevMonthSick = leaveTrendData[4].Sick;
  const sickLeaveSpike = currentMonthSick > 0 && currentMonthSick >= prevMonthSick * 1.5;

  const departmentChartData = (data.departmentMetrics || [])
    .filter((d: any) => d.name && d.name.toLowerCase() !== 'unassigned')
    .map((d: any) => ({
      ...d,
      name: d.name.toUpperCase()
    }));

  const CustomDeptTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-card border border border-slate-300 dark:border-slate-700 rounded-md shadow-lg p-2 flex flex-col gap-1 min-w-[100px]">
          <p className="text-[11px] font-bold text-slate-600 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-sm border-b border-slate-100 dark:border-slate-800">{label}</p>
          <div className="flex items-center gap-1.5 px-2 py-1">
            <div className="w-2 h-2 rounded-full bg-[#ff5b37]"></div>
            <p className="text-[11px] text-slate-700">Employee: <span className="font-bold">{payload[0].value}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomEmployeeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-card border border border-slate-300 dark:border-slate-700 rounded-md shadow-lg p-2 flex flex-col gap-1 min-w-[100px]">
          <p className="text-[11px] font-bold text-slate-600 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-sm border-b border-slate-100 dark:border-slate-800">{label}</p>
          <div className="flex items-center gap-1.5 px-2 py-1">
            <div className="w-2 h-2 rounded-full bg-[#942392]"></div>
            <p className="text-[11px] text-slate-700">Attendance: <span className="font-bold">{payload[0].value}%</span></p>
          </div>
        </div>
      );
    }
    return null;
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full">
        
        {/* Filter Toolbar Line directly under main header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
          {/* LEFT: DAY | MONTH View Toggle Bar */}
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl shadow-inner border border-slate-200 dark:border-slate-800 shrink-0 gap-1">
            <button 
              className={`flex items-center justify-center h-8 px-5 text-[11px] font-black tracking-widest rounded-lg transition-all duration-300 ${viewMode === 'day' ? 'bg-[#FFFE00] text-[#942392] shadow-md' : 'text-foreground hover:text-slate-700 hover:bg-slate-200/50'}`}
              onClick={() => setViewMode('day')}
            >
              DAY
            </button>
            <button 
              className={`flex items-center justify-center h-8 px-5 text-[11px] font-black tracking-widest rounded-lg transition-all duration-300 ${viewMode === 'month' ? 'bg-[#FFFE00] text-[#942392] shadow-md' : 'text-foreground hover:text-slate-700 hover:bg-slate-200/50'}`}
              onClick={() => setViewMode('month')}
            >
              MONTH
            </button>
          </div>

          {/* RIGHT: Active Filter Controls */}
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <div className="relative">
              {viewMode === "day" ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 gap-3 hover:border-[#942392]/40 min-w-[140px]">
                      <span>{displayDate}</span>
                      <CalendarIcon className="w-4 h-4 text-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-card z-50" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : viewMode === "month" ? (
                <MonthPicker
                  monthYear={`${year}-${month.padStart(2, '0')}`}
                  onSelectMonthYear={(val) => {
                    const [newYear, newMonth] = val.split('-');
                    setYear(newYear);
                    if (newMonth === 'all') {
                      setMonth('all');
                    } else {
                      setMonth(parseInt(newMonth).toString());
                    }
                  }}
                  className="appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 min-w-[140px]"
                />
              ) : (
                <YearPopover year={year} onSelectYear={setYear} />
              )}
            </div>
            <ExportDropdown 
              onExportCSV={() => exportToCSV(data.departmentMetrics || [], 'Workforce_Insights')} 
              onExportPDF={() => window.print()} 
            />
          </div>
        </div>

        {/* Redesigned Top Section: 5-column layout */}
        {viewMode === 'day' ? (
          <>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">
          
          {/* 8 KPI Cards (Replaces old Attendance Overview + 4 Grid) */}
          <div className={`col-span-1 ${['head_of_department', 'branch_leader'].includes(role) ? 'xl:col-span-4' : 'xl:col-span-3'} grid grid-cols-2 lg:grid-cols-5 gap-4`}>
            
                        {/* 1. Present Today */}
            <Card className={`lg:col-span-2 border border-emerald-100 bg-emerald-50/30 p-5 flex flex-col h-[200px] justify-between ${cardHoverEffects.emerald} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="w-10 h-10 rounded-full border border-emerald-200 bg-emerald-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-600" />
                  </div>
                  {feedConnected && <span className="text-emerald-600 text-[11px] font-bold flex items-center gap-1 bg-white px-2 py-0.5 rounded-full shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live</span>}
                </div>
                <p className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider mb-2 mt-2">Present Today</p>
                <div className="flex flex-col items-center justify-center mt-2">
                  <h3 className="text-5xl font-black text-slate-800 leading-none tracking-tight">{feedConnected && clockInOut.length > 0 ? clockInOut.length : data.teamAvailability.present}</h3>
                  <p className="text-[12px] font-semibold text-foreground mt-1">Employees</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between items-end mb-2 relative">
                  <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> 2 vs Yesterday</p>
                  <p className="text-[11px] font-bold text-emerald-700">{(feedConnected && clockInOut.length > 0 ? clockInOut.length : data.teamAvailability.present) === data.topKpi.activeEmployees ? "100%" : `${Math.round(((feedConnected && clockInOut.length > 0 ? clockInOut.length : data.teamAvailability.present) / (data.topKpi.activeEmployees || 1)) * 100)}%`} of Workforce</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-full bg-emerald-200/50 rounded-full h-2.5 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, ((feedConnected && clockInOut.length > 0 ? clockInOut.length : data.teamAvailability.present) / (data.topKpi.activeEmployees || 1)) * 100)}%` }}></div>
                  </div>
                  <div className="text-[12px] font-extrabold text-slate-800 whitespace-nowrap">
                     {feedConnected && clockInOut.length > 0 ? clockInOut.length : data.teamAvailability.present} <span className="text-foreground font-bold">/ {data.topKpi.activeEmployees}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* 2. Late Arrivals */}
            {(() => {
              let highestLateTime = "None";
              if (feedConnected && lateList.length > 0) {
                const maxTime = Math.max(...(Array.isArray(lateList) ? lateList : []).map(emp => emp.clock_in ? new Date(emp.clock_in).getTime() : 0));
                if (maxTime > 0) {
                   highestLateTime = new Date(maxTime).toLocaleTimeString('en-US', {
                       timeZone: 'Asia/Kuala_Lumpur',
                       hour: 'numeric',
                       minute: '2-digit',
                       hour12: true
                   });
                }
              }
              
              return (
            <Card className={`border border-slate-100 bg-white p-5 flex flex-col h-[200px] justify-between ${cardHoverEffects.orange} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
              <div>
                <div className="w-10 h-10 rounded-full border border-orange-100 bg-orange-50/50 flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-[11px] font-extrabold text-orange-600 uppercase tracking-wider mb-2">Late Arrival</p>
                <div className="flex flex-col items-start mt-1">
                  <h3 className="text-4xl font-black text-slate-800 leading-none">{feedConnected && lateList.length > 0 ? lateList.length : data.teamAvailability.late}</h3>
                  <p className="text-[12px] font-semibold text-foreground mt-1">Employees</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-bold text-foreground mb-3">Highest: <span className="text-orange-500">{highestLateTime}</span></p>
              </div>
            </Card>
            );})()}

            {/* 3. On Leave Today */}
            <Card className={`border border-slate-100 bg-white p-5 flex flex-col h-[200px] justify-between ${cardHoverEffects.purple} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
              <div>
                <div className="w-10 h-10 rounded-full border border-purple-100 bg-purple-50/50 flex items-center justify-center mb-3">
                  <CalendarDays className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-[11px] font-extrabold text-purple-600 uppercase tracking-wider mb-2">On Leave Today</p>
                <div className="flex flex-col items-start mt-1">
                  <h3 className="text-4xl font-black text-slate-800 leading-none">{data.topKpi.onLeaveToday}</h3>
                  <p className="text-[12px] font-semibold text-foreground mt-1">Employees</p>
                </div>
              </div>
                <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
                  <span className="bg-orange-50 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">AL {data.leave?.annual || 0}</span>
                  <span className="bg-purple-50 text-purple-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">MC {data.leave?.medical || 0}</span>
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">EL {data.leave?.emergency || 0}</span>
                </div>
            </Card>

            {/* 4. Absent Today */}
            <Card className={`border border-slate-100 bg-white p-5 flex flex-col h-[200px] justify-between ${cardHoverEffects.red} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
              <div>
                <div className="w-10 h-10 rounded-full border border-red-100 bg-red-50/50 flex items-center justify-center mb-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-[11px] font-extrabold text-red-500 uppercase tracking-wider mb-2">Absent Today</p>
                <div className="flex flex-col items-start mt-1">
                  <h3 className="text-4xl font-black text-slate-800 leading-none">{feedConnected && absentList.length > 0 ? absentList.filter(a => (a as any).status === 'absent').length : data.teamAvailability.absent}</h3>
                  <p className="text-[12px] font-semibold text-foreground mt-1">Employees</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-bold text-red-500 mb-3">Needs Attention</p>
              </div>
            </Card>

            {/* 5. Missing Punch */}
            <Card className={`border border-slate-100 bg-white p-5 flex flex-col h-[200px] justify-between ${cardHoverEffects.amber} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="w-10 h-10 rounded-full border border-amber-100 bg-amber-50/50 flex items-center justify-center mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  {feedConnected && <span className="text-amber-500 text-[11px] font-bold flex items-center gap-1 bg-white px-2 py-0.5 rounded-full shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />Live</span>}
                </div>
                <p className="text-[11px] font-extrabold text-amber-500 uppercase tracking-wider mb-2">Missing Punch</p>
                <div className="flex flex-col items-start mt-1">
                  <h3 className="text-4xl font-black text-slate-800 leading-none">
                    {feedConnected && missingPunchYesterdayLive !== null 
                      ? missingPunchYesterdayLive 
                      : (data.topKpi?.missingPunchYesterday || 0)}
                  </h3>
                  <p className="text-[12px] font-semibold text-foreground mt-1">Employees</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-bold text-amber-500 mb-3 flex items-center gap-1">Yesterday's Records</p>
                <div className="w-full bg-amber-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full w-[100%]"></div>
                </div>
              </div>
            </Card>

            {/* 6. Outstation */}
            <Card className={`border border-slate-100 bg-white p-5 flex flex-col h-[200px] justify-between ${cardHoverEffects.blue} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
              <div>
                <div className="w-10 h-10 rounded-full border border-blue-100 bg-blue-50/50 flex items-center justify-center mb-3">
                  <Plane className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-[11px] font-extrabold text-blue-500 uppercase tracking-wider mb-2">Outstation</p>
                <div className="flex flex-col items-start mt-1">
                  <h3 className="text-4xl font-black text-slate-800 leading-none">{activeOutstationList.length > 0 ? activeOutstationList.length : (data.topKpi.outstationToday || 0)}</h3>
                  <p className="text-[12px] font-semibold text-foreground mt-1">Employees</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-bold text-blue-500 mb-3">{(activeOutstationList.length > 0 || (data.topKpi.outstationToday || 0) > 0) ? "Away on duty" : "None Today"}</p>
                <div className="flex items-center border-t border-slate-100 pt-3">
                  <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden ml-auto shrink-0">
                    <div className="h-full bg-blue-300 rounded-full w-[30%]"></div>
                  </div>
                </div>
              </div>
            </Card>

            {/* 7. Attendance Rate */}
            <Card className={`border border-slate-100 bg-white p-5 flex flex-col h-[200px] justify-between ${cardHoverEffects.indigo} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
              <div>
                <div className="w-10 h-10 rounded-full border border-indigo-100 bg-indigo-50/50 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                </div>
                <p className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider mb-2">Attendance Rate</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-4xl font-black text-slate-800 leading-none">{data.topKpi.attendanceRate}%</h3>
                </div>
                <p className="text-[11px] font-bold text-foreground mt-1">Target 95%</p>
              </div>
              <div className="mt-1 flex flex-col items-start w-full relative">
                <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> 2% vs Yesterday</p>
              </div>
            </Card>

            {/* 8. Active Workforce */}
            <Card className={`lg:col-span-2 border border-slate-100 bg-white p-5 flex flex-col h-[200px] justify-between ${cardHoverEffects.emerald} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
              <div>
                <div className="w-10 h-10 rounded-full border border-emerald-100 bg-emerald-50/50 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider mb-2">Active Workforce</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-4xl font-black text-slate-800 leading-none">
                    {data.topKpi.activeEmployees} <span className="text-[18px] font-bold text-foreground">/ {data.topKpi.totalHeadcount}</span>
                  </h3>
                </div>
                <p className="text-[12px] font-semibold text-emerald-600 mt-1">Active</p>
              </div>
              <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
                <span className="text-[11px] font-bold text-emerald-600 whitespace-nowrap">{Math.round((data.topKpi.activeEmployees / (data.topKpi.totalHeadcount || 1)) * 100)}%</span>
                <div className="w-full bg-emerald-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (data.topKpi.activeEmployees / (data.topKpi.totalHeadcount || 1)) * 100)}%` }}></div>
                </div>
              </div>
            </Card>

          </div>

          {/* Column 3: Employees By Department or Employee Attendance */}
          {!['head_of_department', 'branch_leader'].includes(role) && (() => {
            const rawBranchMetrics = data.branchMetrics || [];
            const hqMetric = rawBranchMetrics.find((b: any) => b.name === 'HQ' || b.name === 'Rayhar HQ') || { count: 0 };
            const hqCount = hqMetric.count || 0;
            const branchCount = rawBranchMetrics.filter((b: any) => b.name !== 'HQ' && b.name !== 'Rayhar HQ').reduce((sum: number, b: any) => sum + (b.count || 0), 0);
            const totalEmployees = hqCount + branchCount;
            const hqPct = totalEmployees > 0 ? (hqCount / totalEmployees) * 100 : 0;
            const branchPct = totalEmployees > 0 ? (branchCount / totalEmployees) * 100 : 0;
            
            const allAttendance = data.performance?.allAttendance || [];
            const topPerformers = allAttendance.filter((a: any) => a.attendanceRate === 100);
            const topPerformerCount = topPerformers.length;

            return (
              <Card className={`col-span-1 xl:col-span-1 border border-slate-100 bg-white dark:bg-card p-5 flex flex-col justify-between \${cardHoverEffect} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">Employee Distribution</span>
                </div>
                
                <div className="flex flex-col flex-1 mt-2">
                  <div className="flex justify-between items-end mb-2">
                     <span className="text-[11px] font-semibold text-foreground">Total Employee</span>
                     <span className="text-3xl font-black text-slate-800 dark:text-slate-200">{totalEmployees > 0 ? totalEmployees : (data.topKpi?.totalHeadcount || 218)}</span>
                  </div>
                  
                  {/* 100% Stacked Bar for HQ and Branch */}
                  <div className="flex w-full h-5 rounded-full overflow-hidden mt-2 mb-4">
                    <div style={{ width: `${hqPct || 37.6}%` }} className="bg-[#f59e0b] h-full" />
                    <div style={{ width: `${branchPct || 62.4}%` }} className="bg-[#0f766e] h-full" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
                    <div className="flex flex-col border-r border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 mb-2">
                         <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                         <span className="text-[10px] font-bold text-foreground">HQ ({(hqPct || 37.6).toFixed(1)}%)</span>
                      </div>
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-200">{hqCount > 0 ? hqCount : 82}</span>
                    </div>
                    <div className="flex flex-col pl-2">
                      <div className="flex items-center gap-1.5 mb-2">
                         <div className="w-2 h-2 rounded-full bg-[#0f766e]" />
                         <span className="text-[10px] font-bold text-foreground">Branch ({(branchPct || 62.4).toFixed(1)}%)</span>
                      </div>
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-200">{branchCount > 0 ? branchCount : 136}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mb-6">
                    <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">Top Performer</span>
                    <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-xl p-4 mt-1 cursor-default hover:bg-orange-100/50 dark:hover:bg-orange-900/20 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
                             <Award className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[14px] font-bold text-slate-800 dark:text-slate-200">{topPerformerCount > 0 ? topPerformerCount : 27} Employees</span>
                             <span className="text-[11px] font-semibold text-foreground">Attendance Rate: <span className="text-emerald-500 font-bold">100%</span></span>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
                
                <button onClick={() => navigate('/branch-management')} className="w-full h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-[11px] font-bold text-slate-600 rounded-lg border border-slate-200 dark:border-slate-700">
                   View All Employees <ChevronRight className="w-3 h-3 ml-1" />
                </button>
              </Card>
            );
          })()}

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Left Column (2-span): Branch Distribution + HOD/BL Live Cards */}
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
            {(() => {
              const rawBranchMetrics = data?.branchMetrics || [];
              const filteredBranches = selectedRegion === 'All Regions' 
                ? rawBranchMetrics 
                : rawBranchMetrics.filter((b:any) => regionMap[b.name] === selectedRegion || (b.name==='HQ' && selectedRegion==='Central'));
              
              return (
                <Card className={`border border-slate-100 dark:border-slate-700 bg-white dark:bg-card flex flex-col h-fit ${cardHoverEffect} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
                <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-row justify-between items-center">
                  <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Branch Workforce Distribution</CardTitle>
                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger className="w-[120px] h-7 text-[10px] font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-card shadow-none focus:ring-0">
                      <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Regions" className="text-[10px] font-bold">All Regions</SelectItem>
                      {regionOrder.map(r => <SelectItem key={r} value={r} className="text-[10px] font-bold">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="p-5 flex flex-col">
                  <div className={`space-y-4 flex-1 pr-2 ${filteredBranches.length > 5 ? 'overflow-y-auto custom-scrollbar max-h-[220px] custom-scrollbar' : 'overflow-y-visible'}`}>
                    <TooltipProvider>
                      {(Array.isArray(filteredBranches) ? filteredBranches : []).map((branch: any, idx: number) => {
                        const branchEmployees = liveEmployees.filter(emp => emp.branch === branch.name);

                        let outstation: number, presentOnTime: number, presentLate: number, onLeave: number, companyLeave: number, absent: number;

                        if (['head_of_department', 'branch_leader'].includes(role)) {
                          // For HOD/BL: use the same server-side filtered data as the KPI cards
                          // to ensure Branch Distribution matches "Present Today" / "Absent Today" exactly
                          presentOnTime = Math.max(0, (data.teamAvailability?.present ?? 0) - (data.teamAvailability?.late ?? 0));
                          presentLate = data.teamAvailability?.late ?? 0;
                          onLeave = data.topKpi?.onLeaveToday ?? 0;
                          outstation = data.topKpi?.outstationToday ?? 0;
                          companyLeave = 0;
                          absent = data.teamAvailability?.absent ?? 0;
                        } else {
                          outstation = branchEmployees.filter(emp => emp.status === 'outstation').length;
                          presentOnTime = branchEmployees.filter(emp => emp.status === 'present').length;
                          presentLate = branchEmployees.filter(emp => emp.status === 'late').length;
                          onLeave = branchEmployees.filter(emp => emp.status === 'onLeave').length;
                          companyLeave = branchEmployees.filter(emp => emp.status === 'companyLeave').length;
                          absent = Math.max(0, branch.count - (presentOnTime + presentLate + outstation + onLeave + companyLeave));
                        }
                        
                        const expectedWorkingDays = branch.count - onLeave - companyLeave;
                        let realRate = 0;
                        if (expectedWorkingDays > 0) {
                          realRate = Math.round(((presentOnTime + presentLate + outstation) / expectedWorkingDays) * 100);
                        } else if (branch.count > 0 && expectedWorkingDays === 0) {
                          realRate = 100;
                        }

                        return { ...branch, realRate, presentOnTime, presentLate, outstation, onLeave, companyLeave, absent };
                      }).sort((a:any, b:any) => b.realRate - a.realRate).map((branch: any, idx: number) => {
                        return (
                          <div key={idx} className="flex flex-col gap-1">
                            <div className="flex justify-between items-end">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-[#1A1F36] dark:text-gray-200">{branch.name}</span>
                                <span className="text-[9px] text-foreground">{branch.count} Employees</span>
                              </div>
                              <span className={`text-[10px] font-black ${branch.realRate >= 95 ? 'text-emerald-500' : 'text-rose-500'}`}>{branch.realRate}%</span>
                            </div>
                            <UITooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 flex overflow-hidden cursor-pointer">
                                  {branch.count > 0 ? (
                                    <>
                                      <div className="h-full bg-[#10b981]" style={{ width: `${(branch.presentOnTime / branch.count) * 100}%` }}></div>
                                      <div className="h-full bg-[#f59e0b]" style={{ width: `${(branch.presentLate / branch.count) * 100}%` }}></div>
                                      <div className="h-full bg-pink-500" style={{ width: `${(branch.outstation / branch.count) * 100}%` }}></div>
                                      <div className="h-full bg-blue-500" style={{ width: `${(branch.onLeave / branch.count) * 100}%` }}></div>
                                      <div className="h-full bg-purple-500" style={{ width: `${(branch.companyLeave / branch.count) * 100}%` }}></div>
                                      <div className="h-full bg-red-500" style={{ width: `${(branch.absent / branch.count) * 100}%` }}></div>
                                    </>
                                  ) : (
                                    <div className="h-full w-full bg-slate-200"></div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="bg-white dark:bg-card border border border-slate-300 dark:border-slate-700 shadow-xl rounded p-3 z-50 w-max whitespace-nowrap text-left min-w-[150px]">
                                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">{branch.name}</p>
                                <div className="flex flex-col gap-1 text-[9px] text-slate-600 dark:text-slate-300">
                                  <p className="flex justify-between items-center gap-4"><span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div>Present (On Time):</span> <span className="font-bold text-emerald-600">{branch.presentOnTime}</span></p>
                                  <p className="flex justify-between items-center gap-4"><span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></div>Present (Late):</span> <span className="font-bold text-amber-500">{branch.presentLate}</span></p>
                                  <p className="flex justify-between items-center gap-4"><span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>Outstation:</span> <span className="font-bold text-pink-500">{branch.outstation}</span></p>
                                  <p className="flex justify-between items-center gap-4"><span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>On Leave:</span> <span className="font-bold text-blue-500">{branch.onLeave}</span></p>
                                  <p className="flex justify-between items-center gap-4"><span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>Company Leave:</span> <span className="font-bold text-purple-500">{branch.companyLeave}</span></p>
                                  <p className="flex justify-between items-center gap-4"><span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>Absent:</span> <span className="font-bold text-red-500">{branch.absent}</span></p>
                                </div>
                              </TooltipContent>
                            </UITooltip>
                          </div>
                        );
                      })}
                    </TooltipProvider>
                    {filteredBranches.length === 0 && (
                      <div className="text-center text-foreground text-xs py-10 font-medium">No branches found in this region.</div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span className="text-[10px] font-semibold text-foreground">Showing all {filteredBranches.length} locations</span>
                    </div>
                    <Link to="/branches" className="text-[11px] font-bold text-[#4f46e5] hover:text-[#4338ca] transition-colors flex items-center group/link">
                      View all
                      <ChevronRight className="w-3 h-3 ml-0.5 group-hover/link:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Temporary Branch Assignments Summary */}
          <Card className={`border border-slate-100 dark:border-slate-700 bg-white dark:bg-card flex flex-col h-fit ${cardHoverEffect} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Temporary Branch Assignment</CardTitle>
                <Link to="/branches/temporary-assignments" className="text-[11px] font-bold text-[#4f46e5] hover:text-[#4338ca] transition-colors flex items-center group/link">
                  View All Assignments
                  <ChevronRight className="w-3 h-3 ml-0.5 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col">
              {/* Summary Stats */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                {(() => {
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  
                  const active = tempAssignments.filter(a => {
                    const start = new Date(a.start_date); start.setHours(0,0,0,0);
                    const end = new Date(a.end_date); end.setHours(23,59,59,999);
                    return a.status === 'Active' && today >= start && today <= end;
                  }).length;
                  
                  const upcoming = tempAssignments.filter(a => {
                    const start = new Date(a.start_date); start.setHours(0,0,0,0);
                    return a.status === 'Active' && today < start;
                  }).length;
                  
                  const completed = tempAssignments.filter(a => {
                    return a.status === 'Completed' || (a.status === 'Active' && new Date(a.end_date).setHours(23,59,59,999) < today.getTime());
                  }).length;

                  return (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col p-4 rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] bg-white dark:bg-slate-900/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Active</span>
                        </div>
                        <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{active}</span>
                        <span className="text-[11px] text-foreground mt-1 font-medium">Currently Active</span>
                      </div>
                      <div className="flex flex-col p-4 rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] bg-white dark:bg-slate-900/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Completed</span>
                        </div>
                        <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{completed}</span>
                        <span className="text-[11px] text-foreground mt-1 font-medium">Past Assignments</span>
                      </div>
                      <div className="flex flex-col p-4 rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] bg-white dark:bg-slate-900/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Upcoming</span>
                        </div>
                        <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{upcoming}</span>
                        <span className="text-[11px] text-foreground mt-1 font-medium">Starts Soon</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Table */}
              <div className="p-5 flex-1">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Recent Temporary Assignments</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="pb-3 text-[11px] text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Employee</th>
                        <th className="pb-3 text-[11px] text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Original Branch</th>
                        <th className="pb-3 text-[11px] text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Assigned Branch</th>
                        <th className="pb-3 text-[11px] text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Duration</th>
                        <th className="pb-3 text-[11px] text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {(() => {
                        const activeAndUpcomingAssignments = tempAssignments.filter(a => {
                          const start = a.start_date ? new Date(a.start_date) : null;
                          const end = a.end_date ? new Date(a.end_date) : null;
                          const todayStr = new Date().toISOString().split('T')[0];
                          const isCompleted = a.status === 'Completed' || (a.status === 'Active' && end && end.toISOString().split('T')[0] < todayStr);
                          const isCancelled = a.status === 'Cancelled';
                          
                          return !isCompleted && !isCancelled;
                        });

                        return (
                          <>
                            {(Array.isArray(activeAndUpcomingAssignments) ? activeAndUpcomingAssignments : []).slice(0, 5).map((a, i) => {
                              const empName = a.name || a.full_name || a.employee_name || 'N/A';
                              const empRole = a.role ? a.role.replace(/_/g, ' ').toUpperCase() : '';
                              const primaryBranch = a.primary_branch || a.branch || '';
                              const empRoleBranch = empRole && primaryBranch ? `${empRole} • ${primaryBranch}` : (empRole || primaryBranch);

                              const origBranchCode = a.primary_branch || a.original_branch || a.branch || 'HQ';
                              const origBranchName = BRANCH_NAMES[origBranchCode] || origBranchCode;

                              const tempBranchCode = a.temp_branch || a.temporary_branch || a.location || a.assigned_branch || 'N/A';
                              const tempBranchName = BRANCH_NAMES[tempBranchCode] || tempBranchCode;

                              const start = a.start_date ? new Date(a.start_date) : null;
                              const end = a.end_date ? new Date(a.end_date) : null;

                              const startDateStr = start ? format(start, "MMM d, yyyy") : "";
                              const endDateStr = end ? format(end, "MMM d, yyyy") : "Ongoing";
                              const durationText = start ? `${startDateStr} - ${endDateStr}` : "—";

                              const todayStr = new Date().toISOString().split('T')[0];
                              const isUpcoming = a.status === 'Active' && start && start.toISOString().split('T')[0] > todayStr;

                              let sColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
                              let sDot = "bg-emerald-500";
                              let sLabel = "Active";

                              if (isUpcoming) {
                                sColor = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
                                sDot = "bg-amber-500";
                                sLabel = "Upcoming";
                              }

                              return (
                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="py-3 pr-4">
                                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{empName}</div>
                                    {empRoleBranch && <div className="text-[10px] text-foreground font-medium mt-0.5">{empRoleBranch}</div>}
                                  </td>
                                  <td className="py-3 pr-4 text-xs text-foreground font-medium">{origBranchName}</td>
                                  <td className="py-3 pr-4 text-xs font-semibold text-slate-800 dark:text-slate-200">{tempBranchName}</td>
                                  <td className="py-3 pr-4 text-xs text-foreground font-medium">{durationText}</td>
                                  <td className="py-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${sColor}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${sDot}`}></span>
                                      {sLabel}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            {activeAndUpcomingAssignments.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-xs text-foreground">
                                  No temporary assignments found.
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>


          </div>


          <Card className={`col-span-1 border border-slate-100 dark:border-slate-700 bg-white dark:bg-card flex flex-col ${cardHoverEffect} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Team Availability</CardTitle>
                  <CardDescription className="text-xs text-foreground mt-0.5">Real-time status for the current shift</CardDescription>
                </div>
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">Live</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col">
              
              {/* Chart Section */}
              <div className="w-full relative h-[130px] flex items-center justify-center mt-1 mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={65}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                    >
                      {(Array.isArray(donutData) ? donutData : []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>

                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center KPI Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-200 tracking-tight leading-none">{availabilityRate}%</span>
                  <span className="text-[9px] font-semibold text-foreground uppercase tracking-wider mt-0.5">Current Rate</span>
                </div>
              </div>

              {/* Text Summary */}
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-indigo-600 leading-tight">{availableToday} Available Today</h3>
                <p className="text-[11px] text-foreground mt-0.5">
                  {availableToday === totalTeam ? "All team members are accounted for." : `${totalTeam - availableToday} team members are not available.`}
                </p>
              </div>

              {/* 6-Shape Compact Legend */}
              <div className="grid grid-cols-2 gap-2 w-full mt-auto mb-4">
                {(Array.isArray(donutData) ? donutData : []).map((entry, index) => (
                  <div key={entry.name} className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border ${index === 0 ? 'bg-indigo-50/70 border-indigo-100' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'} transition-colors`}>
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-[10px] font-bold text-foreground uppercase tracking-wider truncate">{entry.name}</span>
                    </div>
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-none">{entry.value}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-auto">
                <Button className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white h-9">
                  <CalendarDays className="w-4 h-4 mr-2" /> Plan Shift
                </Button>
                <Button variant="outline" className="w-full bg-indigo-50/50 hover:bg-indigo-50 border-transparent text-[#4f46e5] font-medium h-9">
                  <Users className="w-4 h-4 mr-2" /> Manage Team
                </Button>
                <p 
                  className="text-[10px] font-bold text-[#942392] cursor-pointer hover:underline flex items-center gap-1 justify-end mt-1"
                  onClick={() => {
                    navigate('/hr-analytics/attendance');
                    setTimeout(() => {
                      const el = document.getElementById('admin-attendance');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                >
                  View All <ChevronRight className="w-3 h-3" />
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
{!['head_of_department', 'branch_leader'].includes(role) && (
          <Card className={`col-span-1 border border-slate-100 dark:border-slate-700 bg-white dark:bg-card ${cardHoverEffect} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Leave Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3">
                <div 
                  onClick={() => navigate("/leave/admin?tab=pending")}
                  className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-[#942392]/5 border border-transparent hover:border-[#942392]/20 rounded-lg transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-yellow-100/50 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#942392] transition-colors">Pending Requests</p>
                      <p className="text-xs text-foreground font-medium">Awaiting Approval</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-slate-700">{data.leaveMonitoring.pendingApproval}</span>
                    <ChevronRight className="w-5 h-5 text-foreground group-hover:text-[#942392] group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>

                <div 
                  onClick={() => navigate("/leave/admin?tab=approved")}
                  className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-[#942392]/5 border border-transparent hover:border-[#942392]/20 rounded-lg transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100/50 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                      <FileCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#942392] transition-colors">Approved Leave</p>
                      <p className="text-xs text-foreground font-medium">This Month</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-slate-700">{data.leaveMonitoring.approvedThisMonth}</span>
                    <ChevronRight className="w-5 h-5 text-foreground group-hover:text-[#942392] group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>

                <div 
                  onClick={() => navigate("/leave/admin?tab=approved")}
                  className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-[#942392]/5 border border-transparent hover:border-[#942392]/20 rounded-lg transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100/50 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#942392] transition-colors">Staff on Leave</p>
                      <p className="text-xs text-foreground font-medium">Out of Office (Today)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-slate-700">{data.leaveMonitoring.staffOnLeaveToday}</span>
                    <ChevronRight className="w-5 h-5 text-foreground group-hover:text-[#942392] group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
)}

          {/* 6. Employee Performance & Attendance Ranking */}
          <Card className={`col-span-1 ${['head_of_department', 'branch_leader'].includes(role) ? 'lg:col-span-3' : 'lg:col-span-2'} border border-slate-100 dark:border-slate-700 bg-white dark:bg-card ${cardHoverEffect} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Employee Performance & Attendance</CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Top Attendance Performers
                </h4>
                <div className="space-y-3">
                  {data?.performance?.topAttendance?.length > 0 ? (Array.isArray(data.performance.topAttendance) ? data.performance.topAttendance : []).map((emp: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:bg-slate-900/50 rounded-md transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{emp.name}</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">{emp.attendanceRate}%</span>
                    </div>
                  )) : (
                    <p className="text-sm text-foreground">No attendance records found.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" /> Highest Late Arrivals
                </h4>
                <div className="space-y-3">
                  {data?.performance?.topLate?.length > 0 ? (Array.isArray(data.performance.topLate) ? data.performance.topLate : []).map((emp: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:bg-slate-900/50 rounded-md transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-red-50 flex items-center justify-center text-xs font-bold text-red-600">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{emp.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-red-600">{emp.lateCount}</span>
                        <span className="text-xs text-foreground">lates</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-foreground">No late arrivals recorded.</p>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>

        </div>

                  {/* HOD & Branch Leader LIVE CARDS (Only show for these roles, under Branch Distribution) */}
            {['head_of_department', 'branch_leader'].includes(role) && (() => {
              // Filter live data to only show employees within HOD's dept or Branch Leader's branch
              const displayClockIns = [...clockInOut, ...lateList].sort((a, b) => (a.clock_in || '').localeCompare(b.clock_in || ''));

              const displayAbsent = absentList;

              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Clock-In/Out Card */}
                  <Card className={`border border-slate-100 dark:border-slate-700 bg-white dark:bg-card flex flex-col p-4 ${cardHoverEffect} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Clock-In/Out</h3>
                        {feedConnected
                          ? <span className="flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE</span>
                          : <span className="text-[8px] text-foreground font-bold uppercase">Connecting…</span>}
                        {scopeLabel && <span className="text-[9px] font-bold text-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[100px]">{scopeLabel}</span>}
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded text-foreground flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" /> {displayDate}
                      </span>
                    </div>

                    <div className="flex-1 space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-0.5">
                      {displayClockIns.length === 0 && !feedConnected && (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                          <Loader2 className="w-5 h-5 animate-spin mb-2" />
                          <p className="text-[10px] font-medium">Loading live data…</p>
                        </div>
                      )}
                      {displayClockIns.length === 0 && feedConnected && (
                        <div className="flex flex-col items-center justify-center py-8 text-foreground">
                          <Clock className="w-6 h-6 opacity-40 mb-1" />
                          <p className="text-[10px] font-semibold">No clock-ins yet today</p>
                        </div>
                      )}
                      {(Array.isArray(displayClockIns) ? displayClockIns : []).map((emp) => (
                        <div key={emp.user_id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-lg transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${getAvatarColor(emp.full_name)}`}>
                              {emp.initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2">{emp.full_name.toUpperCase()}</p>
                                {emp.is_late && (
                                  <span className="px-1 py-0.5 text-[8px] font-bold rounded bg-orange-100 text-orange-600 border border-orange-200">Late</span>
                                )}
                              </div>
                              <p className="text-[10px] text-foreground font-medium">{emp.department && emp.department !== '—' ? emp.department : emp.branch}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Clock className="w-3.5 h-3.5 text-foreground" />
                            <span
                              style={emp.is_late ? { backgroundColor: '#ffbf00' } : undefined}
                              className={`whitespace-nowrap px-2 py-0.5 text-[10px] font-bold rounded text-white ${!emp.is_late ? 'bg-emerald-500' : ''}`}
                            >
                              {emp.clock_in}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => navigate('/hr-analytics/attendance')}
                      className="w-full mt-4 h-9 bg-white dark:bg-card hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 dark:border-slate-700"
                    >
                      View All Attendance
                    </Button>
                  </Card>

                  {/* Absent / Leave / Outstation Card */}
                  <Card className={`border border-slate-100 dark:border-slate-700 bg-white dark:bg-card flex flex-col p-4 ${cardHoverEffect} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Absent / Leave / Outstation</h3>
                        {feedConnected
                          ? <span className="flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE</span>
                          : <span className="text-[8px] text-foreground font-bold uppercase">Connecting…</span>}
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded text-foreground flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" /> {displayDate}
                      </span>
                    </div>

                    <div className="flex-1 space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-0.5">
                      {displayAbsent.length === 0 && !feedConnected && (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                          <Loader2 className="w-5 h-5 animate-spin mb-2" />
                          <p className="text-[10px] font-medium">Loading live data…</p>
                        </div>
                      )}
                      {displayAbsent.length === 0 && feedConnected && (
                        <div className="flex flex-col items-center justify-center py-8 text-foreground">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 opacity-60 mb-1" />
                          <p className="text-[10px] font-semibold">No absentees today!</p>
                        </div>
                      )}
                      {(Array.isArray(displayAbsent) ? displayAbsent : []).map((emp) => (
                        <div key={emp.user_id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-lg transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${getAvatarColor(emp.full_name)}`}>
                              {emp.initials}
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2">{emp.full_name.toUpperCase()}</p>
                              <p className="text-[10px] text-foreground font-medium">{emp.department && emp.department !== '—' ? emp.department : emp.branch}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {(emp as any).status === 'companyLeave' ? (
                              <>
                                <CalendarDays className="w-3.5 h-3.5 text-purple-400" />
                                <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-purple-600 text-white text-center leading-tight">Company<br />Leave</span>
                              </>
                            ) : (emp as any).status === 'outstation' ? (
                              <>
                                <Plane className="w-3.5 h-3.5 text-pink-400" />
                                <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-pink-500 text-white">Outstation</span>
                              </>
                            ) : (emp as any).status === 'leave' || (emp as any).status === 'onLeave' ? (
                              <>
                                <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                                <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-blue-500 text-white">Leave</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-red-400" />
                                <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-red-500 text-white">Absent</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => navigate('/hr-analytics/attendance')}
                      className="w-full mt-4 h-9 bg-white dark:bg-card hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 dark:border-slate-700"
                    >
                      View All Attendance
                    </Button>
                  </Card>
                            {/* 3. Leave Monitoring */}
          <Card className={`col-span-1 border border-slate-100 dark:border-slate-700 bg-white dark:bg-card ${cardHoverEffect} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Leave Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3">
                <div 
                  onClick={() => navigate("/leave/admin?tab=pending")}
                  className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-[#942392]/5 border border-transparent hover:border-[#942392]/20 rounded-lg transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-yellow-100/50 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#942392] transition-colors">Pending Requests</p>
                      <p className="text-xs text-foreground font-medium">Awaiting Approval</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-slate-700">{data.leaveMonitoring.pendingApproval}</span>
                    <ChevronRight className="w-5 h-5 text-foreground group-hover:text-[#942392] group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>

                <div 
                  onClick={() => navigate("/leave/admin?tab=approved")}
                  className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-[#942392]/5 border border-transparent hover:border-[#942392]/20 rounded-lg transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100/50 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                      <FileCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#942392] transition-colors">Approved Leave</p>
                      <p className="text-xs text-foreground font-medium">This Month</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-slate-700">{data.leaveMonitoring.approvedThisMonth}</span>
                    <ChevronRight className="w-5 h-5 text-foreground group-hover:text-[#942392] group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>

                <div 
                  onClick={() => navigate("/leave/admin?tab=approved")}
                  className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-[#942392]/5 border border-transparent hover:border-[#942392]/20 rounded-lg transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100/50 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#942392] transition-colors">Staff on Leave</p>
                      <p className="text-xs text-foreground font-medium">Out of Office (Today)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-slate-700">{data.leaveMonitoring.staffOnLeaveToday}</span>
                    <ChevronRight className="w-5 h-5 text-foreground group-hover:text-[#942392] group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
                  </div>
                );
              })()}

        {/* BOTTOM SECTION: LIVE CARDS */}
        {isAdminRole && (
          <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">

          {/* Card 1: Clock-In/Out â€” LIVE SSE */}
          <Card className={`border border-slate-100 dark:border-slate-700 bg-white dark:bg-card flex flex-col p-4 ${cardHoverEffect} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Clock-In/Out</h3>
                {feedConnected
                  ? <span className="flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white dark:bg-card animate-pulse" />LIVE</span>
                  : <span className="text-[8px] text-foreground font-bold uppercase">Connectingâ€¦</span>}
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-slate-900/50 border border border-slate-300 dark:border-slate-700 rounded text-foreground flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> {displayDate}
              </span>
            </div>

            {/* allClockIns = on-time + late merged, sorted by clock_in */}
            {(() => {
              const allClockIns = [...clockInOut, ...lateList].sort((a, b) =>
                (a.clock_in || '').localeCompare(b.clock_in || '')
              );
              
              
              const displayClockIns = allClockIns;
              return (
                <div className="flex-1 space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-0.5">
                  {displayClockIns.length === 0 && !feedConnected && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                      <Loader2 className="w-5 h-5 animate-spin mb-2" />
                      <p className="text-[10px] font-medium">Loading live dataâ€¦</p>
                    </div>
                  )}
                  {displayClockIns.length === 0 && feedConnected && (
                    <div className="flex flex-col items-center justify-center py-8 text-foreground">
                      <Clock className="w-6 h-6 opacity-40 mb-1" />
                      <p className="text-[10px] font-semibold">No clock-ins yet today</p>
                    </div>
                  )}
                  {(Array.isArray(displayClockIns) ? displayClockIns : []).map((emp) => (
                    <div key={emp.user_id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:bg-slate-900/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${getAvatarColor(emp.full_name)}`}>
                          {emp.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2">{emp.full_name.toUpperCase()}</p>
                            {emp.is_late && (
                              <span className="px-1 py-0.5 text-[8px] font-bold rounded bg-orange-100 text-orange-600 border border-orange-200">Late</span>
                            )}
                          </div>
                          <p className="text-[10px] text-foreground font-medium">{emp.department && emp.department !== '—' && emp.department !== '-' ? emp.department : emp.branch}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Clock className="w-3.5 h-3.5 text-foreground" />
                        <span 
                          style={emp.is_late ? { backgroundColor: '#ffbf00' } : undefined}
                          className={`whitespace-nowrap px-2 py-0.5 text-[10px] font-bold rounded text-white ${!emp.is_late ? 'bg-emerald-500' : ''}`}
                        >
                          {emp.clock_in}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <Button
              variant="outline"
              onClick={() => navigate('/hr-analytics/attendance#admin-attendance')}
              className="w-full mt-4 h-9 bg-white dark:bg-card hover:bg-slate-50 dark:bg-slate-900/50 text-slate-700 font-semibold border border-slate-300 dark:border-slate-700"
            >
              View All Attendance
            </Button>
          </Card>

          {/* Card 2: Late â€” LIVE SSE */}
          <Card className={`border border-slate-100 dark:border-slate-700 bg-white dark:bg-card flex flex-col p-4 ${cardHoverEffect} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Late</h3>
                {feedConnected
                  ? <span className="flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white dark:bg-card animate-pulse" />LIVE</span>
                  : <span className="text-[8px] text-foreground font-bold uppercase">Connectingâ€¦</span>}
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-slate-900/50 border border border-slate-300 dark:border-slate-700 rounded text-foreground flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> {displayDate}
              </span>
            </div>

            <div className="flex-1 space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-0.5">
              {lateList.length === 0 && !feedConnected && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                  <Loader2 className="w-5 h-5 animate-spin mb-2" />
                  <p className="text-[10px] font-medium">Loading live dataâ€¦</p>
                </div>
              )}
              {lateList.length === 0 && feedConnected && (
                <div className="flex flex-col items-center justify-center py-8 text-foreground">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 opacity-60 mb-1" />
                  <p className="text-[10px] font-semibold">No late arrivals today!</p>
                </div>
              )}
              {(Array.isArray(lateList) ? lateList : []).map((emp) => (
                <div key={emp.user_id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:bg-slate-900/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${getAvatarColor(emp.full_name)}`}>
                      {emp.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2">{emp.full_name.toUpperCase()}</p>
                        <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-red-500 text-white">
                          {Math.floor(emp.late_minutes / 60)} H {(emp.late_minutes % 60).toString().padStart(2, '0')} Min
                        </span>
                      </div>
                      <p className="text-[10px] text-foreground font-medium">{emp.department !== 'â€”' ? emp.department : emp.branch}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-foreground" />
                    <span 
                      style={{ backgroundColor: '#ffbf00' }}
                      className="whitespace-nowrap px-2 py-0.5 text-[10px] font-bold rounded text-white"
                    >
                      {emp.clock_in}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => navigate('/hr-analytics/attendance#admin-attendance')}
              className="w-full mt-4 h-9 bg-white dark:bg-card hover:bg-slate-50 dark:bg-slate-900/50 text-slate-700 font-semibold border border-slate-300 dark:border-slate-700"
            >
              View All Attendance
            </Button>
          </Card>

          {/* Card 3: Absent â€” LIVE SSE */}
          <Card className={`border border-slate-100 dark:border-slate-700 bg-white dark:bg-card flex flex-col p-4 ${cardHoverEffect} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Absent / Leave / Outstation</h3>
                {feedConnected
                  ? <span className="flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white dark:bg-card animate-pulse" />LIVE</span>
                  : <span className="text-[8px] text-foreground font-bold uppercase">Connectingâ€¦</span>}
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-slate-900/50 border border border-slate-300 dark:border-slate-700 rounded text-foreground flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> {displayDate}
              </span>
            </div>

            <div className="flex-1 space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-0.5">
              {absentList.length === 0 && !feedConnected && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                  <Loader2 className="w-5 h-5 animate-spin mb-2" />
                  <p className="text-[10px] font-medium">Loading live dataâ€¦</p>
                </div>
              )}
              {absentList.length === 0 && feedConnected && (
                <div className="flex flex-col items-center justify-center py-8 text-foreground">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 opacity-60 mb-1" />
                  <p className="text-[10px] font-semibold">No absentees today!</p>
                </div>
              )}
              {(Array.isArray(absentList) ? absentList : []).map((emp) => (
                <div key={emp.user_id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:bg-slate-900/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${getAvatarColor(emp.full_name)}`}>
                      {emp.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2">{emp.full_name.toUpperCase()}</p>
                      </div>
                      <p className="text-[10px] text-foreground font-medium">{emp.department !== 'â€”' ? emp.department : emp.branch}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(emp as any).status === 'companyLeave' ? (
                      <>
                        <CalendarDays className="w-3.5 h-3.5 text-purple-400" />
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-purple-600 text-white text-center leading-tight">Company<br />Leave</span>
                      </>
                    ) : (emp as any).status === 'outstation' ? (
                      <>
                        <Plane className="w-3.5 h-3.5 text-pink-400" />
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-pink-500 text-white text-center leading-tight">Outstation</span>
                      </>
                    ) : (emp as any).status === 'leave' || (emp as any).status === 'onLeave' ? (
                      <>
                        <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-blue-500 text-white text-center leading-tight">Leave</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-red-500 text-white text-center leading-tight">Absent</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => navigate('/hr-analytics/attendance#employee-absenteeism')}
              className="w-full mt-4 h-9 bg-white dark:bg-card hover:bg-slate-50 dark:bg-slate-900/50 text-slate-700 font-semibold border border-slate-300 dark:border-slate-700"
            >
              View All Attendance
            </Button>
          </Card>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

            <div className="flex flex-col gap-6">
              {/* Card: Active Outstation */}
              <Card className={`border border-slate-100 dark:border-slate-700 bg-white dark:bg-card flex flex-col p-4 ${cardHoverEffect} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Active Outstation</h3>
                    {feedConnected
                      ? <span className="flex items-center gap-1 bg-pink-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white dark:bg-card animate-pulse" />LIVE</span>
                      : <span className="text-[8px] text-foreground font-bold uppercase">Connecting…</span>}
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-slate-900/50 border border-slate-150 rounded text-slate-505 flex items-center gap-1 cursor-pointer hover:underline" onClick={() => navigate("/outstation")}>
                    <CalendarDays className="w-3 h-3" /> {displayDate}
                  </span>
                </div>
                
                <div className="flex-1 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-0.5">
                  {activeOutstationList.length === 0 && !feedConnected && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                      <Loader2 className="w-5 h-5 animate-spin mb-2" />
                      <p className="text-[10px] font-medium">Loading live data…</p>
                    </div>
                  )}
                  {activeOutstationList.length === 0 && feedConnected && (
                    <div className="flex flex-col items-center justify-center py-8 text-foreground">
                      <Plane className="w-6 h-6 opacity-40 mb-1" />
                      <p className="text-[10px] font-semibold">No active outstations today.</p>
                    </div>
                  )}
                  {(Array.isArray(activeOutstationList) ? activeOutstationList : []).map((item, idx) => {
                    const borderColors = ['border-purple-500', 'border-indigo-500', 'border-blue-500', 'border-sky-500'];
                    const borderColor = borderColors[idx % borderColors.length];
                    const displayEmps = item.employees.slice(0, 3);
                    const extraCount = Math.max(0, item.employees.length - 3);
                    
                    const formatDate = (ds: string) => {
                      if (!ds) return "";
                      const d = new Date(ds);
                      return d.toLocaleDateString("en-MY", { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
                    };
                    let dateDisplay = "";
                    if (item.startDate) {
                      const sd = formatDate(item.startDate);
                      const ed = item.endDate ? formatDate(item.endDate) : sd;
                      dateDisplay = sd === ed ? sd : `${sd} - ${ed}`;
                    }

                    const days = Math.max(1, Math.ceil((new Date(item.endDate || item.startDate).getTime() - new Date(item.startDate).getTime()) / (1000 * 3600 * 24)));

                    return (
                      <div key={item.id} onClick={() => navigate("/outstation")} className={`border-l-4 ${borderColor} pl-3 py-1 space-y-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-r-lg transition-colors`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                            <div className="mt-1 space-y-0.5">
                              {dateDisplay && (
                                <p className="text-[10px] text-foreground font-medium flex items-center gap-1">
                                  <CalendarDays className="w-3 h-3 text-foreground shrink-0" /> {dateDisplay}
                                </p>
                              )}
                              <p className="text-[10px] text-foreground font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-foreground shrink-0" /> {days} Day{days === 1 ? '' : 's'} Total
                              </p>
                              {item.destination && item.title !== item.destination && (
                                <p className="text-[10px] text-foreground font-medium flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-foreground shrink-0" /> {item.destination}
                                </p>
                              )}
                              {item.title === item.destination && (
                                <p className="text-[10px] text-foreground font-medium flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-foreground shrink-0" /> {item.destination}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="flex -space-x-1.5 mt-0.5">
                              {(Array.isArray(displayEmps) ? displayEmps : []).map((e: any, eIdx: number) => (
                                <div key={eIdx} title={e.name} className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[8px] uppercase shadow-sm border-2 border-white dark:border-card ${getAvatarColor(e.name)}`}>
                                  {e.initials}
                                </div>
                              ))}
                              {extraCount > 0 && (
                                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-[8px] shadow-sm border-2 border-white dark:border-card">
                                  +{extraCount}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

          {/* Card 4: Pending Approvals â€” LIVE SSE */}
          <Card className={`border border-slate-100 dark:border-slate-700 bg-white dark:bg-card flex flex-col p-4 ${cardHoverEffect} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Pending Approvals</h3>
                {pendingApprovalsList.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[8px] font-black bg-amber-500 text-white rounded">{pendingApprovalsList.length}</span>
                )}
              </div>
              <Button
                onClick={() => navigate("/leave/admin?tab=pending")}
                variant="outline"
                className="h-7 px-2.5 text-[10px] font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-card text-slate-600 rounded"
              >
                View All
              </Button>
            </div>

            <div className="flex-1 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-0.5">
              {pendingApprovalsList.length === 0 && !feedConnected && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                  <Loader2 className="w-5 h-5 animate-spin mb-2" />
                  <p className="text-[10px] font-medium">Loadingâ€¦</p>
                </div>
              )}
              {pendingApprovalsList.length === 0 && feedConnected ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-60 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wider">All caught up!</p>
                  <p className="text-[10px] mt-0.5">No pending approvals remaining.</p>
                </div>
              ) : (
                (Array.isArray(pendingApprovalsList) ? pendingApprovalsList : []).map((item) => {
                  const { canApprove, displayStatus, statusBadgeClass } = getApprovalState(role, item.status);
                  return (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:bg-slate-900/50 transition-all gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0 mt-0.5 ${getAvatarColor(item.name)}`}>
                          {item.initials}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{item.name}</p>
                          <p className="text-[10px] text-foreground font-medium mt-1 flex items-center gap-1.5">
                            <CalendarDays className="w-3 h-3 text-foreground" /> {item.dates} <span className="text-slate-300">|</span> <span className="text-[#ff5b37] font-semibold">{item.days}</span>
                          </p>
                          <p className="text-[10px] text-foreground font-medium mt-0.5">
                            Reason: {
                                (() => {
                                  if (!item.reason) return "-";
                                  const match = item.reason.match(/\[CUTI_GANTI_DATA:([\s\S]*?)\]/);
                                  if (match && match[1]) {
                                    try {
                                      const data = JSON.parse(match[1]);
                                      if (Array.isArray(data) && data.length > 0) {
                                        let text = item.reason.replace(match[0], "").trim();
                                        const details = data.map(d => d.keterangan || "-").filter(Boolean).join(", ");
                                        return "Replacement Leave (" + details + ")" + (text ? " - " + text : "");
                                      }
                                    } catch (e) {}
                                  }
                                  return item.reason;
                                })()
                              }
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex sm:flex-col gap-1.5 self-end sm:self-center shrink-0 items-end sm:items-center">
                        {canApprove ? (
                          <>
                            <button
                              onClick={() => handleApproveLeave(item.id)}
                              className="px-3 py-1 text-[10px] font-bold rounded bg-[#ff5b37] hover:bg-[#e04f2e] text-white transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDeclineLeave(item.id)}
                              className="px-3 py-1 text-[10px] font-bold rounded border border-[#ff5b37] text-[#ff5b37] hover:bg-[#ff5b37]/5 transition-colors"
                            >
                              Decline
                            </button>
                          </>
                        ) : (
                          <span className={`px-2.5 py-1.5 rounded-md text-[10px] font-black tracking-wider uppercase text-center border ${statusBadgeClass}`}>
                            {displayStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
          </div>

          {/* Card 4: Upcoming Outstation */}
          <Card className={`border border-slate-100 dark:border-slate-700 bg-white dark:bg-card flex flex-col p-4 ${cardHoverEffect} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Upcoming Outstation</h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-slate-900/50 border border-slate-150 rounded text-slate-505 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> {displayDate}
              </span>
            </div>
            
            <div className="flex-1 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-0.5">
              {upcomingOutstationList.length === 0 && !feedConnected && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                  <Loader2 className="w-5 h-5 animate-spin mb-2" />
                  <p className="text-[10px] font-medium">Loading live data…</p>
                </div>
              )}
              {upcomingOutstationList.length === 0 && feedConnected && (
                <div className="flex flex-col items-center justify-center py-8 text-foreground">
                  <Plane className="w-6 h-6 opacity-40 mb-1" />
                  <p className="text-[10px] font-semibold">No upcoming outstations today!</p>
                </div>
              )}
              {(Array.isArray(upcomingOutstationList) ? upcomingOutstationList : []).map((item, idx) => {
                const borderColors = ['border-orange-500', 'border-cyan-500', 'border-pink-500', 'border-emerald-500'];
                const borderColor = borderColors[idx % borderColors.length];
                const displayEmps = item.employees.slice(0, 3);
                const extraCount = item.employees.length - 3;
                
                const formatDate = (ds: string) => {
                  if (!ds) return "";
                  const d = new Date(ds);
                  return d.toLocaleDateString("en-MY", { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
                };
                let dateDisplay = "";
                if (item.startDate) {
                  const sd = formatDate(item.startDate);
                  const ed = item.endDate ? formatDate(item.endDate) : sd;
                  dateDisplay = sd === ed ? sd : `${sd} - ${ed}`;
                }

                return (
                  <div key={item.id} className={`border-l-4 ${borderColor} pl-3 py-1 space-y-2`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                        <div className="mt-1 space-y-0.5">
                          {dateDisplay && (
                            <p className="text-[10px] text-foreground font-medium flex items-center gap-1">
                              <CalendarDays className="w-3 h-3 text-foreground shrink-0" /> {dateDisplay}
                            </p>
                          )}
                          <p className="text-[10px] text-foreground font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-foreground shrink-0" /> {item.time}
                          </p>
                          {item.destination && item.title !== item.destination && (
                            <p className="text-[10px] text-foreground font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-foreground shrink-0" /> {item.destination}
                            </p>
                          )}
                          {item.title === item.destination && (
                            <p className="text-[10px] text-foreground font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-foreground shrink-0" /> {item.destination}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex -space-x-1.5">
                        {(Array.isArray(displayEmps) ? displayEmps : []).map((e: any, i: number) => (
                          <div key={i} title={e.name} className={`w-5 h-5 rounded-full border border-white text-[8px] font-bold flex items-center justify-center shadow-sm ${getAvatarColor(e.name)}`}>
                            {e.initials}
                          </div>
                        ))}
                        {extraCount > 0 && (
                          <div className="w-5 h-5 rounded-full bg-indigo-500 border border-white text-[8px] font-bold text-white flex items-center justify-center shadow-sm">
                            +{extraCount}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
            
            <button onClick={() => navigate('/outstation/assignment')} className="text-xs font-semibold text-[#942392] hover:text-[#5c0073] text-center mt-4 flex items-center justify-center gap-1 w-full pt-2 border-t border-slate-100 dark:border-slate-800">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Card>

          </div>
          </>
        )}
        </>
        ) : (
          <MonthViewDashboard data={data} clockInOut={clockInOut} absentList={absentList} tempAssignments={tempAssignments} outstationSummary={outstationSummary} feedConnected={feedConnected} liveMonthlyComp={liveMonthlyComp} liveHrAlerts={liveHrAlerts} liveLeaveTrend={liveLeaveTrend} month={month} year={year} day={day} liveWeeklyAttendanceTrend={liveWeeklyAttendanceTrend} trendWeekStart={trendWeekStart} setTrendWeekStart={setTrendWeekStart} onEmployeeClick={(id: string) => setSelectedStaffId(id)} />
        )}
  
      <StaffProfileDialog 
        employeeId={selectedStaffId} 
        isOpen={!!selectedStaffId} 
        onClose={() => setSelectedStaffId(null)} 
      />
    </div>
  );
}
function MonthViewDashboard({ data, clockInOut, lateList, absentList, tempAssignments, pendingApprovalsList, feedConnected, outstationSummary, liveMonthlyComp, liveHrAlerts, liveLeaveTrend, month, year, day, liveWeeklyAttendanceTrend, trendWeekStart, setTrendWeekStart, onEmployeeClick }: any) {
    const [selectedRegion, setSelectedRegion] = useState<string>('All Regions');
  const navigate = useNavigate();
  const topKpi = data.topKpi || {};
  const monthlyComp = data.monthlyComparison || { attendance: {}, lateArrivals: {}, absences: {}, leaveRequests: {}, outstation: {} };
  
  let hrAlerts = data.hrAlerts ? [...data.hrAlerts] : [];
  if (feedConnected && pendingApprovalsList) {
    hrAlerts = hrAlerts.filter((a:any) => !a.title.toLowerCase().includes('leave request'));
    if (pendingApprovalsList.length > 0) {
      hrAlerts.unshift({
        title: `${pendingApprovalsList.length} Leave Request${pendingApprovalsList.length > 1 ? 's' : ''}`,
        description: 'Awaiting Approval (LIVE)',
        type: 'info'
      });
    }
  }
  const outstation = data.outstationAnalytics || { popularRoutes: [] };
  const leave = data.leaveAnalytics || {};
  const movement = data.workforceMovement || {};
  
  const rawBranchMetrics = data.branchMetrics || [];
  const regionMap: Record<string, string> = {
    'AOR': 'Northern', 'Alor Setar': 'Northern', 'BTM': 'Northern', 'Bertam': 'Northern', 'IPH': 'Northern', 'Ipoh': 'Northern', 'KKS': 'Northern', 'Kuala Kangsar': 'Northern', 'MJG': 'Northern', 'Manjung': 'Northern',
    'HQ': 'Central', 'Rayhar HQ': 'Central', 'BBB': 'Central', 'Bandar Baru Bangi': 'Central', 'SHA': 'Central', 'Shah Alam': 'Central', 'KUL': 'Central', 'Kuala Lumpur': 'Central',
    'BPT': 'Southern', 'Batu Pahat': 'Southern', 'JHB': 'Southern', 'Johor Bahru': 'Southern', 'MLK': 'Southern', 'Melaka': 'Southern', 'SNS': 'Southern', 'Seremban': 'Southern',
    'KMM': 'East Coast', 'Kemaman': 'East Coast', 'CNH': 'East Coast', 'Cheneh': 'East Coast', 'DGN': 'East Coast', 'Dungun': 'East Coast', 'JTH': 'East Coast', 'Jertih': 'East Coast', 'KBG': 'East Coast', 'Kuala Berang': 'East Coast', 'TGG': 'East Coast', 'Kuala Terengganu': 'East Coast', 'KBR': 'East Coast', 'Kota Bharu': 'East Coast', 'MZM': 'East Coast', 'Muadzam Shah': 'East Coast', 'RMP': 'East Coast', 'Rompin': 'East Coast',
    'TWU': 'East Malaysia', 'Tawau': 'East Malaysia', 'RRR': 'East Coast'
  };
  const regionOrder = ['Central', 'Northern', 'Southern', 'East Coast', 'East Malaysia'];
  
  const FULL_BRANCH_NAMES: Record<string, string> = {
    "RMP": "RMP - Rompin", "CNH": "CNH - Cheneh", "KMM": "KMM - Kemaman", "IPH": "IPH - Ipoh",
    "TGG": "TGG - Kuala Terengganu", "AOR": "AOR - Alor Setar", "DGN": "DGN - Dungun",
    "KBR": "KBR - Kota Bharu", "JTH": "JTH - Jertih", "KBG": "KBG - Kuala Berang",
    "MZM": "MZM - Muadzam Shah", "TWU": "TWU - Tawau", "BTM": "BTM - Bertam",
    "KKS": "KKS - Kuala Kangsar", "MJG": "MJG - Manjung", "MLK": "MLK - Melaka",
    "SNS": "SNS - Seremban", "JHB": "JHB - Johor Bahru", "BPT": "BPT - Batu Pahat",
    "BBB": "BBB - Bandar Baru Bangi", "SHA": "SHA - Shah Alam", "KUL": "KUL - Kuala Lumpur",
    "HQ": "HQ"
  };

  

  const liveBranchRanking = useMemo(() => {
    const listSource = (Array.isArray(rawBranchMetrics) ? rawBranchMetrics : []).map((b:any) => ({ branch: b.name, totalEmployees: b.count || 0 }));
    
    const activeTempOnDate = (Array.isArray(tempAssignments) ? tempAssignments : []).filter((a: any) => {
      if (a.status !== 'Active') return false;
      const sd = new Date(a.start_date);
      const ed = new Date(a.end_date);
      const selDateObj = new Date(year, month - 1, day);
      sd.setHours(0,0,0,0);
      ed.setHours(0,0,0,0);
      selDateObj.setHours(0,0,0,0);
      return selDateObj >= sd && selDateObj <= ed;
    }).map((a: any) => ({
      ...a,
      location: a.location ? a.location.split('-')[0].trim() : a.location
    }));

    activeTempOnDate.forEach((a: any) => {
       if (a.location && !listSource.find((b:any) => b.branch === a.location)) {
           listSource.push({ branch: a.location, totalEmployees: 0 });
       }
    });

    return listSource
      .map((b:any) => {
        const permanentStaffCount = b.totalEmployees || 0;
        
        const temporaryOut = activeTempOnDate.filter((a: any) => {
            const pb = a.primary_branch === 'HQ' ? 'HQ' : (a.primary_branch || '');
            return pb === b.branch && a.location !== b.branch;
        }).length;
        
        const temporaryIn = activeTempOnDate.filter((a: any) => {
            const pb = a.primary_branch === 'HQ' ? 'HQ' : (a.primary_branch || '');
            return pb !== b.branch && a.location === b.branch;
        }).length;
        
        const expectedWorkforce = Math.max(0, permanentStaffCount - temporaryOut) + temporaryIn;

        const activePermanent = (Array.isArray(clockInOut) ? clockInOut : []).filter((emp:any) => emp.branch === b.branch && (!emp.temp_branch || emp.temp_branch === b.branch));
        const activeTemporary = (Array.isArray(clockInOut) ? clockInOut : []).filter((emp:any) => emp.branch !== b.branch && emp.temp_branch === b.branch);
        
        const presentOnTime = activePermanent.filter((emp:any) => emp.status === 'Present (On Time)' || emp.status === 'Present').length;
        const presentLate = activePermanent.filter((emp:any) => emp.status === 'Present (Late)').length;
        const onLeave = activePermanent.filter((emp:any) => emp.status === 'On Leave' || emp.status === 'Approved Leave').length;
        const companyLeave = activePermanent.filter((emp:any) => emp.status === 'Company Leave').length;
        const outstation = activePermanent.filter((emp:any) => emp.status === 'Outstation').length;
        
        const tempPresent = activeTemporary.filter((emp:any) => emp.status === 'Present (On Time)' || emp.status === 'Present').length;
        const tempLate = activeTemporary.filter((emp:any) => emp.status === 'Present (Late)').length;
        const tempOnLeave = activeTemporary.filter((emp:any) => emp.status === 'On Leave' || emp.status === 'Approved Leave').length;
        const tempCompanyLeave = activeTemporary.filter((emp:any) => emp.status === 'Company Leave').length;
        const tempOutstation = activeTemporary.filter((emp:any) => emp.status === 'Outstation').length;

        const isWeekend = activePermanent.length > 0
          ? activePermanent.every((r:any) => r.status === "Weekend")
          : (function() {
              const dateObj = new Date(year || new Date().getFullYear(), (month || new Date().getMonth() + 1) - 1, day || new Date().getDate());
              const dayOfWeek = dateObj.getDay();
              const isFirstWeek = (day || new Date().getDate()) <= 7;
              const zone = (['AOR', 'KBR', 'TGG', 'DGN', 'KMM', 'CNH', 'KBG', 'JTH', 'RMP', 'MZM', 'TWU', 'BTM', 'KKS', 'MLK', 'SNS', 'JB', 'BTP'].includes(b.branch) ? 'ZONE_A' : 'ZONE_B');
              if (zone === "ZONE_A") {
                return dayOfWeek === 5 || (dayOfWeek === 6 && isFirstWeek);
              } else {
                return dayOfWeek === 0 || (dayOfWeek === 6 && isFirstWeek);
              }
            })();

        const totalRecorded = presentOnTime + presentLate + onLeave + companyLeave + outstation + tempPresent + tempLate + tempOnLeave + tempCompanyLeave + tempOutstation;
        const absent = isWeekend ? 0 : Math.max(0, expectedWorkforce - totalRecorded);
        
        let rate = 0;
        const expectedExcludingLeave = isWeekend ? 0 : (expectedWorkforce - onLeave - companyLeave - tempOnLeave - tempCompanyLeave);
        if (isWeekend) {
          rate = 100;
        } else if (expectedExcludingLeave > 0) {
          rate = Math.round(((presentOnTime + presentLate + outstation + tempPresent + tempLate + tempOutstation) / expectedExcludingLeave) * 100);
        }

        return {
          branch: b.branch,
          rate,
          region: regionMap[b.branch] || "Unknown",
          totalEmployees: expectedWorkforce,
          permanentStaffCount,
          temporaryOut,
          temporaryIn,
          presentOnTime,
          presentLate,
          absent,
          onLeave,
          companyLeave,
          outstation,
          tempPresent,
          tempLate,
          tempOnLeave,
          tempCompanyLeave,
          tempOutstation,
          isWeekend
        };
      })
      .filter((b:any) => selectedRegion === "All Regions" || b.region === selectedRegion || (b.branch === 'HQ' && selectedRegion === 'Central'))
      .filter((b:any) => b.permanentStaffCount > 0 || b.temporaryIn > 0 || b.temporaryOut > 0)
      .sort((a:any, b:any) => b.rate - a.rate)
      .map((d:any) => ({
         ...d,
         displayRate: d.isWeekend ? 100 : d.rate
      }));
  }, [rawBranchMetrics, clockInOut, tempAssignments, selectedRegion, year, month, day]);

  const departmentMetrics = (Array.isArray(data.departmentMetrics) ? data.departmentMetrics : []).map((d: any) => ({ ...d, name: (d.name || '').toUpperCase() }));
  const topDepartments = [...departmentMetrics].sort((a:any,b:any)=>b.value-a.value).slice(0, 5);

  const attendanceTrend = data.attendanceOverview?.monthlyTrend || [];

  const leaveUtil = topKpi.leaveUtilization || Math.round(((leave.annual || 0) + (leave.medical || 0) + (leave.emergency || 0)) / 2) || 68;
  
  const leaveData = [
    { name: 'Annual/Emergency Leave', value: (leave.annual || 0) + (leave.emergency || 0), color: '#3b82f6' },
    { name: 'Replacement Leave', value: leave.replacement || 0, color: '#eab308' },
    { name: 'Sick Leave', value: leave.medical || 0, color: '#10b981' }
  ];
  
  // exact total count
  const totalLeaveCount = leaveData.reduce((sum, item) => sum + item.value, 0);

  // Generate an empty-data placeholder for months ending at selected month (no random data)
  const monthsArr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const targetMonthNum = parseInt(month) || new Date().getMonth() + 1; 
  const targetMonthIdx = targetMonthNum - 1;

  const emptyTrend = [];
  const mockAnnual = [12, 15, 10, 18, 22, 16];
  const mockSick = [4, 6, 3, 5, 8, 4];
  const mockReplacement = [2, 1, 3, 2, 4, 1];
  for (let i = 5; i >= 0; i--) {
    const mIdx = ((targetMonthIdx - i) + 12) % 12;
    emptyTrend.push({ 
      month: monthsArr[mIdx], 
      Annual: 0, Sick: 0, Replacement: 0 
    });
  }

  // Leave Utilization Trend Data — SSE real data only, no random fallback
  const leaveTrendData = liveLeaveTrend || data.leaveTrend || data.leaveAnalytics?.monthlyTrend || emptyTrend;

  const currentMonthSick = leaveTrendData.length > 0 ? (leaveTrendData[leaveTrendData.length - 1].Sick ?? leaveTrendData[leaveTrendData.length - 1].sick ?? 0) : 0;
  const prevMonthSick = leaveTrendData.length > 1 ? (leaveTrendData[leaveTrendData.length - 2].Sick ?? leaveTrendData[leaveTrendData.length - 2].sick ?? 0) : 0;
  const sickLeaveSpike = currentMonthSick > 0 && currentMonthSick >= prevMonthSick * 1.5;

  const baseTrendData = liveWeeklyAttendanceTrend || data?.attendanceOverview?.weeklyAttendanceTrend || [];
  const activeEmp = topKpi?.activeEmployees || data?.topKpi?.activeEmployees || 82;
  const trendDataWithWeekend = (Array.isArray(baseTrendData) ? baseTrendData : []).map((day: any) => {
    const totalTracked = (day.present || 0) + (day.late || 0) + (day.absent || 0) + (day.leave || 0);
    return {
      ...day,
      weekend: day.weekend !== undefined ? day.weekend : Math.max(0, activeEmp - totalTracked)
    };
  });

  return (
    <div className="space-y-8">
       {/* PRIMARY SECTION */}
       <div>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* 1. Attendance Rate */}
            <Card className="p-4 flex items-center border border-indigo-200 dark:border-indigo-900/50 cursor-default bg-indigo-50 dark:bg-indigo-900/10   relative rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
               {feedConnected && <span className="absolute top-3 right-3 flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white dark:bg-card animate-pulse" />LIVE</span>}
               <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mr-4">
                 <CheckCircle2 className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-foreground font-bold uppercase tracking-widest mb-0.5">Attendance Rate</p>
                 <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{((liveMonthlyComp || monthlyComp).attendance?.current) || topKpi.attendanceRate || 0}%</h3>
                 <p className="text-[10px] text-foreground font-medium">Monthly Average</p>
               </div>
            </Card>

            {/* 2. Total Present */}
            <Card className="p-4 flex items-center border border-emerald-200 dark:border-emerald-900/50 cursor-default bg-emerald-50 dark:bg-emerald-900/10   relative rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
               <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mr-4">
                 <UserCheck className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-foreground font-bold uppercase tracking-widest mb-0.5">Total Present</p>
                 <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{(feedConnected && clockInOut?.length > 0 ? clockInOut.length : data?.teamAvailability?.present) || 0}</h3>
                 <p className="text-[10px] text-foreground font-medium">Employees</p>
               </div>
            </Card>

            {/* 3. Total Absenteeism */}
            <Card className="p-4 flex items-center border border-red-200 dark:border-red-900/50 cursor-default bg-red-50 dark:bg-red-900/10   relative rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
               <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mr-4">
                 <XCircle className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-foreground font-bold uppercase tracking-widest mb-0.5">Total Absenteeism</p>
                 <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{((liveMonthlyComp || monthlyComp).absences?.current) || data?.performance?.totalAbsenteeism || 0}</h3>
                 <p className="text-[10px] text-foreground font-medium">Absent Days</p>
               </div>
            </Card>

            {/* 4. Late Attendance */}
            <Card className="p-4 flex items-center border border-amber-200 dark:border-amber-900/50 cursor-default bg-amber-50 dark:bg-amber-900/10   relative rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
               <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mr-4">
                 <Clock className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-foreground font-bold uppercase tracking-widest mb-0.5">Late Attendance</p>
                 <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{((liveMonthlyComp || monthlyComp).lateArrivals?.current) || data?.performance?.lateAttendance || 0}</h3>
                 <p className="text-[10px] text-foreground font-medium">Late Records</p>
               </div>
            </Card>

            {/* 5. Avg Working Hrs */}
            <Card className="p-4 flex items-center border border-cyan-200 dark:border-cyan-900/50 cursor-default bg-cyan-50 dark:bg-cyan-900/10   relative rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
               <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mr-4">
                 <TrendingUp className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-foreground font-bold uppercase tracking-widest mb-0.5">Avg Working Hrs</p>
                 <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{data?.performance?.avgWorkingHours || "0"} Hrs</h3>
                 <p className="text-[10px] text-foreground font-medium">Monthly Average</p>
               </div>
            </Card>

            {/* 6. Leave Utilization */}
            <Card className="p-4 flex items-center border border-purple-200 dark:border-purple-900/50 cursor-default bg-purple-50 dark:bg-purple-900/10   relative rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
               <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mr-4">
                 <CalendarDays className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-foreground font-bold uppercase tracking-widest mb-0.5">Leave Utilization</p>
                 <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{leaveUtil || 0}%</h3>
                 <p className="text-[10px] text-foreground font-medium">Leave Used</p>
               </div>
            </Card>

            {/* 7. Perfect Attend. */}
            <Card className="p-4 flex items-center border border-yellow-200 dark:border-yellow-900/50 cursor-default bg-yellow-50 dark:bg-yellow-900/10   relative rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
               <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 flex items-center justify-center mr-4">
                 <Award className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-foreground font-bold uppercase tracking-widest mb-0.5">Perfect Attend.</p>
                 <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{data?.performance?.perfectAttendance || 0}</h3>
                 <p className="text-[10px] text-foreground font-medium">Employees</p>
               </div>
            </Card>

            {/* 8. Attendance Risk */}
            <Card className="p-4 flex items-center border border-rose-200 dark:border-rose-900/50 cursor-default bg-rose-50 dark:bg-rose-900/10   relative rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
               <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mr-4">
                 <AlertTriangle className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-foreground font-bold uppercase tracking-widest mb-0.5">Attendance Risk</p>
                 <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{data?.performance?.attendanceRisk || 0}</h3>
                 <p className="text-[10px] text-foreground font-medium">Need Attention</p>
               </div>
            </Card>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start">
           <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="p-5 border border-slate-100 dark:border-slate-700 hover:border-[#942392] hover: transition-all duration-300 flex flex-col relative overflow-hidden rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Attendance Trend</CardTitle>
                
                {/* Weekly Navigator */}
                <div className="flex items-center gap-1 sm:gap-2 self-end sm:self-auto">
                  {trendWeekStart.getTime() !== startOfWeek(new Date(), { weekStartsOn: 6 }).getTime() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTrendWeekStart(startOfWeek(new Date(), { weekStartsOn: 6 }))}
                        className="h-8 text-xs font-black px-4 mr-2 bg-[#FFD700] text-[#942392] border-2 border-[#942392] hover:bg-[#FFE55C] shadow-md"
                      >
                        This Week
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setTrendWeekStart(subDays(trendWeekStart, 7))}>
                    <ChevronLeft className="w-4 h-4 text-foreground" />
                  </Button>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 rounded-full shadow-sm">
                    <span className="text-xs sm:text-sm font-black text-[#942392] whitespace-nowrap">
                      {format(trendWeekStart, "dd MMM yyyy")} - {format(endOfWeek(trendWeekStart, { weekStartsOn: 6 }), "dd MMM yyyy")}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setTrendWeekStart(addDays(trendWeekStart, 7))}>
                    <ChevronRight className="w-4 h-4 text-foreground" />
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-6 pl-2">
                <div className="flex gap-6 items-baseline">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{(liveWeeklyAttendanceTrend || data?.attendanceOverview?.weeklyAttendanceTrend)?.reduce((sum: number, item: any) => sum + item.present, 0) || 0}</span>
                    <span className="text-xs font-bold text-foreground">On Time</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{(liveWeeklyAttendanceTrend || data?.attendanceOverview?.weeklyAttendanceTrend)?.reduce((sum: number, item: any) => sum + item.late, 0) || 0}</span>
                    <span className="text-xs font-bold text-foreground">Late</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{(liveWeeklyAttendanceTrend || data?.attendanceOverview?.weeklyAttendanceTrend)?.reduce((sum: number, item: any) => sum + item.absent, 0) || 0}</span>
                    <span className="text-xs font-bold text-foreground">Absent</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{(liveWeeklyAttendanceTrend || data?.attendanceOverview?.weeklyAttendanceTrend)?.reduce((sum: number, item: any) => sum + (item.leave || 0), 0) || 0}</span>
                    <span className="text-xs font-bold text-foreground">Leave</span>
                  </div>
                </div>
                  <div className="flex gap-4">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#2D9B2B]"></div><span className="text-xs font-bold text-slate-600">Present (On Time)</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#FFD700]"></div><span className="text-xs font-bold text-slate-600">Present (Late)</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#E12C2C]"></div><span className="text-xs font-bold text-slate-600">Absent</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div><span className="text-xs font-bold text-slate-600">Leave</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#9ca3af]"></div><span className="text-xs font-bold text-slate-600">Weekend</span></div>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 h-[280px] min-h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendDataWithWeekend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={4} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                          cursor={{ fill: 'transparent' }} 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} 
                          labelFormatter={(label) => {
                            const daysMap: Record<string, number> = {
                              'Sat': 0, 'Sun': 1, 'Mon': 2, 'Tue': 3, 'Wed': 4, 'Thu': 5, 'Fri': 6
                            };
                            const dayOffset = daysMap[label as string] ?? 0;
                            const date = addDays(trendWeekStart, dayOffset);
                            return `${String(label).toUpperCase()}, ${format(date, 'dd MMM yyyy')}`;
                          }}
                        />
                      
                      <Bar dataKey="present" name="Present (On Time)" stackId="a" fill="#2D9B2B" />
                      <Bar dataKey="late" name="Present (Late)" stackId="a" fill="#FFD700" />
                      <Bar dataKey="absent" name="Absent" stackId="a" fill="#E12C2C" />
                      <Bar dataKey="leave" name="Leave" stackId="a" fill="#3B82F6" />
                      <Bar dataKey="weekend" name="Weekend" stackId="a" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Metric Boxes */}
                <div className="flex flex-col justify-between w-full lg:w-[200px] gap-3">
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/50 h-full">
                    <p className="text-xs text-foreground font-bold mb-1">Max Working Hours</p>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">8.4 hrs</h3>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/50 h-full">
                    <p className="text-xs text-foreground font-bold mb-1">Missed Punches</p>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{data?.performance?.missingPunchEmployees?.reduce((sum: number, emp: any) => sum + emp.missingPunches, 0) || 0}</h3>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/50 h-full">
                    <p className="text-xs text-foreground font-bold mb-1">Weekly Avg</p>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{topKpi.attendanceRate || 0}%</h3>
                  </div>
                </div>
              </div>
            </Card>
           
           <Card className="p-5 border border-slate-100 dark:border-slate-700 bg-white dark:bg-card flex flex-col hover:border-[#942392] hover: transition-all duration-300 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
              <div className="flex items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Leave Utilization Trend vs. Previous Month</CardTitle>
              </div>
              <div className="h-[250px] w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={leaveTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} label={{ value: 'Leave Days', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748b', fontSize: 12, fontWeight: 'bold' } }} />
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }} itemStyle={{ fontSize: '11px', fontWeight: 'bold' }} labelStyle={{ fontWeight: 'black', color: '#1e293b', marginBottom: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} iconType="circle" />
                    <Line type="linear" dataKey="Annual" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    <Line type="linear" dataKey="Sick" stroke="#eab308" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    <Line type="linear" dataKey="Replacement" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
           </div>
           
           
           <div className="lg:col-span-1 flex flex-col gap-6">
             <Card className="p-5 border border-slate-100 dark:border-slate-700 hover:border-[#942392] hover: transition-all duration-300 flex flex-col rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
             <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
               <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Monthly Comparison</CardTitle>
             </div>
             <div className="overflow-x-auto flex-1">
               <table className="w-full text-sm text-left">
                 <thead className="text-xs text-foreground bg-slate-50/50 uppercase">
                   <tr className="border-b border-slate-200 dark:border-slate-700">
                     <th className="px-4 py-3 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Metric</th>
                     <th className="px-4 py-3 text-right border-l border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">This Month {feedConnected && <span className="ml-1 text-[8px] bg-red-500 text-white px-1 rounded animate-pulse">LIVE</span>}</th>
                     <th className="px-4 py-3 text-right text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Last Month</th>
                     <th className="px-4 py-3 text-right text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Change</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {[
                     { label: 'Attendance Rate', cur: `${(liveMonthlyComp || monthlyComp).attendance?.current || 0}%`, prev: `${(liveMonthlyComp || monthlyComp).attendance?.previous || 0}%`, diff: ((liveMonthlyComp || monthlyComp).attendance?.current || 0) - ((liveMonthlyComp || monthlyComp).attendance?.previous || 0) },
                     { label: 'Late Arrivals', cur: (liveMonthlyComp || monthlyComp).lateArrivals?.current || 0, prev: (liveMonthlyComp || monthlyComp).lateArrivals?.previous || 0, diff: ((liveMonthlyComp || monthlyComp).lateArrivals?.current || 0) - ((liveMonthlyComp || monthlyComp).lateArrivals?.previous || 0), invert: true },
                     { label: 'Absences', cur: (liveMonthlyComp || monthlyComp).absences?.current || 0, prev: (liveMonthlyComp || monthlyComp).absences?.previous || 0, diff: ((liveMonthlyComp || monthlyComp).absences?.current || 0) - ((liveMonthlyComp || monthlyComp).absences?.previous || 0), invert: true },
                     { label: 'Leave Requests', cur: (liveMonthlyComp || monthlyComp).leaveRequests?.current || 0, prev: (liveMonthlyComp || monthlyComp).leaveRequests?.previous || 0, diff: ((liveMonthlyComp || monthlyComp).leaveRequests?.current || 0) - ((liveMonthlyComp || monthlyComp).leaveRequests?.previous || 0), invert: true },
                     { 
                       label: 'Outstation Trip', 
                       cur: outstationSummary ? ((outstationSummary.completed || 0) + (outstationSummary.upcoming || 0)) : ((liveMonthlyComp || monthlyComp).outstation?.current || 0), 
                       prev: 0, 
                       diff: outstationSummary ? ((outstationSummary.completed || 0) + (outstationSummary.upcoming || 0)) : (((liveMonthlyComp || monthlyComp).outstation?.current || 0) - ((liveMonthlyComp || monthlyComp).outstation?.previous || 0)) 
                     },

                   ].map((row, idx) => {
                     let isPositive = row.diff > 0;
                     if (row.invert) isPositive = row.diff < 0;
                     const isNeutral = row.diff === 0;
                     const diffFormatted = Math.abs(row.diff).toFixed(row.label.includes('Rate') ? 1 : 0);
                     return (
                       <tr key={idx} className="hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                         <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.label}</td>
                         <td className="px-4 py-3 text-slate-600 font-semibold text-right border-l border-slate-200 dark:border-slate-700">{row.cur}</td>
                         <td className="px-4 py-3 text-foreground text-right">{row.prev}</td>
                         <td className="px-4 py-3 text-right">
                           {isNeutral ? <span className="text-foreground font-bold inline-block">-</span> : 
                            <span className={`inline-flex items-center gap-1 font-bold text-[11px] ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                              {row.diff > 0 ? '↑' : '↓'} {diffFormatted}{row.label.includes('Rate') ? '%' : ''}
                            </span>}
                         </td>
                       </tr>
                     )
                   })}
                 </tbody>
               </table>
             </div>
             <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
               <button className="text-xs font-bold text-foreground hover:text-[#942392] transition-colors flex items-center gap-1">Open Report <ChevronRight className="w-3 h-3" /></button>
             </div>
             </Card>
             
             {/* Missing Punch KPI Card */}
             {data?.performance?.missingPunchEmployees && (
               <MissingPunchCard 
                 employees={data.performance.missingPunchEmployees} 
                 indicator={data.performance.missingPunchIndicator || "Same as last month"} 
               />
             )}
           </div>
         </div>
       </div>

       {/* SECONDARY SECTION */}
       <div>
         
         {/* Row 1: 2 Columns */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
           {/* Department Workforce Distribution */}
           <Card className="lg:col-span-5 p-4 border border-slate-100 dark:border-slate-700 hover:border-[#942392] hover: transition-all duration-300 flex flex-col rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
             <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
               <div className="flex items-center gap-2">
                 <Building2 className="w-4 h-4 text-foreground" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">Department Workforce Distribution</h3>
               </div>
               <div className="text-[10px] font-bold border border border-slate-300 dark:border-slate-700 rounded px-2 py-1 flex items-center gap-1 text-foreground cursor-pointer hover:bg-slate-50 dark:bg-slate-900/50">
                 This Month <ChevronDown className="w-3 h-3" />
               </div>
             </div>
             
             <div className={`space-y-4 flex-1 pr-2 ${topDepartments.length > 5 ? 'overflow-y-auto custom-scrollbar max-h-[220px] custom-scrollbar' : 'overflow-y-visible'}`}>
               {topDepartments.sort((a:any, b:any) => b.attendanceRate - a.attendanceRate).map((dept: any, idx: number) => {
                 return (
                   <div key={idx} className="flex flex-col gap-1">
                     <div className="flex justify-between items-end">
                       <div className="flex flex-col">
                         <span className="text-[11px] font-bold text-[#1A1F36] dark:text-gray-200">{dept.name}</span>
                         <span className="text-[9px] text-foreground">{dept.count} Employees</span>
                       </div>
                       <span className={`text-[10px] font-black ${dept.attendanceRate >= 95 ? 'text-emerald-500' : 'text-amber-500'}`}>{dept.attendanceRate}%</span>
                     </div>
                     <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                       <div className="h-full bg-[#FF5722] rounded-full" style={{ width: `${dept.attendanceRate}%` }}></div>
                     </div>
                   </div>
                 );
               })}
             </div>
             
             <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
               <p className="text-[10px] font-semibold text-foreground flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722]"></span>
                 HQ operations represent {(departmentMetrics.reduce((sum:number,d:any)=>sum+d.value,0)/topKpi.totalHeadcount*100 || 0).toFixed(0)}% of workforce
               </p>
               <button className="text-xs font-bold text-foreground hover:text-[#942392] transition-colors flex items-center gap-1">View All <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>

           {/* Branch Workforce Distribution */}
           <Card className="lg:col-span-7 p-4 border border-slate-100 dark:border-slate-700 hover:border-[#942392] hover: transition-all duration-300 flex flex-col bg-white dark:bg-card rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
             <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
               <div className="flex items-center gap-2">
                 <MapPin className="w-4 h-4 text-foreground" />
                 <h3 className="text-sm font-bold text-[#1A1F36] dark:text-gray-100">Branch Workforce Distribution</h3>
               </div>
               <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                 <SelectTrigger className="w-[120px] h-7 text-[10px] font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-card shadow-none focus:ring-0">
                   <SelectValue placeholder="All Regions" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="All Regions" className="text-[10px] font-bold">All Regions</SelectItem>
                   {regionOrder.map(r => <SelectItem key={r} value={r} className="text-[10px] font-bold">{r}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
             
             <div className={`space-y-4 flex-1 pr-2 ${liveBranchRanking.length > 5 ? 'overflow-y-auto custom-scrollbar max-h-[220px]' : 'overflow-y-visible'}`}>
               <TooltipProvider>
                {liveBranchRanking.map((branch: any, idx: number) => {
                    const greenPerc = branch.isWeekend ? 0 : (branch.totalEmployees > 0 ? ((branch.presentOnTime) / branch.totalEmployees) * 100 : 0);
                    const yellowPerc = branch.isWeekend ? 0 : (branch.totalEmployees > 0 ? ((branch.presentLate + branch.tempLate) / branch.totalEmployees) * 100 : 0);
                    const bluePerc = branch.isWeekend ? 0 : (branch.totalEmployees > 0 ? ((branch.onLeave + branch.tempOnLeave + branch.companyLeave + branch.tempCompanyLeave) / branch.totalEmployees) * 100 : 0);
                    const redPerc = branch.isWeekend ? 0 : (branch.totalEmployees > 0 ? (branch.absent / branch.totalEmployees) * 100 : 0);
                    const brownPerc = branch.isWeekend ? 0 : (branch.totalEmployees > 0 ? (branch.tempPresent / branch.totalEmployees) * 100 : 0);

                    return (
                      <div key={idx} className="flex flex-col gap-1">
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-[#1A1F36] dark:text-gray-200">
                              {FULL_BRANCH_NAMES[branch.branch] || branch.branch}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-semibold text-foreground flex items-center gap-1">
                                👥 {branch.permanentStaffCount} Staff
                              </span>
                              {branch.temporaryIn > 0 && (
                                <span className="text-[9px] font-bold text-[#8b4513] bg-orange-100/70 dark:bg-amber-900/30 dark:text-amber-500 px-1 rounded flex items-center gap-1">
                                  🟤 {branch.temporaryIn} Temporary Staff
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-[10px] font-black ${branch.displayRate >= 95 ? 'text-emerald-500' : branch.displayRate >= 80 ? 'text-amber-500' : 'text-red-500'}`}>
                            {branch.displayRate}%
                          </span>
                        </div>
                        <UITooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden mt-1 cursor-pointer">
                              {branch.isWeekend ? (
                                <div className="h-full bg-slate-300 dark:bg-slate-600" style={{ width: '100%' }}></div>
                              ) : (
                                <>
                                  {greenPerc > 0 && <div className="h-full bg-[#10b981]" style={{ width: `${greenPerc}%` }}></div>}
                                  {brownPerc > 0 && <div className="h-full bg-[#b45309]" style={{ width: `${brownPerc}%` }}></div>}
                                  {yellowPerc > 0 && <div className="h-full bg-[#f59e0b]" style={{ width: `${yellowPerc}%` }}></div>}
                                  {bluePerc > 0 && <div className="h-full bg-[#3b82f6]" style={{ width: `${bluePerc}%` }}></div>}
                                  {redPerc > 0 && <div className="h-full bg-[#ef4444]" style={{ width: `${redPerc}%` }}></div>}
                                </>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="center" className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 shadow-xl rounded p-3 z-50 w-max whitespace-nowrap text-left min-w-[200px]">
                            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">
                              {FULL_BRANCH_NAMES[branch.branch] || branch.branch}
                            </p>
                            <div className="flex flex-col gap-1.5 text-[9px] text-slate-600 dark:text-foreground mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                              <p className="flex justify-between items-center gap-4">
                                <span>Permanent Staff:</span> 
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{branch.permanentStaffCount}</span>
                              </p>
                              <p className="flex justify-between items-center gap-4">
                                <span>Temporary In:</span> 
                                <span className="font-semibold text-amber-600">{branch.temporaryIn}</span>
                              </p>
                              <p className="flex justify-between items-center gap-4">
                                <span>Temporary Out:</span> 
                                <span className="font-semibold text-amber-600">{branch.temporaryOut}</span>
                              </p>
                              <p className="flex justify-between items-center gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                                <span className="font-bold text-slate-700 dark:text-slate-300">Expected Workforce:</span> 
                                <span className="font-bold text-slate-900 dark:text-slate-100">{branch.totalEmployees}</span>
                              </p>
                            </div>
                            <div className="flex flex-col gap-1 text-[9px] text-slate-600 dark:text-foreground">
                              <p className="flex justify-between items-center gap-4"><span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div>Present (On Time):</span> <span className="font-bold text-emerald-600">{branch.presentOnTime}</span></p>
                              {branch.tempPresent > 0 && <p className="flex justify-between items-center gap-4"><span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-700"></div>Temporary Present:</span> <span className="font-bold text-amber-700">{branch.tempPresent}</span></p>}
                              <p className="flex justify-between items-center gap-4"><span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></div>Late:</span> <span className="font-bold text-amber-600">{branch.presentLate + branch.tempLate}</span></p>
                              <p className="flex justify-between items-center gap-4"><span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>Outstation:</span> <span className="font-bold text-pink-600">{branch.outstation}</span></p>
                              <p className="flex justify-between items-center gap-4"><span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></div>On Leave:</span> <span className="font-bold text-blue-600">{branch.onLeave + branch.tempOnLeave}</span></p>
                              <p className="flex justify-between items-center gap-4"><span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>Company Leave:</span> <span className="font-bold text-purple-600">{branch.companyLeave + branch.tempCompanyLeave}</span></p>
                              <p className="flex justify-between items-center gap-4"><span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></div>Absent:</span> <span className="font-bold text-red-600">{branch.absent}</span></p>
                            </div>
                          </TooltipContent>
                        </UITooltip>
                      </div>
                    );
                  })}
               </TooltipProvider>
               {liveBranchRanking.length === 0 && (
                 <div className="text-center text-foreground text-xs py-10 font-medium">No branches found in this region.</div>
               )}
             </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <p className="text-[10px] font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Showing {liveBranchRanking.length} locations
                </p>
                <button className="text-xs font-bold text-foreground hover:text-[#942392] transition-colors flex items-center gap-1">See All <ChevronRight className="w-3 h-3" /></button>
              </div>
            </Card>
          </div>

         {/* Row 2: 3 Columns */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
           {/* Leave Distribution (Donut Chart) */}
           <Card className="p-4 border border-slate-100 dark:border-slate-700 hover:border-[#942392] hover: transition-all duration-300 flex flex-col rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
             <div className="flex justify-between items-center mb-2 border-b border-slate-100 dark:border-slate-800 pb-3">
               <div className="flex items-center gap-2">
                 <FileText className="w-4 h-4 text-foreground" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">Leave Distribution</h3>
               </div>
             </div>
             
             {totalLeaveCount > 0 ? (
               <div className="flex items-center flex-1 h-[140px]">
                 <div className="w-[140px] h-[140px] relative">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                         data={leaveData}
                         innerRadius={45}
                         outerRadius={65}
                         paddingAngle={2}
                         dataKey="value"
                         stroke="none"
                       >
                         {(Array.isArray(leaveData) ? leaveData : []).map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                         ))}
                       </Pie>
                     </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-lg font-black text-slate-800 dark:text-slate-200 leading-none">{totalLeaveCount || 0}</span>
                     <span className="text-[9px] font-bold text-foreground uppercase tracking-wider">Total</span>
                   </div>
                 </div>
                 <div className="flex-1 pl-4 space-y-2">
                   {(Array.isArray(leaveData) ? leaveData : []).map((entry, idx) => (
                     <div key={idx} className="flex justify-between items-center">
                       <div className="flex items-center gap-1.5">
                         <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                         <span className="text-[10px] font-semibold text-slate-700">{entry.name}</span>
                       </div>
                       <span className="text-[10px] font-black text-slate-800 dark:text-slate-200">{entry.value || 0}</span>
                     </div>
                   ))}
                 </div>
               </div>
             ) : (
               <div className="flex items-center justify-center flex-1 h-[140px] text-foreground text-xs italic bg-slate-50/50 rounded-lg border border-slate-300 dark:border-slate-700 border-dashed">
                 No Leave Request History Available
               </div>
             )}

             <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
               <button className="text-xs font-bold text-foreground hover:text-[#942392] transition-colors flex items-center gap-1">View Details <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>

           {/* Travel & Outstation Summary */}
           <Card className="p-5 border border-slate-100 dark:border-slate-700 hover:border-[#942392] hover: transition-all duration-300 flex flex-col relative bg-white dark:bg-card rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
             {feedConnected && (
               <div className="absolute top-4 right-4 flex items-center gap-1 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest z-10 shadow-sm">
                 <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
               </div>
             )}
             <div className="flex justify-between items-center mb-8 relative z-10 border-b border-slate-100 dark:border-slate-800 pb-3">
               <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Travel & Outstation Summary</CardTitle>
             </div>
             
             <div className="grid grid-cols-3 gap-2 mb-8">
               {(() => {
                 const currentOutstation = outstationSummary || data.outstationAnalytics || {};
                 const completed = currentOutstation.completedEvents ?? currentOutstation.completedTrips ?? 0;
                 const upcoming = currentOutstation.upcomingEvents ?? currentOutstation.upcomingTrips ?? 0;
                 const cancelled = currentOutstation.cancelledEvents ?? currentOutstation.cancelledTrips ?? 0;
                 return (
                   <>
                     <div className="flex flex-col items-center justify-center py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                       <span className="text-[32px] font-black text-[#1E293B] dark:text-white leading-none mb-2">{completed}</span>
                       <span className="text-[10px] font-bold text-foreground uppercase tracking-widest text-center">Completed</span>
                     </div>
                     <div className="flex flex-col items-center justify-center py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                       <span className="text-[32px] font-black text-[#1E293B] dark:text-white leading-none mb-2">{upcoming}</span>
                       <span className="text-[10px] font-bold text-foreground uppercase tracking-widest text-center">Upcoming</span>
                     </div>
                     <div className="flex flex-col items-center justify-center py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                       <span className="text-[32px] font-black text-[#1E293B] dark:text-white leading-none mb-2">{cancelled}</span>
                       <span className="text-[10px] font-bold text-foreground uppercase tracking-widest text-center">Cancelled</span>
                     </div>
                   </>
                 );
               })()}
             </div>
             
             <p className="text-[10px] font-bold text-foreground uppercase tracking-widest mb-4">Popular Routes</p>
             <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1 mb-2">
               {((outstationSummary?.popularRoutes || data.outstationAnalytics?.popularRoutes || [])).length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-foreground py-4">
                   <Plane className="w-6 h-6 opacity-30 mb-2" />
                   <p className="text-[9px] font-bold uppercase tracking-widest">No Routes Recorded</p>
                 </div>
               ) : (Array.isArray(outstationSummary?.popularRoutes || data.outstationAnalytics?.popularRoutes) ? (outstationSummary?.popularRoutes || data.outstationAnalytics?.popularRoutes) : []).map((r: any, i: number) => {
                 const currentRoutes = outstationSummary?.popularRoutes || data.outstationAnalytics?.popularRoutes || [];
                 const maxTrips = Math.max(...currentRoutes.map((pr: any) => pr.trips));
                 const w = maxTrips > 0 ? (r.trips / maxTrips) * 100 : 0;
                 return (
                   <div key={i} className="flex items-center gap-3">
                     <span className="text-[11px] font-bold text-[#3B66A7] truncate w-[130px]" title={r.route}>{r.route}</span>
                     <div className="flex-1 flex items-center relative group cursor-pointer">
                       <div className="h-2 bg-[#DBEAFE] dark:bg-blue-900/30 rounded-full group-hover:bg-blue-200 transition-colors" style={{ width: `${Math.max(10, w)}%` }}></div>
                     </div>
                     <span className="text-[13px] font-bold text-[#1E293B] dark:text-white w-4 text-right">{r.trips}</span>
                   </div>
                 );
               })}
             </div>

             <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center">
               <button onClick={() => navigate('/outstation/reports')} className="text-[11px] font-bold text-foreground hover:text-[#942392] transition-colors flex items-center gap-1">Explore <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>

           {/* Workforce Movement */}
           <Card className="p-4 border border-slate-100 dark:border-slate-700 hover:border-[#942392] hover: transition-all duration-300 flex flex-col rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
             <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
               <div className="flex items-center gap-2">
                 <Users className="w-4 h-4 text-foreground" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">Workforce Movement</h3>
               </div>
             </div>
             
             <div className="grid grid-cols-2 gap-3 flex-1">
               <div className="flex flex-col justify-center items-center py-2 bg-[#DCFCE7] rounded-[24px] border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
                 <span className="text-2xl font-black text-emerald-700 mb-0.5">+{movement.newJoiners || 0}</span>
                 <p className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">New Joiners</p>
                 <p className="text-[8px] font-bold text-emerald-600 mt-0.5">This Month</p>
               </div>
               <div className="flex flex-col justify-center items-center py-2 bg-[#FEE2E2] rounded-[24px] border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
                 <span className="text-2xl font-black text-rose-700 mb-0.5">-{movement.resigned || 0}</span>
                 <p className="text-[10px] font-bold text-rose-900 uppercase tracking-wider">Resigned</p>
                 <p className="text-[8px] font-bold text-rose-600 mt-0.5">This Month</p>
               </div>
               <div className="flex flex-col justify-center items-center py-2 bg-[#F8FAFC] rounded-[24px] border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] text-center">
                 <span className="text-xl font-black text-slate-700 mb-0.5">{movement.transferred || 0}</span>
                 <p className="text-[9px] font-bold text-foreground uppercase tracking-wider">Transferred</p>
               </div>
               <div className="flex flex-col justify-center items-center py-2 bg-[#F3E8FF] rounded-[24px] border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] text-center">
                 <span className="text-xl font-black text-purple-700 mb-0.5">{movement.promotions || 0}</span>
                 <p className="text-[9px] font-bold text-purple-500 uppercase tracking-wider">Promotions</p>
               </div>
             </div>
             <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
               <button className="text-xs font-bold text-foreground hover:text-[#942392] transition-colors flex items-center gap-1">Open Report <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>
          </div>
          </div>

        {/* Row 3: Employees Requiring Attention */}
         <div className="w-full mb-6">
           <EmployeesRequiringAttentionCard data={data.performance?.attentionEmployees || []} variant="grid" onEmployeeClick={(id: string) => onEmployeeClick?.(id)} />
         </div>

         {/* SUPPORTING SECTION */}
       <div>
         <div className="grid grid-cols-1 gap-6">
           <Card className="p-4 border-l-4 border-l-[#942392] border-y !border-y-slate-600 border-r !border-r-slate-600 dark:!border-y-slate-500 dark:!border-r-slate-500 hover:border-[#942392] hover: transition-all duration-300 flex flex-col rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
             <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
               <div className="flex items-center gap-2">
                 <AlertCircle className="w-4 h-4 text-[#942392]" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">HR Alerts</h3>
               </div>
               {feedConnected && (
                 <div className="flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest z-10 shadow-sm">
                   <span className="w-1 h-1 rounded-full bg-white dark:bg-card animate-pulse" /> LIVE
                 </div>
               )}
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
               {(Array.isArray(liveHrAlerts) ? liveHrAlerts : Array.isArray(hrAlerts) ? hrAlerts : []).map((alert: any, i: number) => {
                 let bgColor = 'bg-slate-50 dark:bg-slate-900/50';
                 let borderColor = 'border border-slate-300 dark:border-slate-700';
                 let iconColor = 'text-foreground';
                 let titleColor = 'text-slate-800 dark:text-slate-200';
                 
                 if (alert.type === 'critical') {
                   bgColor = 'bg-[#FEE2E2]'; borderColor = 'border-red-200'; iconColor = 'text-red-600'; titleColor = 'text-red-900';
                 } else if (alert.type === 'warning') {
                   bgColor = 'bg-[#FEF3C7]'; borderColor = 'border-amber-200'; iconColor = 'text-amber-600'; titleColor = 'text-amber-900';
                 } else if (alert.type === 'info') {
                   bgColor = 'bg-[#DBEAFE]'; borderColor = 'border-blue-200'; iconColor = 'text-blue-600'; titleColor = 'text-blue-900';
                 } else if (alert.type === 'success') {
                   bgColor = 'bg-[#DCFCE7]'; borderColor = 'border-emerald-200'; iconColor = 'text-emerald-600'; titleColor = 'text-emerald-900';
                 }
                 
                 return (
                   <div key={i} className={`p-3 rounded-lg border ${bgColor} ${borderColor} flex gap-3 items-start`}>
                     <div className={`mt-0.5 ${iconColor}`}>
                       {alert.type === 'critical' ? <XCircle className="w-4 h-4" /> :
                        alert.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                        alert.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                        <AlertCircle className="w-4 h-4" />}
                     </div>
                     <div>
                       <p className={`text-[11px] font-black uppercase tracking-wider mb-0.5 ${titleColor}`}>{alert.title}</p>
                       <p className="text-xs font-semibold text-slate-700">{alert.description}</p>
                     </div>
                   </div>
                 )
               })}
             </div>

             <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
               <button className="text-xs font-bold text-foreground hover:text-[#942392] transition-colors flex items-center gap-1">See All <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>
         </div>
       </div>
    </div>
  )
}









