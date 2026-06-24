import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, UserCheck, CalendarDays, Clock, FileCheck, CheckCircle2, XCircle, AlertTriangle, Building2, Download, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Sector } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const COLORS = ['#4f46e5', '#eab308', '#94a3b8', '#ef4444']; // Present, Late, On Leave, Absent



const cardHoverEffect = "transition-all duration-300 hover:shadow-[0_0_15px_rgba(123,0,153,0.15)] hover:border-[#7B0099]/30 hover:-translate-y-0.5";

export default function WorkforceInsights() {
  const { role, userBranch, userDepartment } = useRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [year, setYear] = useState(new Date().getFullYear().toString());

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
    { name: 'Late', value: data.teamAvailability.late },
    { name: 'On Leave', value: data.teamAvailability.onLeave },
    { name: 'Absent', value: data.teamAvailability.absent },
  ];

  const availableToday = data.teamAvailability.present + data.teamAvailability.late;
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

        {/* 1. Team Overview (Top KPI Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className={`rounded-lg shadow-sm border-slate-200 ${cardHoverEffect}`}>
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
          <Card className={`rounded-lg shadow-sm border-slate-200 ${cardHoverEffect}`}>
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
          <Card className={`rounded-lg shadow-sm border-slate-200 ${cardHoverEffect}`}>
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
          <Card className={`rounded-lg shadow-sm border-slate-200 ${cardHoverEffect}`}>
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
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">Live</span>
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
                <div className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-[#7B0099]/5 border border-transparent hover:border-[#7B0099]/20 rounded-xl transition-all duration-300 cursor-pointer group">
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

                <div className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-[#7B0099]/5 border border-transparent hover:border-[#7B0099]/20 rounded-xl transition-all duration-300 cursor-pointer group">
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

                <div className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-[#7B0099]/5 border border-transparent hover:border-[#7B0099]/20 rounded-xl transition-all duration-300 cursor-pointer group">
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
      </div>
  );
}
