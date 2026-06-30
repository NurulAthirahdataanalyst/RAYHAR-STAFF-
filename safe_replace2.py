import re

with open('src/pages/hr-analytics/WorkforceInsights.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

def replace_block(start_marker, end_marker, replacement):
    global text
    idx1 = text.find(start_marker)
    if idx1 == -1: return False
    idx2 = text.find(end_marker, idx1 + len(start_marker))
    if idx2 == -1: return False
    text = text[:idx1] + replacement + text[idx2:]
    return True

# 1. Replace the entire 4 KPI cards block
kpi_start = '<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">'
kpi_end = '<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">'
kpi_replacement = """<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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

         """

success = replace_block(kpi_start, kpi_end, kpi_replacement)
print(f"KPI replacement success: {success}")

# 2. Modernize the Attendance Trend Line Chart
# We need to change <LineChart> to <AreaChart> (or just add defs for gradient and change to thin line stroke)
# Actually Recharts has <AreaChart> for soft gradient fill, but since we are using <LineChart>, we can use <AreaChart> if we change the tags.
# Let's just do <AreaChart> with <Area>! But let's check if AreaChart/Area is imported.
# In the original file: import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend, AreaChart, Area } from 'recharts';
# We assume AreaChart, Area are imported. If not, we'll just modify the <LineChart> component with a shadow/gradient if possible, but standard is AreaChart.
chart_start = '<LineChart data={attendanceTrend} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>'
chart_end = '</LineChart>'
chart_replacement = """<AreaChart data={attendanceTrend} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
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

success2 = replace_block(chart_start, chart_end, chart_replacement)
print(f"Chart replacement success: {success2}")

with open('src/pages/hr-analytics/WorkforceInsights.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

