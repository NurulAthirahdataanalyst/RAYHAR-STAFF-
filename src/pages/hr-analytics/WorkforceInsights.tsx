import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, UserCheck, CalendarDays, Clock, FileCheck, CheckCircle2, XCircle, AlertTriangle, Building2, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Sector } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6']; // Present, On Leave, Absent, Late

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 20) * cos;
  const my = cy + (outerRadius + 20) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#334155" className="text-xl font-bold">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#334155" className="text-sm font-semibold">{`${value}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#64748b" className="text-xs">
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

export default function WorkforceInsights() {
  const { role, userBranch, userDepartment } = useRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [activeIndex, setActiveIndex] = useState(0);

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

  const donutData = [
    { name: 'Present', value: data.teamAvailability.present },
    { name: 'On Leave', value: data.teamAvailability.onLeave },
    { name: 'Absent', value: data.teamAvailability.absent },
    { name: 'Late', value: data.teamAvailability.late },
  ].filter(d => d.value >= 0); // Keep 0 values to show the legend

  const onPieEnter = (_: any, index: number) => setActiveIndex(index);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Workforce Insights</h1>
            <p className="text-sm text-slate-500">{role === 'head_of_department' ? userDepartment : 'Enterprise Overview'}</p>
          </div>
          <div className="flex items-center gap-3">
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
            <Select>
              <SelectTrigger className="w-[110px] rounded-md h-9 text-sm bg-primary text-primary-foreground border-none font-medium">
                <Download className="w-4 h-4 mr-2" /> Export
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Report</SelectItem>
                <SelectItem value="excel">Excel Data</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 1. Team Overview (Top KPI Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="rounded-lg shadow-sm border-slate-200">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Headcount</p>
                <h3 className="text-2xl font-bold text-slate-800 leading-tight mt-1">{data.topKpi.totalHeadcount}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-sm border-slate-200">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-emerald-50 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Employees</p>
                <h3 className="text-2xl font-bold text-slate-800 leading-tight mt-1">{data.topKpi.activeEmployees}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-sm border-slate-200">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-indigo-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Rate</p>
                <h3 className="text-2xl font-bold text-slate-800 leading-tight mt-1">{data.topKpi.attendanceRate}%</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-sm border-slate-200">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-orange-50 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">On Leave Today</p>
                <h3 className="text-2xl font-bold text-slate-800 leading-tight mt-1">{data.topKpi.onLeaveToday}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* 2. Attendance Overview */}
          <Card className="col-span-1 lg:col-span-2 rounded-lg shadow-sm border-slate-200 flex flex-col">
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

          {/* 5. Team Availability Dashboard */}
          <Card className="col-span-1 rounded-lg shadow-sm border-slate-200 flex flex-col">
            <CardHeader className="p-5 border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-800">Team Availability (Today)</CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col items-center justify-center relative">
              <div className="w-full h-[250px] mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      onMouseEnter={onPieEnter}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full mt-auto grid grid-cols-2 gap-2">
                {donutData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded border border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-slate-600 font-medium">{entry.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3. Leave Monitoring */}
          <Card className="col-span-1 rounded-lg shadow-sm border-slate-200">
            <CardHeader className="p-5 border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-bold text-slate-800">Leave Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-yellow-50 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Pending Requests</p>
                      <p className="text-xs text-slate-500">Awaiting Approval</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-slate-800">{data.leaveMonitoring.pendingApproval}</span>
                </div>
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Approved Leave</p>
                      <p className="text-xs text-slate-500">This Month</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-slate-800">{data.leaveMonitoring.approvedThisMonth}</span>
                </div>
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Staff on Leave</p>
                      <p className="text-xs text-slate-500">Today</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-slate-800">{data.leaveMonitoring.staffOnLeaveToday}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6. Employee Performance Attendance Ranking */}
          <Card className="col-span-1 lg:col-span-2 rounded-lg shadow-sm border-slate-200">
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
      </div>
    </div>
  );
}
