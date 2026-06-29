import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportToCSV } from "@/utils/export";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, UserCheck, CalendarDays, Clock, FileCheck, CheckCircle2, XCircle, AlertTriangle, Building2, Download, ChevronRight, ChevronDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Sector } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const COLORS = ['#4f46e5', '#eab308', '#94a3b8', '#DC2626']; // Present, Late, On Leave, Absent



const cardHoverEffect = "transition-all duration-300 hover:shadow-[0_0_15px_rgba(123,0,153,0.15)] hover:border-[#7B0099]/30 hover:-translate-y-0.5";

export default function WorkforceInsights() {
  const { role, userBranch, userDepartment } = useRole();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [pendingApprovalsList, setPendingApprovalsList] = useState([
    { id: 1, name: "Hendrita Merkel", initials: "HM", dates: "Jan 10 - Jan 16", days: "4 days", reason: "Family trip", avatarColor: "bg-purple-150 text-purple-700 bg-purple-100" },
    { id: 2, name: "Michael Brown", initials: "MB", dates: "Jan 3 - Jan 9", days: "2 days", reason: "Medical appointment", avatarColor: "bg-blue-100 text-blue-700" },
    { id: 3, name: "Daniel Martinez", initials: "DM", dates: "Jan 17 - Jan 23", days: "2 days", reason: "Personal Work", avatarColor: "bg-emerald-100 text-emerald-700" }
  ]);

  const handleApproveLeave = (id: number, name: string) => {
    setPendingApprovalsList(prev => prev.filter(item => item.id !== id));
  };

  const handleDeclineLeave = (id: number, name: string) => {
    setPendingApprovalsList(prev => prev.filter(item => item.id !== id));
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

  useEffect(() => { fetchInsights(); }, [role, userBranch, userDepartment, month, year]);

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
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
        
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-end w-full gap-3 pb-2 pt-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[120px] rounded-md h-9 text-sm">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({length: 12}, (_, i) => {
                  const m = (i + 1).toString().padStart(2, '0');
                  return <SelectItem key={m} value={m}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</SelectItem>
                })}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px] rounded-md h-9 text-sm">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <ExportDropdown 
              onExportCSV={() => exportToCSV(data.departmentMetrics || [], 'Workforce_Insights')} 
              onExportPDF={() => window.print()} 
            />
        </div>

        {/* Redesigned Top Section: 5-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-6">
          
          {/* Column 1: Attendance Overview */}
          <Card className={`col-span-1 xl:col-span-1 rounded-xl shadow-sm border-slate-200 bg-white flex flex-col p-6 justify-between ${cardHoverEffect}`}>
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
            <Card className={`rounded-xl shadow-sm border-slate-200 bg-white flex ${cardHoverEffect}`}>
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
            <Card className={`rounded-xl shadow-sm border-slate-200 bg-white flex ${cardHoverEffect}`}>
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
            <Card className={`rounded-xl shadow-sm border-slate-200 bg-white flex ${cardHoverEffect}`}>
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
            <Card className={`rounded-xl shadow-sm border-slate-200 bg-white flex ${cardHoverEffect}`}>
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

          {/* Column 3: Employees By Department */}
          <Card className={`col-span-1 md:col-span-2 xl:col-span-2 rounded-xl shadow-sm border-slate-200 bg-white p-5 flex flex-col justify-between ${cardHoverEffect}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-bold text-slate-800">Employees By Department</span>
              <span className="text-[10px] bg-slate-50 border border-slate-150 px-2 py-0.5 rounded text-slate-500 flex items-center gap-1 font-semibold">
                This Month <ChevronDown className="w-3 h-3" />
              </span>
            </div>
            
            <div className="h-[95px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={data.departmentMetrics && data.departmentMetrics.length > 0 ? data.departmentMetrics : [
                    { name: 'BHU', value: 4 },
                    { name: 'Media', value: 1 },
                    { name: 'IT', value: 1 },
                    { name: 'Unassigned', value: 11 }
                  ]} 
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
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

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* 2. Attendance Overview */}
          <Card className={`col-span-1 lg:col-span-2 rounded-lg shadow-sm border-slate-200 flex flex-col ${cardHoverEffect}`}>
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

          <Card className={`col-span-1 rounded-lg shadow-sm border-slate-200 flex flex-col ${cardHoverEffect}`}>
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
          <Card className={`col-span-1 rounded-lg shadow-sm border-slate-200 ${cardHoverEffect}`}>
            <CardHeader className="p-5 border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-bold text-slate-800">Leave Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3">
                <div 
                  onClick={() => navigate("/leave/admin?tab=pending")}
                  className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-[#7B0099]/5 border border-transparent hover:border-[#7B0099]/20 rounded-xl transition-all duration-300 cursor-pointer group"
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
                  className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-[#7B0099]/5 border border-transparent hover:border-[#7B0099]/20 rounded-xl transition-all duration-300 cursor-pointer group"
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
                  className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-[#7B0099]/5 border border-transparent hover:border-[#7B0099]/20 rounded-xl transition-all duration-300 cursor-pointer group"
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
          <Card className={`col-span-1 lg:col-span-2 rounded-lg shadow-sm border-slate-200 ${cardHoverEffect}`}>
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

        {/* NEW BOTTOM SECTION: 4 KPI CARDS */}
        {["hr_admin", "managing_director", "finance_manager"].includes(role || "") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          
          {/* Card 1: Clock-In/Out */}
          <Card className={`rounded-xl shadow-sm border-slate-200 bg-white flex flex-col p-4 ${cardHoverEffect}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-sm font-bold text-slate-800">Clock-In/Out</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">All Departments</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 border border-slate-150 rounded text-slate-505 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> Today
                </span>
              </div>
            </div>
            
            <div className="flex-1 space-y-3">
              {/* Daniel Esbella */}
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                    DE
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Daniel Esbella</p>
                    <p className="text-[10px] text-slate-400 font-medium">UI/UX Designer</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500 text-white">09:15</span>
                </div>
              </div>

              {/* Doglas Martini */}
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                    DM
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Doglas Martini</p>
                    <p className="text-[10px] text-slate-400 font-medium">Project Manager</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500 text-white">09:36</span>
                </div>
              </div>

              {/* Brian Villalobos (Expanded) */}
              <div className="p-2 bg-slate-50/50 border border-slate-100 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                      BV
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Brian Villalobos</p>
                      <p className="text-[10px] text-slate-400 font-medium">PHP Developer</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500 text-white">09:15</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[9px] font-medium text-slate-500">
                  <div>
                    <span className="flex items-center gap-1 text-slate-400 mb-0.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Clock In</span>
                    <span className="font-bold text-slate-700 text-xs">10:30 AM</span>
                  </div>
                  <div>
                    <span className="flex items-center gap-1 text-slate-400 mb-0.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Clock Out</span>
                    <span className="font-bold text-slate-700 text-xs">09:45 AM</span>
                  </div>
                  <div>
                    <span className="flex items-center gap-1 text-slate-400 mb-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Production</span>
                    <span className="font-bold text-slate-700 text-xs">09:21 Hrs</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Button variant="outline" className="w-full mt-4 h-9 bg-white hover:bg-slate-50 text-slate-700 font-semibold border-slate-200">
              View All Attendance
            </Button>
          </Card>

          {/* Card 2: Late */}
          <Card className={`rounded-xl shadow-sm border-slate-200 bg-white flex flex-col p-4 ${cardHoverEffect}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-sm font-bold text-slate-800">Late</h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 border border-slate-150 rounded text-slate-500 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Today
              </span>
            </div>
            
            <div className="flex-1 space-y-3">
              {/* Anthony Lewis */}
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                    AL
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-800">Anthony Lewis</p>
                      <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-red-500 text-white">30 Min</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Marketing Head</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500 text-white">08:35</span>
                </div>
              </div>

              {/* Nathirah Rahman */}
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                    NR
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-800">Nathirah Rahman</p>
                      <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-red-500 text-white">15 Min</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">HR Admin</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500 text-white">09:15</span>
                </div>
              </div>

              {/* Ahmad Faiz */}
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                    AF
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-800">Ahmad Faiz</p>
                      <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-red-500 text-white">119 Min</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Branch Leader</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500 text-white">11:59</span>
                </div>
              </div>
            </div>
            
            <Button variant="outline" className="w-full mt-4 h-9 bg-white hover:bg-slate-50 text-slate-700 font-semibold border-slate-200">
              View All Attendance
            </Button>
          </Card>

          {/* Card 3: Pending Approvals */}
          <Card className={`rounded-xl shadow-sm border-slate-200 bg-white flex flex-col p-4 ${cardHoverEffect}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-sm font-bold text-slate-800">Pending Approvals</h3>
              <Button 
                onClick={() => navigate("/leave/admin?tab=pending")}
                variant="outline" 
                className="h-7 px-2.5 text-[10px] font-bold border-slate-200 bg-white text-slate-600 rounded"
              >
                View All
              </Button>
            </div>
            
            <div className="flex-1 space-y-3">
              {pendingApprovalsList.length > 0 ? (
                pendingApprovalsList.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-full ${item.avatarColor} flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0 mt-0.5`}>
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
                        onClick={() => handleApproveLeave(item.id, item.name)}
                        className="px-3 py-1 text-[10px] font-bold rounded bg-[#ff5b37] hover:bg-[#e04f2e] text-white transition-colors"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleDeclineLeave(item.id, item.name)}
                        className="px-3 py-1 text-[10px] font-bold rounded border border-[#ff5b37] text-[#ff5b37] hover:bg-[#ff5b37]/5 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-60 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wider">All caught up!</p>
                  <p className="text-[10px] mt-0.5">No pending approvals remaining.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Card 4: Upcoming Outstation */}
          <Card className={`rounded-xl shadow-sm border-slate-200 bg-white flex flex-col p-4 ${cardHoverEffect}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-sm font-bold text-slate-800">Upcoming Outstation</h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 border border-slate-150 rounded text-slate-505 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Today
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
        )}
      </div>
  );
}
