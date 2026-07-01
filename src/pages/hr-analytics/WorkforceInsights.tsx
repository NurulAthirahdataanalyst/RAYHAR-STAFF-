import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportToCSV } from "@/utils/export";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, UserCheck, CalendarDays, Clock, FileCheck, CheckCircle2, XCircle, AlertTriangle, Building2, Download, ChevronRight, ChevronDown, Wifi, WifiOff, TrendingUp, MapPin, Plane, FileText, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Sector, AreaChart, Area } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

const COLORS = ['#4f46e5', '#eab308', '#94a3b8', '#DC2626']; // Present, Late, On Leave, Absent

const cardHoverEffect = "transition-all duration-300 hover:shadow-[0_0_15px_rgba(123,0,153,0.15)] hover:border-[#7B0099]/30 hover:-translate-y-0.5";

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
  const [feedConnected, setFeedConnected] = useState(false);

  const isAdminRole = ["hr_admin", "managing_director", "finance_manager"].includes(role || "");

  // SSE connection for live feed
  useEffect(() => {
    if (!isAdminRole) return;
    const params = new URLSearchParams({
      role: role || "",
      branch: userBranch || "",
      department: userDepartment || "",
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
          setFeedConnected(true);
        }
      } catch {}
    };
    es.onerror = () => setFeedConnected(false);
    return () => es.close();
  }, [role, userBranch, userDepartment, isAdminRole, month, year, day, viewMode]);

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
  ];

  const availableToday = data.teamAvailability.present;
  const totalTeam = availableToday + data.teamAvailability.onLeave + data.teamAvailability.absent;
  const availabilityRate = totalTeam > 0 ? Math.round((availableToday / totalTeam) * 100) : 0;

  const departmentChartData = (data.departmentMetrics || []).filter((d: any) => d.name && d.name.toLowerCase() !== 'unassigned');

  const CustomDeptTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-md shadow-lg p-2 flex flex-col gap-1 min-w-[100px]">
          <p className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-sm border-b border-slate-100">{label}</p>
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
        <div className="bg-white border border-slate-200 rounded-md shadow-lg p-2 flex flex-col gap-1 min-w-[100px]">
          <p className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-sm border-b border-slate-100">{label}</p>
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 px-5 text-sm font-bold text-slate-800 bg-slate-50 border-slate-200 hover:bg-slate-100 uppercase tracking-widest rounded-lg flex items-center gap-3">
                    {displayDate} <CalendarDays className="w-4 h-4 text-slate-600" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="end">
                  {viewMode === 'day' ? (
                    <div className="p-1">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        initialFocus
                      />
                    </div>
                  ) : (
                    <div className="w-[260px] flex flex-col gap-3">
                      {/* Year Input/Display */}
                      <div className="bg-slate-100 rounded-sm">
                        <Select value={year} onValueChange={setYear}>
                          <SelectTrigger className="w-full bg-transparent border-none shadow-none h-9 text-sm focus:ring-0">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Month Grid */}
                      <div className="grid grid-cols-4 gap-1">
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => {
                          const mValue = (i + 1).toString().padStart(2, '0');
                          const isSelected = month === mValue;
                          return (
                            <button
                              key={m}
                              onClick={() => setMonth(mValue)}
                              className={`py-1.5 px-1 text-sm text-center transition-colors ${
                                isSelected 
                                  ? 'bg-[#5f6368] text-white border-[2px] border-[#202124]' 
                                  : 'text-slate-700 hover:bg-slate-100 border-[2px] border-transparent'
                              }`}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <button 
                          className="text-sm text-sky-500 hover:underline"
                          onClick={() => {
                            setMonth((new Date().getMonth() + 1).toString().padStart(2, '0'));
                          }}
                        >
                          Clear
                        </button>
                        <button 
                          className="text-sm text-sky-500 hover:underline"
                          onClick={() => {
                            setMonth((new Date().getMonth() + 1).toString().padStart(2, '0'));
                            setYear(new Date().getFullYear().toString());
                          }}
                        >
                          This month
                        </button>
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-100">
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
          <Card className={`col-span-1 xl:col-span-1 rounded-lg shadow-sm border-slate-200 bg-white flex flex-col p-6 justify-between ${cardHoverEffect}`}>
            <div>
              <div className="w-12 h-12 rounded-full bg-[#ff5b37] flex items-center justify-center text-white shadow-sm mb-4">
                <UserCheck className="w-6 h-6" />
              </div>
              <p className="text-[14px] font-semibold text-slate-500">Attendance Overview</p>
              <h3 className="text-[34px] font-black text-slate-800 leading-none mt-2">
                {data.teamAvailability.present}/{data.topKpi.activeEmployees || data.topKpi.totalHeadcount}
              </h3>
            </div>
            <button className="text-[12px] font-semibold text-slate-400 hover:text-slate-600 text-left mt-6 flex items-center gap-1">
              View Details <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Card>

          {/* Column 2 (middle): 2x2 Grid of KPIs */}
          <div className="col-span-1 xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* KPI 1: Total Headcount */}
            <Card className={`rounded-lg shadow-sm border-slate-200 bg-white flex ${cardHoverEffect}`}>
              <CardContent className="p-5 flex items-center gap-4 h-full w-full">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Headcount</p>
                  <h3 className="text-xl font-bold text-slate-800 leading-tight mt-1">{data.topKpi.totalHeadcount}</h3>
                </div>
              </CardContent>
            </Card>

            {/* KPI 2: Active Employees */}
            <Card className={`rounded-lg shadow-sm border-slate-200 bg-white flex ${cardHoverEffect}`}>
              <CardContent className="p-5 flex items-center gap-4 h-full w-full">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Employees</p>
                  <h3 className="text-xl font-bold text-slate-800 leading-tight mt-1">{data.topKpi.activeEmployees}</h3>
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: Attendance Rate */}
            <Card className={`rounded-lg shadow-sm border-slate-200 bg-white flex ${cardHoverEffect}`}>
              <CardContent className="p-5 flex items-center gap-4 h-full w-full">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</p>
                  <h3 className="text-xl font-bold text-slate-800 leading-tight mt-1">{data.topKpi.attendanceRate}%</h3>
                </div>
              </CardContent>
            </Card>

            {/* KPI 4: On Leave Today */}
            <Card className={`rounded-lg shadow-sm border-slate-200 bg-white flex ${cardHoverEffect}`}>
              <CardContent className="p-5 flex items-center gap-4 h-full w-full">
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">On Leave Today</p>
                  <h3 className="text-xl font-bold text-slate-800 leading-tight mt-1">{data.topKpi.onLeaveToday}</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Column 3: Employees By Department or Employee Attendance */}
          {['branch_leader', 'head_of_department'].includes(role) ? (
            <Card className={`col-span-1 md:col-span-2 xl:col-span-2 rounded-lg shadow-sm border-slate-200 bg-white p-5 flex flex-col justify-between ${cardHoverEffect}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-bold text-slate-800">Employee Attendance Rates</span>
                <span className="text-[10px] bg-slate-50 border border-slate-150 px-2 py-0.5 rounded text-slate-500 flex items-center gap-1 font-semibold">
                  This Month <ChevronDown className="w-3 h-3" />
                </span>
              </div>
              
              <div className="h-[95px] w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
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

              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7B0099]"></div>
                <span className="text-[9px] font-bold text-slate-400">
                  Showing all staff in your {role === 'branch_leader' ? 'branch' : 'department'}
                </span>
              </div>
            </Card>
          ) : (
            <Card className={`col-span-1 md:col-span-2 xl:col-span-2 rounded-lg shadow-sm border-slate-200 bg-white p-5 flex flex-col justify-between ${cardHoverEffect}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-bold text-slate-800">Employees By Department</span>
                <span className="text-[10px] bg-slate-50 border border-slate-150 px-2 py-0.5 rounded text-slate-500 flex items-center gap-1 font-semibold">
                  This Month <ChevronDown className="w-3 h-3" />
                </span>
              </div>
              
              <div className="h-[95px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={departmentChartData} 
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                  >
                    <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} content={<CustomDeptTooltip />} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} 
                      axisLine={false} 
                      tickLine={false} 
                      width={130}
                    />
                    <Bar dataKey="value" fill="#ff5b37" radius={[0, 4, 4, 0]} barSize={6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff5b37]"></div>
                <span className="text-[9px] font-bold text-slate-400">
                  No of Employees increased by <span className="text-emerald-500">+20%</span> from last Month
                </span>
              </div>
            </Card>
          )}

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* 2. Attendance Overview */}
          <Card className={`col-span-1 lg:col-span-2 rounded-lg shadow-sm border-slate-200 bg-white flex flex-col ${cardHoverEffect}`}>
            <CardHeader className="p-5 border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-bold text-slate-800">Attendance Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">Average Attendance</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{data.attendanceOverview.averageAttendance}%</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">Late Arrivals</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{data.attendanceOverview.lateArrivals}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">Absences</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{data.attendanceOverview.absences}</p>
                </div>
              </div>
              <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.attendanceOverview.monthlyTrend} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} domain={[80, 100]} />
                    <RechartsTooltip contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                    <Line type="monotone" dataKey="rate" name="Attendance Rate (%)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className={`col-span-1 rounded-lg shadow-sm border-slate-200 bg-white flex flex-col ${cardHoverEffect}`}>
            <CardHeader className="p-4 border-b border-slate-100 pb-3">
              <div className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">Team Availability</CardTitle>
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
                      paddingAngle={2}
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
                  <span className="text-2xl font-bold text-slate-800 tracking-tight leading-none">{availabilityRate}%</span>
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

              {/* 4-Shape Compact Legend */}
              <div className="grid grid-cols-4 gap-2 w-full mt-auto mb-4">
                {donutData.map((entry, index) => (
                  <div key={entry.name} className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border ${index === 0 ? 'bg-indigo-50/70 border-indigo-100' : 'bg-slate-50 border-slate-100'} transition-colors`}>
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[40px] sm:max-w-[50px]">{entry.name}</span>
                    </div>
                    <span className="text-lg font-bold text-slate-800 leading-none">{entry.value}</span>
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
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3. Leave Monitoring */}
          <Card className={`col-span-1 rounded-lg shadow-sm border-slate-200 bg-white ${cardHoverEffect}`}>
            <CardHeader className="p-5 border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-bold text-slate-800">Leave Monitoring</CardTitle>
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
                      <p className="text-sm font-bold text-slate-800 group-hover:text-[#7B0099] transition-colors">Pending Requests</p>
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
                      <p className="text-sm font-bold text-slate-800 group-hover:text-[#7B0099] transition-colors">Approved Leave</p>
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
                      <p className="text-sm font-bold text-slate-800 group-hover:text-[#7B0099] transition-colors">Staff on Leave</p>
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

          {/* 6. Employee Performance Attendance Ranking */}
          <Card className={`col-span-1 lg:col-span-2 rounded-lg shadow-sm border-slate-200 bg-white ${cardHoverEffect}`}>
            <CardHeader className="p-5 border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-bold text-slate-800">Employee Performance & Attendance</CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Top Attendance Performers
                </h4>
                <div className="space-y-3">
                  {data.performance.topAttendance.length > 0 ? data.performance.topAttendance.map((emp: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-slate-800">{emp.name}</span>
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
                    <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-red-50 flex items-center justify-center text-xs font-bold text-red-600">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-slate-800">{emp.name}</span>
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
          <Card className={`rounded-lg shadow-sm border-slate-200 bg-white flex flex-col p-4 ${cardHoverEffect}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">Clock-In/Out</h3>
                {feedConnected
                  ? <span className="flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE</span>
                  : <span className="text-[8px] text-slate-400 font-bold uppercase">Connectingâ€¦</span>}
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 border border-slate-200 rounded text-slate-500 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> {displayDate}
              </span>
            </div>

            {/* allClockIns = on-time + late merged, sorted by clock_in */}
            {(() => {
              const allClockIns = [...clockInOut, ...lateList].sort((a, b) =>
                (a.clock_in || '').localeCompare(b.clock_in || '')
              );
              return (
                <div className="flex-1 space-y-2 max-h-[260px] overflow-y-auto pr-0.5">
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
                    <div key={emp.user_id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${getAvatarColor(emp.full_name)}`}>
                          {emp.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">{emp.full_name}</p>
                            {emp.is_late && (
                              <span className="px-1 py-0.5 text-[8px] font-bold rounded bg-orange-100 text-orange-600 border border-orange-200">Late</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">{emp.department !== 'â€”' ? emp.department : emp.branch}</p>
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
              className="w-full mt-4 h-9 bg-white hover:bg-slate-50 text-slate-700 font-semibold border-slate-200"
            >
              View All Attendance
            </Button>
          </Card>

          {/* Card 2: Late â€” LIVE SSE */}
          <Card className={`rounded-lg shadow-sm border-slate-200 bg-white flex flex-col p-4 ${cardHoverEffect}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">Late</h3>
                {feedConnected
                  ? <span className="flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE</span>
                  : <span className="text-[8px] text-slate-400 font-bold uppercase">Connectingâ€¦</span>}
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 border border-slate-200 rounded text-slate-500 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> {displayDate}
              </span>
            </div>

            <div className="flex-1 space-y-2 max-h-[260px] overflow-y-auto pr-0.5">
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
                <div key={emp.user_id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${getAvatarColor(emp.full_name)}`}>
                      {emp.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">{emp.full_name}</p>
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
              className="w-full mt-4 h-9 bg-white hover:bg-slate-50 text-slate-700 font-semibold border-slate-200"
            >
              View All Attendance
            </Button>
          </Card>

          {/* Card 3: Absent â€” LIVE SSE */}
          <Card className={`rounded-lg shadow-sm border-slate-200 bg-white flex flex-col p-4 ${cardHoverEffect}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">Absent</h3>
                {feedConnected
                  ? <span className="flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE</span>
                  : <span className="text-[8px] text-slate-400 font-bold uppercase">Connectingâ€¦</span>}
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 border border-slate-200 rounded text-slate-500 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> {displayDate}
              </span>
            </div>

            <div className="flex-1 space-y-2 max-h-[260px] overflow-y-auto pr-0.5">
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
                <div key={emp.user_id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${getAvatarColor(emp.full_name)}`}>
                      {emp.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">{emp.full_name}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">{emp.department !== 'â€”' ? emp.department : emp.branch}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-500 text-white">Absent</span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => navigate('/hr-analytics/attendance#employee-absenteeism')}
              className="w-full mt-4 h-9 bg-white hover:bg-slate-50 text-slate-700 font-semibold border-slate-200"
            >
              View All Attendance
            </Button>
          </Card>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

          {/* Card 4: Pending Approvals â€” LIVE SSE */}
          <Card className={`rounded-lg shadow-sm border-slate-200 bg-white flex flex-col p-4 ${cardHoverEffect}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">Pending Approvals</h3>
                {pendingApprovalsList.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[8px] font-black bg-amber-500 text-white rounded">{pendingApprovalsList.length}</span>
                )}
              </div>
              <Button
                onClick={() => navigate("/leave/admin?tab=pending")}
                variant="outline"
                className="h-7 px-2.5 text-[10px] font-bold border-slate-200 bg-white text-slate-600 rounded"
              >
                View All
              </Button>
            </div>

            <div className="flex-1 space-y-3 max-h-[300px] overflow-y-auto pr-0.5">
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
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-all gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0 mt-0.5 ${getAvatarColor(item.name)}`}>
                        {item.initials}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 leading-tight">{item.name}</p>
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

          {/* Card 4: Upcoming Outstation */}
          <Card className={`rounded-lg shadow-sm border-slate-200 bg-white flex flex-col p-4 ${cardHoverEffect}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-sm font-bold text-slate-800">Upcoming Outstation</h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 border border-slate-150 rounded text-slate-505 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> {displayDate}
              </span>
            </div>
            
            <div className="flex-1 space-y-4">
              {/* Kuala Lumpur Site Visit */}
              <div className="border-l-4 border-orange-500 pl-3 py-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Kuala Lumpur Site Visit</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">12:00 PM - 01:50 PM</p>
                  </div>
                  <div className="flex -space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-slate-200 border border-white text-[8px] font-bold flex items-center justify-center">A</div>
                    <div className="w-5 h-5 rounded-full bg-slate-300 border border-white text-[8px] font-bold flex items-center justify-center">B</div>
                    <div className="w-5 h-5 rounded-full bg-slate-400 border border-white text-[8px] font-bold flex items-center justify-center">C</div>
                    <div className="w-5 h-5 rounded-full bg-indigo-500 border border-white text-[8px] font-bold text-white flex items-center justify-center">+9</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-7 px-2.5 text-[10px] font-bold border-slate-200 bg-white text-slate-600 rounded flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Add to Calendar
                  </Button>
                  <Button variant="outline" className="h-7 px-2.5 text-[10px] font-bold border-slate-200 bg-white text-slate-600 rounded">
                    Join Now
                  </Button>
                </div>
              </div>

              {/* Penang Branch Audit */}
              <div className="border-l-4 border-cyan-500 pl-3 py-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Penang Branch Audit</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">03:00 PM - 04:00 PM</p>
                  </div>
                  <div className="flex -space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-slate-200 border border-white text-[8px] font-bold flex items-center justify-center">X</div>
                    <div className="w-5 h-5 rounded-full bg-slate-300 border border-white text-[8px] font-bold flex items-center justify-center">Y</div>
                    <div className="w-5 h-5 rounded-full bg-indigo-500 border border-white text-[8px] font-bold text-white flex items-center justify-center">+4</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-7 px-2.5 text-[10px] font-bold border-slate-200 bg-white text-slate-600 rounded flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Add to Calendar
                  </Button>
                  <Button variant="outline" className="h-7 px-2.5 text-[10px] font-bold border-slate-200 bg-white text-slate-600 rounded">
                    Join Now
                  </Button>
                </div>
              </div>
            </div>
            
            <button className="text-xs font-semibold text-[#7B0099] hover:text-[#5c0073] text-center mt-4 flex items-center justify-center gap-1 w-full pt-2 border-t border-slate-100">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Card>

          </div>
          </>
        )}
          </>
        ) : (
          <MonthViewDashboard data={data} />
        )}
      </div>
  );
}
function MonthViewDashboard({ data, clockInOut, lateList, absentList, pendingApprovalsList, feedConnected }: any) {
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

  const departmentMetrics = data.departmentMetrics || [];
  const topDepartments = [...departmentMetrics].sort((a:any,b:any)=>b.value-a.value).slice(0, 5);

  const attendanceTrend = data.attendanceOverview?.monthlyTrend || [];

  const leaveUtil = topKpi.leaveUtilization || Math.round(((leave.annual || 0) + (leave.medical || 0) + (leave.emergency || 0)) / 2) || 68;
  const totalLeaveEmployees = (leave.annual || 0) + (leave.medical || 0) + (leave.emergency || 0) + (leave.unpaid || 0);

  const leaveData = [
    { name: 'Annual', value: leave.annual || 0, color: '#10b981' }, // emerald-500
    { name: 'Medical', value: leave.medical || 0, color: '#f43f5e' }, // rose-500
    { name: 'Emergency', value: leave.emergency || 0, color: '#f59e0b' }, // amber-500
    { name: 'Unpaid', value: leave.unpaid || 0, color: '#64748b' } // slate-500
  ].filter(d => d.value > 0);
  
  // mock total count if not present
  const totalLeaveCount = totalLeaveEmployees || 18; 

  return (
    <div className="space-y-8">
       {/* PRIMARY SECTION */}
       <div>
         <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Primary</h2>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 flex items-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default bg-white rounded-[12px] group">
               <div className="w-12 h-12 rounded-xl bg-[#F0F4FA] text-[#3B66A7] flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                 <Users className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-[#8C98A4] font-bold uppercase tracking-widest mb-0.5">Total Headcount</p>
                 <h3 className="text-2xl font-black text-[#1A1F36]">{topKpi.totalHeadcount || 0}</h3>
               </div>
            </Card>
            <Card className="p-4 flex items-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default bg-white rounded-[12px] group">
               <div className="w-12 h-12 rounded-xl bg-[#EEF8F4] text-[#10B981] flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                 <UserCheck className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-[#8C98A4] font-bold uppercase tracking-widest mb-0.5">Active Employees</p>
                 <h3 className="text-2xl font-black text-[#1A1F36]">{topKpi.activeEmployees || 0}</h3>
               </div>
            </Card>
            <Card className="p-4 flex items-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default bg-white rounded-[12px] group relative">
               {feedConnected && <span className="absolute top-3 right-3 flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE</span>}
               <div className="w-12 h-12 rounded-xl bg-[#F0F2FB] text-[#6366F1] flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                 <CheckCircle2 className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-[#8C98A4] font-bold uppercase tracking-widest mb-0.5">Attendance Rate</p>
                 <h3 className="text-2xl font-black text-[#1A1F36]">{topKpi.attendanceRate || 0}%</h3>
               </div>
            </Card>
            <Card className="p-4 flex items-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default bg-white rounded-[12px] group">
               <div className="w-12 h-12 rounded-xl bg-[#FFF5EE] text-[#F59E0B] flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                 <CalendarDays className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[10px] text-[#8C98A4] font-bold uppercase tracking-widest mb-0.5">On Leave Today</p>
                 <h3 className="text-2xl font-black text-[#1A1F36]">{topKpi.onLeaveToday || 0}</h3>
               </div>
            </Card>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card className="p-5 shadow-sm border-slate-200 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col">
             <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-2">
                 <TrendingUp className="w-4 h-4 text-slate-400" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">Attendance Trend</h3>
               </div>
             </div>
             <div className="h-[250px] w-full flex-1">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={attendanceTrend} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                   <defs>
                     <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                   <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                   <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={['auto', 100]} />
                   <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }} />
                   <Area type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRate)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} name="Attendance %" />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
             <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
               <button className="text-xs font-bold text-slate-500 hover:text-[#7B0099] transition-colors flex items-center gap-1">View Details <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>
           
           <Card className="p-5 shadow-sm border-slate-200 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col">
             <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-2">
                 <FileCheck className="w-4 h-4 text-slate-400" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">Monthly Comparison</h3>
               </div>
             </div>
             <div className="overflow-x-auto flex-1">
               <table className="w-full text-sm text-left">
                 <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase">
                   <tr>
                     <th className="px-4 py-3 font-semibold">Metric</th>
                     <th className="px-4 py-3 font-semibold text-right">This Month</th>
                     <th className="px-4 py-3 font-semibold text-right">Last Month</th>
                     <th className="px-4 py-3 font-semibold text-right">Change</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {[
                     { label: 'Attendance Rate', cur: `${monthlyComp.attendance?.current || 0}%`, prev: `${monthlyComp.attendance?.previous || 0}%`, diff: (monthlyComp.attendance?.current || 0) - (monthlyComp.attendance?.previous || 0) },
                     { label: 'Late Arrivals', cur: monthlyComp.lateArrivals?.current || 0, prev: monthlyComp.lateArrivals?.previous || 0, diff: (monthlyComp.lateArrivals?.current || 0) - (monthlyComp.lateArrivals?.previous || 0), invert: true },
                     { label: 'Absences', cur: monthlyComp.absences?.current || 0, prev: monthlyComp.absences?.previous || 0, diff: (monthlyComp.absences?.current || 0) - (monthlyComp.absences?.previous || 0), invert: true },
                     { label: 'Leave Requests', cur: monthlyComp.leaveRequests?.current || 0, prev: monthlyComp.leaveRequests?.previous || 0, diff: (monthlyComp.leaveRequests?.current || 0) - (monthlyComp.leaveRequests?.previous || 0), invert: true },
                     { label: 'Outstation Trips', cur: monthlyComp.outstation?.current || 0, prev: monthlyComp.outstation?.previous || 0, diff: (monthlyComp.outstation?.current || 0) - (monthlyComp.outstation?.previous || 0) },
                   ].map((row, idx) => {
                     let isPositive = row.diff > 0;
                     if (row.invert) isPositive = row.diff < 0;
                     const isNeutral = row.diff === 0;
                     const diffFormatted = Math.abs(row.diff).toFixed(row.label.includes('Rate') ? 1 : 0);
                     return (
                       <tr key={idx} className="hover:bg-slate-50 transition-colors">
                         <td className="px-4 py-3 font-medium text-slate-800">{row.label}</td>
                         <td className="px-4 py-3 text-slate-600 font-semibold text-right">{row.cur}</td>
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
             <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
               <button className="text-xs font-bold text-slate-500 hover:text-[#7B0099] transition-colors flex items-center gap-1">Open Report <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>
         </div>
       </div>

       {/* SECONDARY SECTION */}
       <div>
         <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Workforce Analytics</h2>
         
         {/* Row 1: 2 Columns */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
           {/* Department Workforce Distribution */}
           <Card className="p-4 shadow-sm border-slate-200 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col">
             <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-2">
                 <Building2 className="w-4 h-4 text-slate-400" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">Department Workforce Distribution</h3>
               </div>
               <div className="text-[10px] font-bold border border-slate-200 rounded px-2 py-1 flex items-center gap-1 text-slate-500 cursor-pointer hover:bg-slate-50">
                 This Month <ChevronDown className="w-3 h-3" />
               </div>
             </div>
             
             <div className="space-y-4 flex-1">
               {topDepartments.map((dept: any, idx: number) => {
                 const maxVal = Math.max(...departmentMetrics.map((d:any)=>d.value));
                 const widthPercent = maxVal > 0 ? (dept.value / maxVal) * 100 : 0;
                 return (
                   <div key={idx} className="flex items-center gap-3">
                     <div className="w-1/3 text-right">
                       <p className="text-[10px] font-bold text-[#3B66A7] truncate" title={dept.name}>{dept.name}</p>
                     </div>
                     <div className="flex-1 relative group flex items-center">
                       <div className="h-2 rounded-full bg-[#FF5722] transition-all duration-300 cursor-pointer" style={{ width: `${Math.max(2, widthPercent)}%` }}></div>
                       <div className="absolute left-1/2 -top-8 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 shadow-xl rounded p-1.5 pointer-events-none z-10 w-max whitespace-nowrap">
                         <p className="text-[9px] font-bold text-slate-800 mb-0.5">{dept.name}</p>
                         <p className="text-[9px] text-slate-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#FF5722]"></span> Employee: <span className="font-bold">{dept.value}</span></p>
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
             
             <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
               <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722]"></span>
                 HQ operations represent {(departmentMetrics.reduce((sum:number,d:any)=>sum+d.value,0)/topKpi.totalHeadcount*100 || 0).toFixed(0)}% of workforce
               </p>
               <button className="text-xs font-bold text-slate-500 hover:text-[#7B0099] transition-colors flex items-center gap-1">View All <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>

           {/* Branch Workforce Distribution */}
           <Card className="p-4 shadow-sm border-slate-200 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col">
             <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-2">
                 <MapPin className="w-4 h-4 text-slate-400" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">Branch Workforce Distribution</h3>
               </div>
               <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                 <SelectTrigger className="w-[120px] h-7 text-[10px] font-bold border-slate-200 bg-white shadow-none focus:ring-0">
                   <SelectValue placeholder="All Regions" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="All Regions" className="text-[10px] font-bold">All Regions</SelectItem>
                   {regionOrder.map(r => <SelectItem key={r} value={r} className="text-[10px] font-bold">{r}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
             
             <div className={`space-y-4 flex-1 pr-2 ${filteredBranches.length > 5 ? 'overflow-y-auto max-h-[220px]' : 'overflow-y-visible'}`}>
               {filteredBranches.sort((a:any,b:any)=>b.attendanceRate-a.attendanceRate).map((branch: any, idx: number) => {
                 return (
                   <div key={idx} className="flex flex-col gap-1">
                     <div className="flex justify-between items-end">
                       <div className="flex flex-col">
                         <span className="text-[11px] font-bold text-[#1A1F36]">{branch.name}</span>
                         <span className="text-[9px] text-slate-400">{branch.count} Employees</span>
                       </div>
                       <span className={`text-[10px] font-black ${branch.attendanceRate >= 95 ? 'text-emerald-500' : 'text-amber-500'}`}>{branch.attendanceRate}%</span>
                     </div>
                     <div className="w-full bg-slate-100 rounded-full h-2 relative group cursor-pointer">
                       <div className={`h-2 rounded-full ${branch.attendanceRate >= 95 ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`} style={{ width: `${Math.min(100, branch.attendanceRate)}%` }}></div>
                       <div className="absolute left-1/2 -top-8 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 shadow-xl rounded p-1.5 pointer-events-none z-10 w-max whitespace-nowrap">
                         <p className="text-[9px] font-bold text-slate-800 mb-0.5">{branch.name}</p>
                         <p className="text-[9px] text-slate-600">Present: <span className="font-bold text-emerald-600">{Math.floor(branch.count * (branch.attendanceRate/100))}</span> | Late: <span className="font-bold text-amber-500">{branch.count - Math.floor(branch.count * (branch.attendanceRate/100))}</span></p>
                       </div>
                     </div>
                   </div>
                 );
               })}
               {filteredBranches.length === 0 && (
                 <div className="text-center text-slate-400 text-xs py-10 font-medium">No branches found in this region.</div>
               )}
             </div>

             <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
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
           <Card className="p-4 shadow-sm border-slate-200 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col">
             <div className="flex justify-between items-center mb-2">
               <div className="flex items-center gap-2">
                 <FileText className="w-4 h-4 text-slate-400" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">Leave Distribution</h3>
               </div>
             </div>
             
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
                       {leaveData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} />
                       ))}
                     </Pie>
                   </PieChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                   <span className="text-lg font-black text-slate-800 leading-none">{totalLeaveCount}</span>
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
                     <span className="text-[10px] font-black text-slate-800">{entry.value}%</span>
                   </div>
                 ))}
               </div>
             </div>

             <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
               <button className="text-xs font-bold text-slate-500 hover:text-[#7B0099] transition-colors flex items-center gap-1">View Details <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>

           {/* Travel & Outstation Summary */}
           <Card className="p-4 shadow-sm border-slate-200 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col">
             <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-2">
                 <Plane className="w-4 h-4 text-slate-400" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">Travel & Outstation Summary</h3>
               </div>
             </div>
             
             <div className="grid grid-cols-3 gap-2 mb-6">
               <div className="flex flex-col items-center">
                 <span className="text-2xl font-black text-[#1A1F36]">{outstation.completed || 0}</span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Completed</span>
               </div>
               <div className="flex flex-col items-center">
                 <span className="text-2xl font-black text-[#1A1F36]">{outstation.upcoming || 0}</span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Upcoming</span>
               </div>
               <div className="flex flex-col items-center">
                 <span className="text-2xl font-black text-[#1A1F36]">{outstation.cancelled || 0}</span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cancelled</span>
               </div>
             </div>
             
             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Popular Routes</p>
             <div className="space-y-3 flex-1 overflow-y-auto">
               {(outstation.popularRoutes || []).map((r: any, i: number) => {
                 const maxTrips = Math.max(...(outstation.popularRoutes||[]).map((pr:any)=>pr.trips));
                 const w = maxTrips > 0 ? (r.trips / maxTrips) * 100 : 0;
                 return (
                   <div key={i} className="flex items-center gap-3">
                     <div className="w-1/3 text-right">
                       <span className="text-[10px] font-bold text-[#3B66A7] truncate block" title={r.route}>{r.route}</span>
                     </div>
                     <div className="flex-1 flex items-center gap-2 relative group cursor-pointer">
                       <div className="h-1.5 bg-[#DBEAFE] rounded-full group-hover:bg-blue-300 transition-colors" style={{ width: `${Math.max(10, w)}%` }}></div>
                       <span className="text-[10px] font-bold text-slate-700">{r.trips}</span>
                     </div>
                   </div>
                 );
               })}
             </div>

             <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
               <button className="text-xs font-bold text-slate-500 hover:text-[#7B0099] transition-colors flex items-center gap-1">Explore <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>

           {/* Workforce Movement */}
           <Card className="p-4 shadow-sm border-slate-200 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col">
             <div className="flex justify-between items-center mb-4">
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
               <div className="flex flex-col justify-center items-center py-2 bg-[#F8FAFC] rounded-xl border border-slate-200 text-center">
                 <span className="text-xl font-black text-slate-700 mb-0.5">{movement.transferred || 0}</span>
                 <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Transferred</p>
               </div>
               <div className="flex flex-col justify-center items-center py-2 bg-[#F3E8FF] rounded-xl border border-purple-200 text-center">
                 <span className="text-xl font-black text-purple-700 mb-0.5">{movement.promotions || 0}</span>
                 <p className="text-[9px] font-bold text-purple-500 uppercase tracking-wider">Promotions</p>
               </div>
             </div>

             <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
               <button className="text-xs font-bold text-slate-500 hover:text-[#7B0099] transition-colors flex items-center gap-1">Open Report <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>
         </div>
       </div>

       {/* SUPPORTING SECTION */}
       <div>
         <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Notices</h2>
         <div className="grid grid-cols-1 gap-6">
           <Card className="p-4 shadow-sm border-l-4 border-l-[#7B0099] border-y-slate-200 border-r-slate-200 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 flex flex-col">
             <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-2">
                 <AlertCircle className="w-4 h-4 text-[#7B0099]" />
                 <h3 className="text-sm font-bold text-[#1A1F36]">HR Alerts</h3>
               </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
               {hrAlerts.map((alert: any, i: number) => {
                 let bgColor = 'bg-slate-50';
                 let borderColor = 'border-slate-200';
                 let iconColor = 'text-slate-500';
                 let titleColor = 'text-slate-800';
                 
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

             <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
               <button className="text-xs font-bold text-slate-500 hover:text-[#7B0099] transition-colors flex items-center gap-1">See All <ChevronRight className="w-3 h-3" /></button>
             </div>
           </Card>
         </div>
       </div>
    </div>
  )
}






