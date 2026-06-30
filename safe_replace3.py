import re

with open('src/pages/hr-analytics/WorkforceInsights.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add AreaChart and Area to recharts imports if not present
import_stmt = 'import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Sector } from "recharts";'
new_import_stmt = 'import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Sector, AreaChart, Area } from "recharts";'
text = text.replace(import_stmt, new_import_stmt)

# 1. KPI Panel Replace
# Let's replace the whole block by exact string.
kpi_old = """         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-5 flex items-center shadow-sm border-slate-200 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 cursor-default">
               <div className="w-12 h-12 rounded-xl bg-[#DBEAFE] text-blue-700 flex items-center justify-center mr-4">
                 <Users className="w-6 h-6" />
               </div>
               <div>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Headcount</p>
                 <h3 className="text-2xl font-black text-[#1A1F36]">{topKpi.totalHeadcount || 0}</h3>
               </div>
            </Card>
            <Card className="p-5 flex items-center shadow-sm border-slate-200 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 cursor-default">
               <div className="w-12 h-12 rounded-xl bg-[#DCFCE7] text-green-700 flex items-center justify-center mr-4">
                 <UserCheck className="w-6 h-6" />
               </div>
               <div>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Active Employees</p>
                 <h3 className="text-2xl font-black text-[#1A1F36]">{topKpi.activeEmployees || 0}</h3>
               </div>
            </Card>
            <Card className="p-5 flex items-center shadow-sm border-slate-200 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 cursor-default relative">
               {feedConnected && <span className="absolute top-3 right-3 flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE</span>}
               <div className="w-12 h-12 rounded-xl bg-[#F3E8FF] text-purple-700 flex items-center justify-center mr-4">
                 <CheckCircle2 className="w-6 h-6" />
               </div>
               <div>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Attendance Rate</p>
                 <h3 className="text-2xl font-black text-[#1A1F36]">{topKpi.attendanceRate || 0}%</h3>
               </div>
            </Card>
            <Card className="p-5 flex items-center shadow-sm border-slate-200 hover:border-[#7B0099] hover:shadow-md transition-all duration-300 cursor-default">
               <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] text-amber-700 flex items-center justify-center mr-4">
                 <CalendarDays className="w-6 h-6" />
               </div>
               <div>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">On Leave Today</p>
                 <h3 className="text-2xl font-black text-[#1A1F36]">{topKpi.onLeaveToday || 0}</h3>
               </div>
            </Card>
         </div>"""

kpi_new = """         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
         </div>"""

text = text.replace(kpi_old, kpi_new)

# 2. Chart Replace
chart_old = """                 <LineChart data={attendanceTrend} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                   <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} domain={['auto', 100]} />
                   <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                   <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Attendance %" />
                 </LineChart>"""

chart_new = """                 <AreaChart data={attendanceTrend} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
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
                 </AreaChart>"""

text = text.replace(chart_old, chart_new)

with open('src/pages/hr-analytics/WorkforceInsights.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Replacement script ran successfully.")
