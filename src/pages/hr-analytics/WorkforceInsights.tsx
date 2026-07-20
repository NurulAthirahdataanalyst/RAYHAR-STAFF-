import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportToCSV } from "@/utils/export";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, UserCheck, CalendarDays, Clock, FileCheck, CheckCircle2, XCircle, AlertTriangle, Building2, Download, ChevronRight, ChevronDown, Wifi, WifiOff, TrendingUp, MapPin, Plane, FileText, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Sector, AreaChart, Area, ReferenceArea } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EmployeesRequiringAttentionCard } from '@/components/shared/EmployeesRequiringAttentionCard';
import { MissingPunchCard } from "./MissingPunchCard";

const COLORS = ['#4f46e5', '#eab308', '#94a3b8', '#DC2626', '#a855f7', '#ec4899']; // Present, Late, On Leave, Absent, Comp Leave, Outstation

const cardHoverEffect = "cursor-pointer hover:border-purple-500 hover:ring-1 hover:ring-purple-500 hover:bg-purple-50/50 dark:hover:bg-slate-900/50 transition-all duration-200";

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
  const { role, userBranch, userDepartment } = useRole();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [day, setDay] = useState(new Date().getDate().toString().padStart(2, '0'));
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
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

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setDay(date.getDate().toString().padStart(2, '0'));
      setMonth((date.getMonth() + 1).toString().padStart(2, '0'));
      setYear(date.getFullYear().toString());
    }
  };

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
  const [feedConnected, setFeedConnected] = useState(false);
  const [liveEmployees, setLiveEmployees] = useState<any[]>([]);

  const isAdminRole = ["hr_admin", "managing_director", "finance_manager"].includes(role || "");

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
          setLiveWeeklyAttendanceTrend(d.weeklyAttendanceTrend || null);
          setLiveHrAlerts(d.hrAlerts || null);
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

  const handleApproveLeave = async (id: number) => {
    setPendingApprovalsList(prev => prev.filter(item => item.id !== id));
    try {
      await fetch(`${API_BASE_URL}/api/leave-requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved', approver_id: null, approver_note: '' })
      });
    } catch (err) { console.error('Approve error:', err); }
  };

  const handleDeclineLeave = async (id: number) => {
    setPendingApprovalsList(prev => prev.filter(item => item.id !== id));
    try {
      await fetch(`${API_BASE_URL}/api/leave-requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected', approver_id: null, approver_note: '' })
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
      const res = await fetch(`${API_BASE_URL}/api/reports/workforce-insights?${params}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || "Failed to fetch data");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInsights(); }, [role, userBranch, userDepartment, month, year, day, viewMode]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">Error: {error}. The backend may still be deploying.</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-500">No data available</div>;

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
            <div className="w-2 h-2 rounded-full bg-[#7B0099]"></div>
            <p className="text-[11px] text-slate-700">Attendance: <span className="font-bold">{payload[0].value}%</span></p>
          </div>
        </div>
      );
    }
    return null;
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
        
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-end w-full gap-3 pb-2 pt-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                {viewMode === "day" ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="appearance-none flex items-center justify-center px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 gap-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                        {displayDate} <CalendarDays className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1" align="end">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <input
                    type="month"
                    value={`${year}-${month}`}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [newYear, newMonth] = e.target.value.split('-');
                        setYear(newYear);
                        setMonth(newMonth);
                      }
                    }}
                    className="appearance-none flex items-center justify-center px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10"
                  />
                )}
              </div>

              <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-lg p-1 border border-slate-300 dark:border-slate-700">
                <button 
                  className={`h-8 px-5 text-[11px] font-bold tracking-widest rounded-md transition-all ${viewMode === 'day' ? 'bg-[#7B0099] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                  onClick={() => setViewMode('day')}
                >
                  DAY
                </button>
                <button 
                  className={`h-8 px-5 text-[11px] font-bold tracking-widest rounded-md transition-all ${viewMode === 'month' ? 'bg-[#7B0099] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                  onClick={() => setViewMode('month')}
                >
                  MONTH
                </button>
              </div>
            </div>
            <ExportDropdown 
              onExportCSV={() => exportToCSV(data.departmentMetrics || [], 'Workforce_Insights')} 
              onExportPDF={() => window.print()} 
            />
        </div>

        {viewMode === 'day' ? (
          <>
        {/* Redesigned Top Section: 5-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-6">
          
          {/* Column 1: Attendance Overview */}
          <Card className={`col-span-1 xl:col-span-1 rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card flex flex-col p-6 justify-between ${cardHoverEffect}`}>
            <div>
              <div className="w-12 h-12 rounded-full bg-[#ff5b37] flex items-center justify-center text-white shadow-sm mb-4">
                <UserCheck className="w-6 h-6" />
              </div>
              <p className="text-[14px] font-semibold text-slate-500">Attendance Overview</p>
              <h3 className="text-[34px] font-black text-slate-800 dark:text-slate-200 leading-none mt-2">
                {data.teamAvailability.present}/{Math.max(0, (data.topKpi.activeEmployees || data.topKpi.totalHeadcount || 0) - (data.topKpi.outstationToday || 0))}
              </h3>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Outstation</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200 leading-tight mt-1">{data.topKpi.outstationToday || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
                <Plane className="w-5 h-5 text-pink-600" />
              </div>
            </div>

            <button className="text-[12px] font-semibold text-slate-400 hover:text-slate-600 text-left mt-6 flex items-center gap-1">
              View Details <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Card>

          {/* Column 2 (middle): Grid of KPIs */}
          <div className="col-span-1 xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* KPI 1: Total Headcount */}
            <Card className={`rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card flex ${cardHoverEffect}`}>
              <CardContent className="p-5 flex items-center gap-4 h-full w-full">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Headcount</p>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 leading-tight mt-1">{data.topKpi.totalHeadcount}</h3>
                </div>
              </CardContent>
            </Card>

            {/* KPI 2: Active Employees */}
            <Card className={`rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card flex ${cardHoverEffect}`}>
              <CardContent className="p-5 flex items-center gap-4 h-full w-full">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Employees</p>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 leading-tight mt-1">{data.topKpi.activeEmployees}</h3>
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: Attendance Rate */}
            <Card className={`rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card flex ${cardHoverEffect}`}>
              <CardContent className="p-5 flex items-center gap-4 h-full w-full">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</p>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 leading-tight mt-1">{data.topKpi.attendanceRate}%</h3>
                </div>
              </CardContent>
            </Card>

            {/* KPI 4: On Leave Today */}
            <Card className={`rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card flex ${cardHoverEffect}`}>
              <CardContent className="p-5 flex items-center gap-4 h-full w-full">
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">On Leave Today</p>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 leading-tight mt-1">{data.topKpi.onLeaveToday}</h3>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Column 3: Employees By Department or Employee Attendance */}
          {['branch_leader', 'head_of_department'].includes(role) ? (
            <Card className={`col-span-1 md:col-span-2 xl:col-span-2 rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card p-5 flex flex-col justify-between ${cardHoverEffect}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">Employee Attendance Rates</span>
                <span className="text-[10px] bg-slate-50 dark:bg-slate-900/50 border border-slate-150 px-2 py-0.5 rounded text-slate-500 flex items-center gap-1 font-semibold">
                  This Month <ChevronDown className="w-3 h-3" />
                </span>
              </div>
              
              <div className="h-[95px] w-full overflow-y-auto custom-scrollbar overflow-x-hidden custom-scrollbar">
                <ResponsiveContainer width="100%" height={Math.max(95, (data.performance?.allAttendance?.length || 0) * 22)}>
                  <BarChart 
                    data={data.performance?.allAttendance || []} 
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                  >
                    <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} content={<CustomEmployeeTooltip />} />
                    <XAxis type="number" hide domain={[0, 100]} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} 
                      axisLine={false} 
                      tickLine={false} 
                      width={130}
                    />
                    <Bar dataKey="attendanceRate" fill="#7B0099" radius={[0, 4, 4, 0]} barSize={6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7B0099]"></div>
                <span className="text-[9px] font-bold text-slate-400">
                  Showing all staff in your {role === 'branch_leader' ? 'branch' : 'department'}
                </span>
              </div>
            </Card>
          ) : (
            <Card className={`col-span-1 md:col-span-2 xl:col-span-2 rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card p-5 flex flex-col justify-between ${cardHoverEffect}`}>
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">Employees By Department</span>
                <span className="text-[10px] bg-slate-50 dark:bg-slate-900/50 border border-slate-150 px-2 py-0.5 rounded text-slate-500 flex items-center gap-1 font-semibold">
                  This Month <ChevronDown className="w-3 h-3" />
                </span>
              </div>
              
              <div className="h-[200px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={departmentChartData} 
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                    barSize={24}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} content={<CustomDeptTooltip />} />
                    <XAxis type="number" axisLine={{ stroke: '#e2e8f0' }} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} width={130} />
                    <Bar dataKey="value" fill="#ff5b37" radius={[0, 4, 4, 0]} barSize={8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff5b37]"></div>
                <span className="text-[9px] font-bold text-slate-400">
                  {(() => {
                    const currentHc = data?.monthlyComparison?.headcount?.current || 0;
                    const prevHc = data?.monthlyComparison?.headcount?.previous || 0;
                    if (prevHc === 0 && currentHc > 0) {
                      return <>No of Employees increased by <span className="text-emerald-500">+100%</span> from last Month</>;
                    }
                    if (currentHc > prevHc && prevHc > 0) {
                      const pct = Math.round(((currentHc - prevHc) / prevHc) * 100);
                      return <>No of Employees increased by <span className="text-emerald-500">+{pct}%</span> from last Month</>;
                    } else if (currentHc < prevHc && prevHc > 0) {
                      const pct = Math.round(((prevHc - currentHc) / prevHc) * 100);
                      return <>No of Employees decreased by <span className="text-rose-500">-{pct}%</span> from last Month</>;
                    }
                    return "No of Employees remained unchanged from last Month";
                  })()}
                </span>
              </div>
            </Card>
          )}

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {(() => {
            const rawBranchMetrics = data?.branchMetrics || [];
            const filteredBranches = selectedRegion === 'All Regions' 
              ? rawBranchMetrics 
              : rawBranchMetrics.filter((b:any) => regionMap[b.name] === selectedRegion || (b.name==='HQ' && selectedRegion==='Central'));
            
            return (
              <Card className={`col-span-1 lg:col-span-2 rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card flex flex-col h-fit ${cardHoverEffect}`}>
                <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-row justify-between items-center">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <CardTitle className="text-[16px] font-semibold text-[#1A1F36] dark:text-gray-100">Branch Workforce Distribution</CardTitle>
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
                </CardHeader>
                <CardContent className="p-5 flex flex-col">
                  <div className={`space-y-4 flex-1 pr-2 ${filteredBranches.length > 5 ? 'overflow-y-auto custom-scrollbar max-h-[220px] custom-scrollbar' : 'overflow-y-visible'}`}>
                    <TooltipProvider>
                      {filteredBranches.map((branch: any, idx: number) => {
                        const branchEmployees = liveEmployees.filter(emp => emp.branch === branch.name);
                        const outstation = branchEmployees.filter(emp => emp.status === 'outstation').length;
                        const presentOnTime = branchEmployees.filter(emp => emp.status === 'present').length;
                        const presentLate = branchEmployees.filter(emp => emp.status === 'late').length;
                        const onLeave = branchEmployees.filter(emp => emp.status === 'onLeave').length;
                        const companyLeave = branchEmployees.filter(emp => emp.status === 'companyLeave').length;
                        const absent = Math.max(0, branch.count - (presentOnTime + presentLate + outstation + onLeave + companyLeave));
                        
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
                                <span className="text-[9px] text-slate-400">{branch.count} Employees</span>
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
                      <div className="text-center text-slate-400 text-xs py-10 font-medium">No branches found in this region.</div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span className="text-[10px] font-semibold text-slate-400">Showing all {filteredBranches.length} locations</span>
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


          <Card className={`col-span-1 rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card flex flex-col ${cardHoverEffect}`}>
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Team Availability</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">Real-time status for the current shift</CardDescription>
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
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#334155', fontWeight: 500 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center KPI Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-200 tracking-tight leading-none">{availabilityRate}%</span>
                  <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Current Rate</span>
                </div>
              </div>

              {/* Text Summary */}
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-indigo-600 leading-tight">{availableToday} Available Today</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {availableToday === totalTeam ? "All team members are accounted for." : `${totalTeam - availableToday} team members are not available.`}
                </p>
              </div>

              {/* 6-Shape Compact Legend */}
              <div className="grid grid-cols-2 gap-2 w-full mt-auto mb-4">
                {donutData.map((entry, index) => (
                  <div key={entry.name} className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border ${index === 0 ? 'bg-indigo-50/70 border-indigo-100' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'} transition-colors`}>
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">{entry.name}</span>
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
                  className="text-[10px] font-bold text-[#7B0099] cursor-pointer hover:underline flex items-center gap-1 justify-end mt-1"
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
          {/* 3. Leave Monitoring */}
          <Card className={`col-span-1 rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card ${cardHoverEffect}`}>
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Leave Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3">
                <div 
                  onClick={() => navigate("/leave/admin?tab=pending")}
                  className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-[#7B0099]/5 border border-transparent hover:border-[#7B0099]/20 rounded-lg transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-yellow-100/50 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#7B0099] transition-colors">Pending Requests</p>
                      <p className="text-xs text-slate-500 font-medium">Awaiting Approval</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-slate-700">{data.leaveMonitoring.pendingApproval}</span>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#7B0099] group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>

                <div 
                  onClick={() => navigate("/leave/admin?tab=approved")}
                  className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-[#7B0099]/5 border border-transparent hover:border-[#7B0099]/20 rounded-lg transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100/50 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                      <FileCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#7B0099] transition-colors">Approved Leave</p>
                      <p className="text-xs text-slate-500 font-medium">This Month</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-slate-700">{data.leaveMonitoring.approvedThisMonth}</span>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#7B0099] group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>

                <div 
                  onClick={() => navigate("/leave/admin?tab=approved")}
                  className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-[#7B0099]/5 border border-transparent hover:border-[#7B0099]/20 rounded-lg transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100/50 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#7B0099] transition-colors">Staff on Leave</p>
                      <p className="text-xs text-slate-500 font-medium">Out of Office (Today)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-slate-700">{data.leaveMonitoring.staffOnLeaveToday}</span>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#7B0099] group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6. Employee Performance & Attendance Ranking */}
          <Card className={`col-span-1 lg:col-span-2 rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card ${cardHoverEffect}`}>
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Employee Performance & Attendance</CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Top Attendance Performers
                </h4>
                <div className="space-y-3">
                  {data.performance.topAttendance.length > 0 ? data.performance.topAttendance.map((emp: any, i: number) => (
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
                    <p className="text-sm text-slate-500">No attendance records found.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" /> Highest Late Arrivals
                </h4>
                <div className="space-y-3">
                  {data.performance.topLate.length > 0 ? data.performance.topLate.map((emp: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:bg-slate-900/50 rounded-md transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-red-50 flex items-center justify-center text-xs font-bold text-red-600">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{emp.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-red-600">{emp.lateCount}</span>
                        <span className="text-xs text-slate-500">lates</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500">No late arrivals recorded.</p>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>

        </div>

        {/* BOTTOM SECTION: LIVE CARDS */}
        {isAdminRole && (
          <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">

          {/* Card 1: Clock-In/Out â€” LIVE SSE */}
          <Card className={`rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card flex flex-col p-4 ${cardHoverEffect}`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Clock-In/Out</h3>
                {feedConnected
                  ? <span className="flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white dark:bg-card animate-pulse" />LIVE</span>
                  : <span className="text-[8px] text-slate-400 font-bold uppercase">Connectingâ€¦</span>}
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-slate-900/50 border border border-slate-300 dark:border-slate-700 rounded text-slate-500 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> {displayDate}
              </span>
            </div>

            {/* allClockIns = on-time + late merged, sorted by clock_in */}
            {(() => {
              const allClockIns = [...clockInOut, ...lateList].sort((a, b) =>
                (a.clock_in || '').localeCompare(b.clock_in || '')
              );
              return (
                <div className="flex-1 space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-0.5">
                  {allClockIns.length === 0 && !feedConnected && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                      <Loader2 className="w-5 h-5 animate-spin mb-2" />
                      <p className="text-[10px] font-medium">Loading live dataâ€¦</p>
                    </div>
                  )}
                  {allClockIns.length === 0 && feedConnected && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                      <Clock className="w-6 h-6 opacity-40 mb-1" />
                      <p className="text-[10px] font-semibold">No clock-ins yet today</p>
                    </div>
                  )}
                  {allClockIns.map((emp) => (
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
                          <p className="text-[10px] text-slate-400 font-medium">{emp.department && emp.department !== '—' && emp.department !== '-' ? emp.department : emp.branch}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
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
          <Card className={`rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card flex flex-col p-4 ${cardHoverEffect}`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Late</h3>
                {feedConnected
                  ? <span className="flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white dark:bg-card animate-pulse" />LIVE</span>
                  : <span className="text-[8px] text-slate-400 font-bold uppercase">Connectingâ€¦</span>}
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-slate-900/50 border border border-slate-300 dark:border-slate-700 rounded text-slate-500 flex items-center gap-1">
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
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 opacity-60 mb-1" />
                  <p className="text-[10px] font-semibold">No late arrivals today!</p>
                </div>
              )}
              {lateList.map((emp) => (
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
                      <p className="text-[10px] text-slate-400 font-medium">{emp.department !== 'â€”' ? emp.department : emp.branch}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
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
          <Card className={`rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card flex flex-col p-4 ${cardHoverEffect}`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Absent / Leave / Outstation</h3>
                {feedConnected
                  ? <span className="flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white dark:bg-card animate-pulse" />LIVE</span>
                  : <span className="text-[8px] text-slate-400 font-bold uppercase">Connectingâ€¦</span>}
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-slate-900/50 border border border-slate-300 dark:border-slate-700 rounded text-slate-500 flex items-center gap-1">
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
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 opacity-60 mb-1" />
                  <p className="text-[10px] font-semibold">No absentees today!</p>
                </div>
              )}
              {absentList.map((emp) => (
                <div key={emp.user_id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:bg-slate-900/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${getAvatarColor(emp.full_name)}`}>
                      {emp.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2">{emp.full_name.toUpperCase()}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">{emp.department !== 'â€”' ? emp.department : emp.branch}</p>
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
              <Card className={`rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card flex flex-col p-4 ${cardHoverEffect}`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Active Outstation</h3>
                    {feedConnected
                      ? <span className="flex items-center gap-1 bg-pink-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white dark:bg-card animate-pulse" />LIVE</span>
                      : <span className="text-[8px] text-slate-400 font-bold uppercase">Connecting…</span>}
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
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                      <Plane className="w-6 h-6 opacity-40 mb-1" />
                      <p className="text-[10px] font-semibold">No active outstations today.</p>
                    </div>
                  )}
                  {activeOutstationList.map((item, idx) => {
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
                                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                  <CalendarDays className="w-3 h-3 text-slate-400 shrink-0" /> {dateDisplay}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" /> {days} Day{days === 1 ? '' : 's'} Total
                              </p>
                              {item.destination && item.title !== item.destination && (
                                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {item.destination}
                                </p>
                              )}
                              {item.title === item.destination && (
                                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {item.destination}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="flex -space-x-1.5 mt-0.5">
                              {displayEmps.map((e: any, eIdx: number) => (
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
          <Card className={`rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card flex flex-col p-4 ${cardHoverEffect}`}>
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
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-60 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wider">All caught up!</p>
                  <p className="text-[10px] mt-0.5">No pending approvals remaining.</p>
                </div>
              ) : (
                pendingApprovalsList.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:bg-slate-900/50 transition-all gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0 mt-0.5 ${getAvatarColor(item.name)}`}>
                        {item.initials}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{item.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                          <CalendarDays className="w-3 h-3 text-slate-400" /> {item.dates} <span className="text-slate-300">|</span> <span className="text-[#ff5b37] font-semibold">{item.days}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Reason: {item.reason}</p>
                      </div>
                    </div>
                    <div className="flex sm:flex-col gap-1.5 self-end sm:self-center shrink-0">
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
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
          </div>

          {/* Card 4: Upcoming Outstation */}
          <Card className={`rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card flex flex-col p-4 ${cardHoverEffect}`}>
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
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <Plane className="w-6 h-6 opacity-40 mb-1" />
                  <p className="text-[10px] font-semibold">No upcoming outstations today!</p>
                </div>
              )}
              {upcomingOutstationList.map((item, idx) => {
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
                            <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                              <CalendarDays className="w-3 h-3 text-slate-400 shrink-0" /> {dateDisplay}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" /> {item.time}
                          </p>
                          {item.destination && item.title !== item.destination && (
                            <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {item.destination}
                            </p>
                          )}
                          {item.title === item.destination && (
                            <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {item.destination}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex -space-x-1.5">
                        {displayEmps.map((e: any, i: number) => (
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
            
            <button onClick={() => navigate('/outstation/assignment')} className="text-xs font-semibold text-[#7B0099] hover:text-[#5c0073] text-center mt-4 flex items-center justify-center gap-1 w-full pt-2 border-t border-slate-100 dark:border-slate-800">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Card>

          </div>
          </>
        )}
        </>
        ) : (
          <MonthViewDashboard data={data} outstationSummary={outstationSummary} feedConnected={feedConnected} liveMonthlyComp={liveMonthlyComp} liveHrAlerts={liveHrAlerts} liveLeaveTrend={liveLeaveTrend} month={month} liveWeeklyAttendanceTrend={liveWeeklyAttendanceTrend} />
        )}
      </div>
  );
}
function MonthViewDashboard({ data, clockInOut, lateList, absentList, pendingApprovalsList, feedConnected, outstationSummary, liveMonthlyComp, liveHrAlerts, liveLeaveTrend, month, liveWeeklyAttendanceTrend }: any) {
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
  
  const [selectedRegion, setSelectedRegion] = useState<string>('All Regions');
  const filteredBranches = selectedRegion === 'All Regions' 
    ? rawBranchMetrics 
    : rawBranchMetrics.filter((b:any) => regionMap[b.name] === selectedRegion || (b.name==='HQ' && selectedRegion==='Central'));

  const departmentMetrics = (data.departmentMetrics || []).map((d: any) => ({ ...d, name: (d.name || '').toUpperCase() }));
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
  for (let i = 5; i >= 0; i--) {
    const mIdx = ((targetMonthIdx - i) + 12) % 12;
    emptyTrend.push({ month: monthsArr[mIdx], Annual: 0, Sick: 0, Replacement: 0 });
  }

  // Leave Utilization Trend Data — SSE real data only, no random fallback
  const leaveTrendData = liveLeaveTrend || data.leaveTrend || data.leaveAnalytics?.monthlyTrend || emptyTrend;

  const currentMonthSick = leaveTrendData.length > 0 ? (leaveTrendData[leaveTrendData.length - 1].Sick ?? leaveTrendData[leaveTrendData.length - 1].sick ?? 0) : 0;
  const prevMonthSick = leaveTrendData.length > 1 ? (leaveTrendData[leaveTrendData.length - 2].Sick ?? leaveTrendData[leaveTrendData.length - 2].sick ?? 0) : 0;
  const sickLeaveSpike = currentMonthSick > 0 && currentMonthSick >= prevMonthSick * 1.5;

  return (
    <div className="space-y-8">
       {/* PRIMARY SECTION */}
       <div>
         <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Primary</h2>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 flex items-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-300 dark:border-slate-700 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default bg-white dark:bg-card rounded-[12px] group">
               <div className="w-12 h-12 rounded-xl bg-[#F0F4FA] text-[#3B66A7] flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                 <Users className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-[#8C98A4] font-bold uppercase tracking-widest mb-0.5">Total Headcount</p>
                 <h3 className="text-2xl font-black text-[#1A1F36]">{topKpi.totalHeadcount || 0}</h3>
               </div>
            </Card>
            <Card className="p-4 flex items-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-300 dark:border-slate-700 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default bg-white dark:bg-card rounded-[12px] group">
               <div className="w-12 h-12 rounded-xl bg-[#EEF8F4] text-[#10B981] flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                 <UserCheck className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-[#8C98A4] font-bold uppercase tracking-widest mb-0.5">Active Employees</p>
                 <h3 className="text-2xl font-black text-[#1A1F36]">{topKpi.activeEmployees || 0}</h3>
               </div>
            </Card>
            <Card className="p-4 flex items-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-300 dark:border-slate-700 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default bg-white dark:bg-card rounded-[12px] group relative">
               {feedConnected && <span className="absolute top-3 right-3 flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white dark:bg-card animate-pulse" />LIVE</span>}
               <div className="w-12 h-12 rounded-xl bg-[#F0F2FB] text-[#6366F1] flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                 <CheckCircle2 className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-[#8C98A4] font-bold uppercase tracking-widest mb-0.5">Attendance Rate</p>
                 <h3 className="text-2xl font-black text-[#1A1F36]">{((liveMonthlyComp || monthlyComp).attendance?.current) || topKpi.attendanceRate || 0}%</h3>
               </div>
            </Card>
            <Card className="p-4 flex items-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-300 dark:border-slate-700 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default bg-white dark:bg-card rounded-[12px] group">
               <div className="w-12 h-12 rounded-xl bg-[#FFF5EE] text-[#F59E0B] flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                 <CalendarDays className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-[#8C98A4] font-bold uppercase tracking-widest mb-0.5">On Leave Today</p>
                 <h3 className="text-2xl font-black text-[#1A1F36]">{topKpi.onLeaveToday || 0}</h3>
               </div>
            </Card>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start">
           <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="p-5 shadow-sm border border-slate-300 dark:border-slate-700 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#f97316]"></div>
              <div className="flex justify-between items-center mb-6 pl-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-black text-[#1A1F36] dark:text-white">Attendance Trend</h3>
                </div>
                <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 shadow-sm">
                  <CalendarDays className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Weekly</span>
                </div>
              </div>
              
              {/* Summary and Legend */}
              <div className="flex justify-between items-center mb-6 pl-2">
                <div className="flex gap-6 items-baseline">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{(liveWeeklyAttendanceTrend || data?.attendanceOverview?.weeklyAttendanceTrend)?.reduce((sum, item) => sum + item.present, 0) || 0}</span>
                    <span className="text-xs font-bold text-slate-500">On-Time</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{(liveWeeklyAttendanceTrend || data?.attendanceOverview?.weeklyAttendanceTrend)?.reduce((sum, item) => sum + item.late, 0) || 0}</span>
                    <span className="text-xs font-bold text-slate-500">Late</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{(liveWeeklyAttendanceTrend || data?.attendanceOverview?.weeklyAttendanceTrend)?.reduce((sum, item) => sum + item.absent, 0) || 0}</span>
                    <span className="text-xs font-bold text-slate-500">Absent</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div><span className="text-xs font-bold text-slate-600">Present</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#eab308]"></div><span className="text-xs font-bold text-slate-600">Late</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#ef4444]"></div><span className="text-xs font-bold text-slate-600">Absent</span></div>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 h-[280px] min-h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={liveWeeklyAttendanceTrend || data?.attendanceOverview?.weeklyAttendanceTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={4} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                      
                      {/* Weekend Highlighting */}
                      {(data?.attendanceOverview?.branchZone || 'ZONE_B') === 'ZONE_A' ? (
                        <>
                          <ReferenceArea x1="Fri" x2="Sat" fill="#f8fafc" fillOpacity={0.8} />
                        </>
                      ) : (
                        <>
                          <ReferenceArea x1="Sat" x2="Sun" fill="#f8fafc" fillOpacity={0.8} />
                        </>
                      )}

                      <Bar dataKey="present" name="Present" stackId="a" fill="#10b981" />
                      <Bar dataKey="late" name="Late" stackId="a" fill="#eab308" />
                      <Bar dataKey="absent" name="Absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Metric Boxes */}
                <div className="flex flex-col justify-between w-full lg:w-[200px] gap-3">
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/50 h-full">
                    <p className="text-xs text-slate-500 font-bold mb-1">Max Working Hours</p>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">8.4 hrs</h3>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/50 h-full">
                    <p className="text-xs text-slate-500 font-bold mb-1">Missed Punches</p>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{data?.performance?.missingPunchEmployees?.reduce((sum, emp) => sum + emp.missingPunches, 0) || 0}</h3>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/50 h-full">
                    <p className="text-xs text-slate-500 font-bold mb-1">Weekly Avg</p>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{topKpi.attendanceRate || 0}%</h3>
                  </div>
                </div>
              </div>
            </Card>
           
           <Card className="p-5 shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card flex flex-col hover:border-[#7B0099] hover:shadow-md transition-all duration-300">
              <div className="flex items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#7B0099]" />
                  <h3 className="text-[15px] font-black text-slate-800 dark:text-slate-200">Leave Utilization Trend vs. Previous Month</h3>
                </div>
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
             <Card className="p-5 shadow-sm border border-slate-300 dark:border-slate-700 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col">
             <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
               <div className="flex items-center gap-2">
                 <FileCheck className="w-4 h-4 text-slate-400" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">Monthly Comparison</h3>
               </div>
             </div>
             <div className="overflow-x-auto flex-1">
               <table className="w-full text-sm text-left">
                 <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase">
                   <tr className="border-b border-slate-200 dark:border-slate-700">
                     <th className="px-4 py-3 font-semibold">Metric</th>
                     <th className="px-4 py-3 font-semibold text-right border-l border-slate-200 dark:border-slate-700">This Month {feedConnected && <span className="ml-1 text-[8px] bg-red-500 text-white px-1 rounded animate-pulse">LIVE</span>}</th>
                     <th className="px-4 py-3 font-semibold text-right">Last Month</th>
                     <th className="px-4 py-3 font-semibold text-right">Change</th>
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
                         <td className="px-4 py-3 text-slate-500 text-right">{row.prev}</td>
                         <td className="px-4 py-3 text-right">
                           {isNeutral ? <span className="text-slate-400 font-bold inline-block">-</span> : 
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
               <button className="text-xs font-bold text-slate-500 hover:text-[#7B0099] transition-colors flex items-center gap-1">Open Report <ChevronRight className="w-3 h-3" /></button>
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
         <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Workforce Analytics</h2>
         
         {/* Row 1: 2 Columns */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
           {/* Department Workforce Distribution */}
           <Card className="lg:col-span-5 p-4 shadow-sm border border-slate-300 dark:border-slate-700 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col">
             <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
               <div className="flex items-center gap-2">
                 <Building2 className="w-4 h-4 text-slate-400" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">Department Workforce Distribution</h3>
               </div>
               <div className="text-[10px] font-bold border border border-slate-300 dark:border-slate-700 rounded px-2 py-1 flex items-center gap-1 text-slate-500 cursor-pointer hover:bg-slate-50 dark:bg-slate-900/50">
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
                         <span className="text-[9px] text-slate-400">{dept.count} Employees</span>
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
               <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722]"></span>
                 HQ operations represent {(departmentMetrics.reduce((sum:number,d:any)=>sum+d.value,0)/topKpi.totalHeadcount*100 || 0).toFixed(0)}% of workforce
               </p>
               <button className="text-xs font-bold text-slate-500 hover:text-[#7B0099] transition-colors flex items-center gap-1">View All <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>

           {/* Branch Workforce Distribution */}
           <Card className="lg:col-span-7 p-4 shadow-sm border border-slate-300 dark:border-slate-700 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col bg-white dark:bg-card">
             <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
               <div className="flex items-center gap-2">
                 <MapPin className="w-4 h-4 text-slate-400" />
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
             
             <div className={`space-y-4 flex-1 pr-2 ${filteredBranches.length > 5 ? 'overflow-y-auto custom-scrollbar max-h-[220px] custom-scrollbar' : 'overflow-y-visible'}`}>
               <TooltipProvider>
                {filteredBranches.sort((a:any,b:any)=>b.attendanceRate-a.attendanceRate).map((branch: any, idx: number) => {
                  return (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-[#1A1F36] dark:text-gray-200">{branch.name}</span>
                          <span className="text-[9px] text-slate-400">{branch.count} Employees</span>
                        </div>
                        <span className={`text-[10px] font-black ${branch.attendanceRate >= 95 ? 'text-emerald-500' : 'text-amber-500'}`}>{branch.attendanceRate}%</span>
                      </div>
                      <UITooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1 cursor-pointer">
                            <div className={`h-full rounded-full ${branch.attendanceRate >= 95 ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`} style={{ width: `${branch.attendanceRate}%` }}></div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center" className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 shadow-xl rounded p-3 z-50 w-max whitespace-nowrap text-left min-w-[150px]">
                          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">{branch.name}</p>
                          <div className="flex flex-col gap-1 text-[9px] text-slate-600">
                            <p className="flex justify-between items-center gap-4"><span className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${branch.attendanceRate >= 95 ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`}></div>Attendance Rate:</span> <span className={`font-bold ${branch.attendanceRate >= 95 ? 'text-emerald-600' : 'text-amber-500'}`}>{branch.attendanceRate}%</span></p>
                          </div>
                        </TooltipContent>
                      </UITooltip>
                    </div>
                  );
                })}
               </TooltipProvider>
               {filteredBranches.length === 0 && (
                 <div className="text-center text-slate-400 text-xs py-10 font-medium">No branches found in this region.</div>
               )}
             </div>

             <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
               <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                 Showing {filteredBranches.length} locations
               </p>
               <button className="text-xs font-bold text-slate-500 hover:text-[#7B0099] transition-colors flex items-center gap-1">See All <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>
         </div>

         {/* Row 2: 3 Columns */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
           {/* Leave Distribution (Donut Chart) */}
           <Card className="p-4 shadow-sm border border-slate-300 dark:border-slate-700 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col">
             <div className="flex justify-between items-center mb-2 border-b border-slate-100 dark:border-slate-800 pb-3">
               <div className="flex items-center gap-2">
                 <FileText className="w-4 h-4 text-slate-400" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">Leave Distribution</h3>
               </div>
             </div>
             
             {totalLeaveCount > 0 ? (
               <div className="flex items-center flex-1 h-[140px]">
                 <div className="w-[140px] h-[140px] relative">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} itemStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                       <Pie
                         data={leaveData}
                         innerRadius={45}
                         outerRadius={65}
                         paddingAngle={2}
                         dataKey="value"
                         stroke="none"
                       >
                         {leaveData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                         ))}
                       </Pie>
                     </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-lg font-black text-slate-800 dark:text-slate-200 leading-none">{totalLeaveCount || 0}</span>
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
                   </div>
                 </div>
                 <div className="flex-1 pl-4 space-y-2">
                   {leaveData.map((entry, idx) => (
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
               <div className="flex items-center justify-center flex-1 h-[140px] text-slate-400 text-xs italic bg-slate-50/50 rounded-lg border border-slate-300 dark:border-slate-700 border-dashed">
                 No Leave Request History Available
               </div>
             )}

             <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
               <button className="text-xs font-bold text-slate-500 hover:text-[#7B0099] transition-colors flex items-center gap-1">View Details <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>

           {/* Travel & Outstation Summary */}
           <Card className="p-5 shadow-sm border-slate-300 dark:border-slate-700 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col relative bg-white dark:bg-card">
             {feedConnected && (
               <div className="absolute top-4 right-4 flex items-center gap-1 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest z-10 shadow-sm">
                 <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
               </div>
             )}
             <div className="flex justify-between items-center mb-8 relative z-10 border-b border-slate-100 dark:border-slate-800 pb-3">
               <div className="flex items-center gap-2">
                 <Plane className="w-4 h-4 text-slate-400 transform -rotate-45" />
                 <h3 className="text-[13px] font-bold text-[#1A1F36] dark:text-gray-100">Travel & Outstation Summary</h3>
               </div>
             </div>
             
             <div className="grid grid-cols-3 gap-2 mb-8">
               <div className="flex flex-col items-center justify-center py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                 <span className="text-[32px] font-black text-[#1E293B] dark:text-white leading-none mb-2">{outstationSummary?.completedEvents || outstationSummary?.completedTrips || 2}</span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Completed</span>
               </div>
               <div className="flex flex-col items-center justify-center py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                 <span className="text-[32px] font-black text-[#1E293B] dark:text-white leading-none mb-2">{outstationSummary?.upcomingEvents || outstationSummary?.upcomingTrips || 0}</span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Upcoming</span>
               </div>
               <div className="flex flex-col items-center justify-center py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                 <span className="text-[32px] font-black text-[#1E293B] dark:text-white leading-none mb-2">{outstationSummary?.cancelledEvents || outstationSummary?.cancelledTrips || 0}</span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Cancelled</span>
               </div>
             </div>
             
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Popular Routes</p>
             <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1 mb-2">
               {((outstationSummary?.popularRoutes || data.outstationAnalytics?.popularRoutes || [])).length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400 py-4">
                   <Plane className="w-6 h-6 opacity-30 mb-2" />
                   <p className="text-[9px] font-bold uppercase tracking-widest">No Routes Recorded</p>
                 </div>
               ) : (outstationSummary?.popularRoutes || data.outstationAnalytics?.popularRoutes || []).map((r: any, i: number) => {
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
               <button onClick={() => navigate('/outstation/reports')} className="text-[11px] font-bold text-slate-500 hover:text-[#7B0099] transition-colors flex items-center gap-1">Explore <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>

           {/* Workforce Movement */}
           <Card className="p-4 shadow-sm border border-slate-300 dark:border-slate-700 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col">
             <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
               <div className="flex items-center gap-2">
                 <Users className="w-4 h-4 text-slate-400" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">Workforce Movement</h3>
               </div>
             </div>
             
             <div className="grid grid-cols-2 gap-3 flex-1">
               <div className="flex flex-col justify-center items-center py-2 bg-[#DCFCE7] rounded-xl border border-emerald-100">
                 <span className="text-2xl font-black text-emerald-700 mb-0.5">+{movement.newJoiners || 0}</span>
                 <p className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">New Joiners</p>
                 <p className="text-[8px] font-bold text-emerald-600 mt-0.5">This Month</p>
               </div>
               <div className="flex flex-col justify-center items-center py-2 bg-[#FEE2E2] rounded-xl border border-rose-100">
                 <span className="text-2xl font-black text-rose-700 mb-0.5">-{movement.resigned || 0}</span>
                 <p className="text-[10px] font-bold text-rose-900 uppercase tracking-wider">Resigned</p>
                 <p className="text-[8px] font-bold text-rose-600 mt-0.5">This Month</p>
               </div>
               <div className="flex flex-col justify-center items-center py-2 bg-[#F8FAFC] rounded-xl border border border-slate-300 dark:border-slate-700 text-center">
                 <span className="text-xl font-black text-slate-700 mb-0.5">{movement.transferred || 0}</span>
                 <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Transferred</p>
               </div>
               <div className="flex flex-col justify-center items-center py-2 bg-[#F3E8FF] rounded-xl border border-purple-200 text-center">
                 <span className="text-xl font-black text-purple-700 mb-0.5">{movement.promotions || 0}</span>
                 <p className="text-[9px] font-bold text-purple-500 uppercase tracking-wider">Promotions</p>
               </div>
             </div>
             <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
               <button className="text-xs font-bold text-slate-500 hover:text-[#7B0099] transition-colors flex items-center gap-1">Open Report <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>
          </div>
          </div>

        {/* Row 3: Employees Requiring Attention */}
         <div className="w-full mb-6">
           <EmployeesRequiringAttentionCard data={data.performance?.attentionEmployees || []} variant="grid" />
         </div>

         {/* SUPPORTING SECTION */}
       <div>
         <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Notices</h2>
         <div className="grid grid-cols-1 gap-6">
           <Card className="p-4 shadow-sm border-l-4 border-l-[#7B0099] border-y !border-y-slate-600 border-r !border-r-slate-600 dark:!border-y-slate-500 dark:!border-r-slate-500 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col">
             <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
               <div className="flex items-center gap-2">
                 <AlertCircle className="w-4 h-4 text-[#7B0099]" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">HR Alerts</h3>
               </div>
               {feedConnected && (
                 <div className="flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest z-10 shadow-sm">
                   <span className="w-1 h-1 rounded-full bg-white dark:bg-card animate-pulse" /> LIVE
                 </div>
               )}
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
               {(liveHrAlerts || hrAlerts || []).map((alert: any, i: number) => {
                 let bgColor = 'bg-slate-50 dark:bg-slate-900/50';
                 let borderColor = 'border border-slate-300 dark:border-slate-700';
                 let iconColor = 'text-slate-500';
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
               <button className="text-xs font-bold text-slate-500 hover:text-[#7B0099] transition-colors flex items-center gap-1">See All <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>
         </div>
       </div>
    </div>
  )
}






