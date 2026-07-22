# -*- coding: utf-8 -*-
import re

with open('src/pages/hr-analytics/WorkforceInsights.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update main grid
content = re.sub(
    r'className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-6"',
    r'className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6"',
    content
)

# 2. Update KPI wrapper
content = re.sub(
    r'className="col-span-1 md:col-span-2 xl:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4"',
    r'className="col-span-1 xl:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4"',
    content
)

# 3. Update Employee Distribution wrapper
content = re.sub(
    r'className={`col-span-1 md:col-span-2 xl:col-span-2 rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card p-5 flex flex-col justify-between \${cardHoverEffect}`}',
    r'className={`col-span-1 xl:col-span-1 rounded-xl shadow-sm border border-slate-200 bg-white dark:bg-card p-5 flex flex-col justify-between \${cardHoverEffect}`}',
    content
)

# Replace the 8 KPI cards
new_kpis = '''            {/* 1. Present Today */}
            <Card className={`rounded-xl shadow-sm border border-emerald-100 bg-emerald-50/30 p-5 flex flex-col h-[200px] justify-between ${cardHoverEffect}`}>
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
                  <p className="text-[12px] font-semibold text-slate-500 mt-1">Employees</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between items-end mb-2 relative">
                  <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> 2 vs Yesterday</p>
                  <p className="text-[11px] font-bold text-emerald-700">{(feedConnected && clockInOut.length > 0 ? clockInOut.length : data.teamAvailability.present) === data.topKpi.activeEmployees ? "100%" : `${Math.round(((feedConnected && clockInOut.length > 0 ? clockInOut.length : data.teamAvailability.present) / (data.topKpi.activeEmployees || 1)) * 100)}%`} of Workforce</p>
                </div>
                <div className="relative w-full">
                  <div className="w-full bg-emerald-200/50 rounded-full h-2.5 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, ((feedConnected && clockInOut.length > 0 ? clockInOut.length : data.teamAvailability.present) / (data.topKpi.activeEmployees || 1)) * 100)}%` }}></div>
                  </div>
                  <div className="absolute right-0 -top-6 text-[12px] font-extrabold text-slate-800">
                     {feedConnected && clockInOut.length > 0 ? clockInOut.length : data.teamAvailability.present} <span className="text-slate-400 font-bold">/ {data.topKpi.activeEmployees}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* 2. Late Arrivals */}
            {(() => {
              let highestLateTime = "None";
              if (feedConnected && lateList.length > 0) {
                const maxTime = Math.max(...lateList.map(emp => emp.clock_in ? new Date(emp.clock_in).getTime() : 0));
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
            <Card className={`rounded-xl shadow-sm border border-slate-200 bg-white p-5 flex flex-col h-[200px] justify-between ${cardHoverEffect}`}>
              <div>
                <div className="w-10 h-10 rounded-full border border-orange-100 bg-orange-50/50 flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-[11px] font-extrabold text-orange-600 uppercase tracking-wider mb-2">Late Arrival</p>
                <div className="flex flex-col items-start mt-1">
                  <h3 className="text-4xl font-black text-slate-800 leading-none">{feedConnected && lateList.length > 0 ? lateList.length : data.teamAvailability.late}</h3>
                  <p className="text-[12px] font-semibold text-slate-500 mt-1">Employees</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-bold text-slate-500 mb-3">Highest: <span className="text-orange-500">{highestLateTime}</span></p>
                <p className="text-[11px] font-bold text-slate-400 border-t border-slate-100 pt-3">- vs Yesterday</p>
              </div>
            </Card>
            );})()}

            {/* 3. On Leave Today */}
            <Card className={`rounded-xl shadow-sm border border-slate-200 bg-white p-5 flex flex-col h-[200px] justify-between ${cardHoverEffect}`}>
              <div>
                <div className="w-10 h-10 rounded-full border border-purple-100 bg-purple-50/50 flex items-center justify-center mb-3">
                  <CalendarDays className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-[11px] font-extrabold text-purple-600 uppercase tracking-wider mb-2">On Leave Today</p>
                <div className="flex flex-col items-start mt-1">
                  <h3 className="text-4xl font-black text-slate-800 leading-none">{data.topKpi.onLeaveToday}</h3>
                  <p className="text-[12px] font-semibold text-slate-500 mt-1">Employees</p>
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex gap-1.5">
                  <span className="bg-orange-50 text-orange-600 text-[9px] font-bold px-2 py-0.5 rounded-full">AL {data.leave?.annual || 0}</span>
                  <span className="bg-purple-50 text-purple-600 text-[9px] font-bold px-2 py-0.5 rounded-full">MC {data.leave?.medical || 0}</span>
                  <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-2 py-0.5 rounded-full">EL {data.leave?.emergency || 0}</span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 border-t border-slate-100 pt-3">- vs Yesterday</p>
              </div>
            </Card>

            {/* 4. Absent Today */}
            <Card className={`rounded-xl shadow-sm border border-slate-200 bg-white p-5 flex flex-col h-[200px] justify-between ${cardHoverEffect}`}>
              <div>
                <div className="w-10 h-10 rounded-full border border-red-100 bg-red-50/50 flex items-center justify-center mb-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-[11px] font-extrabold text-red-500 uppercase tracking-wider mb-2">Absent Today</p>
                <div className="flex flex-col items-start mt-1">
                  <h3 className="text-4xl font-black text-slate-800 leading-none">{feedConnected && absentList.length > 0 ? absentList.length : data.teamAvailability.absent}</h3>
                  <p className="text-[12px] font-semibold text-slate-500 mt-1">Employees</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-bold text-red-500 mb-3">Needs Attention</p>
                <p className="text-[11px] font-bold text-slate-400 border-t border-slate-100 pt-3">- vs Yesterday</p>
              </div>
            </Card>

            {/* 5. Missing Punch */}
            <Card className={`rounded-xl shadow-sm border border-slate-200 bg-white p-5 flex flex-col h-[200px] justify-between ${cardHoverEffect}`}>
              <div>
                <div className="w-10 h-10 rounded-full border border-amber-100 bg-amber-50/50 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-[11px] font-extrabold text-amber-500 uppercase tracking-wider mb-2">Missing Punch</p>
                <div className="flex flex-col items-start mt-1">
                  <h3 className="text-4xl font-black text-slate-800 leading-none">0</h3>
                  <p className="text-[12px] font-semibold text-slate-500 mt-1">Employees</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-bold text-amber-500 mb-3 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> 0 vs Yesterday</p>
                <div className="w-full bg-amber-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full w-[10%]"></div>
                </div>
              </div>
            </Card>

            {/* 6. Outstation */}
            <Card className={`rounded-xl shadow-sm border border-slate-200 bg-white p-5 flex flex-col h-[200px] justify-between ${cardHoverEffect}`}>
              <div>
                <div className="w-10 h-10 rounded-full border border-blue-100 bg-blue-50/50 flex items-center justify-center mb-3">
                  <Plane className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-[11px] font-extrabold text-blue-500 uppercase tracking-wider mb-2">Outstation</p>
                <div className="flex flex-col items-start mt-1">
                  <h3 className="text-4xl font-black text-slate-800 leading-none">{activeOutstationList.length > 0 ? activeOutstationList.length : (data.topKpi.outstationToday || 0)}</h3>
                  <p className="text-[12px] font-semibold text-slate-500 mt-1">Employees</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-bold text-blue-500 mb-3">{(activeOutstationList.length > 0 || (data.topKpi.outstationToday || 0) > 0) ? "Away on duty" : "None Today"}</p>
                <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                  <span className="text-[11px] font-bold text-slate-400 flex-1">- vs Yesterday</span>
                  <div className="w-1/3 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-blue-300 rounded-full w-[30%]"></div>
                  </div>
                </div>
              </div>
            </Card>

            {/* 7. Attendance Rate */}
            <Card className={`rounded-xl shadow-sm border border-slate-200 bg-white p-5 flex flex-col h-[200px] justify-between ${cardHoverEffect}`}>
              <div>
                <div className="w-10 h-10 rounded-full border border-indigo-100 bg-indigo-50/50 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                </div>
                <p className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider mb-2">Attendance Rate</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-4xl font-black text-slate-800 leading-none">{data.topKpi.attendanceRate}%</h3>
                </div>
                <p className="text-[11px] font-bold text-slate-500 mt-1">Target 95%</p>
              </div>
              <div className="mt-1 flex flex-col items-start w-full relative">
                <div className="w-full h-[20px] mb-2 px-1 relative">
                  <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 20" className="opacity-80">
                    <path d="M0,15 L15,10 L30,18 L45,8 L60,12 L75,5 L90,15 L100,2" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />
                    <circle cx="0" cy="15" r="2.5" fill="#6366f1" />
                    <circle cx="15" cy="10" r="2.5" fill="#6366f1" />
                    <circle cx="30" cy="18" r="2.5" fill="#6366f1" />
                    <circle cx="45" cy="8" r="2.5" fill="#6366f1" />
                    <circle cx="60" cy="12" r="2.5" fill="#6366f1" />
                    <circle cx="75" cy="5" r="2.5" fill="#6366f1" />
                    <circle cx="90" cy="15" r="2.5" fill="#6366f1" />
                    <circle cx="100" cy="2" r="2.5" fill="#6366f1" />
                    <path d="M0,15 L15,10 L30,18 L45,8 L60,12 L75,5 L90,15 L100,2 L100,20 L0,20 Z" fill="url(#gradient-indigo)" className="opacity-20" />
                    <defs>
                      <linearGradient id="gradient-indigo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> 2% vs Yesterday</p>
              </div>
            </Card>

            {/* 8. Active Workforce */}
            <Card className={`rounded-xl shadow-sm border border-slate-200 bg-white p-5 flex flex-col h-[200px] justify-between ${cardHoverEffect}`}>
              <div>
                <div className="w-10 h-10 rounded-full border border-emerald-100 bg-emerald-50/50 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider mb-2">Active Workforce</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-4xl font-black text-slate-800 leading-none">
                    {data.topKpi.activeEmployees} <span className="text-[18px] font-bold text-slate-400">/ {data.topKpi.totalHeadcount}</span>
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
            </Card>'''

# Escape backslashes in replacement string so re.sub doesn't treat them as escapes
def repl(m):
    return new_kpis

pattern = r'\{\/\* 1\. Present Today \*\/\}[\s\S]*?\{\/\* 8\. Active Workforce \*\/\}[\s\S]*?<\/Card>'
content = re.sub(pattern, repl, content)

with open('src/pages/hr-analytics/WorkforceInsights.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
