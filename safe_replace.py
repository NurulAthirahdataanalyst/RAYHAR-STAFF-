import re

with open('src/pages/hr-analytics/WorkforceInsights.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

kpi_replacement = """{/* PRIMARY SECTION */}
       <div>
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
       </div>"""

dept_replacement = """{/* Department Workforce Distribution */}
           <Card className="p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col bg-white rounded-[16px]">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-[15px] font-bold text-[#1A1F36]">Employees By Department</h3>
               <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                 <SelectTrigger className="w-[110px] h-8 text-[11px] font-semibold border border-slate-200 bg-white shadow-sm focus:ring-0 text-[#1A1F36] rounded-md">
                   <SelectValue placeholder="This Month" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="This Month" className="text-[11px] font-semibold">This Month</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             
             <div className="space-y-6 flex-1 pr-2">
               {topDepartments.map((dept: any, idx: number) => {
                 const maxVal = Math.max(...departmentMetrics.map((d:any)=>d.value));
                 const widthPercent = maxVal > 0 ? (dept.value / maxVal) * 100 : 0;
                 return (
                   <div key={idx} className="flex items-center gap-4">
                     <div className="w-[120px] text-right">
                       <span className="text-[12px] font-bold text-[#1A1F36] whitespace-nowrap overflow-hidden text-ellipsis">{dept.name}</span>
                     </div>
                     <div className="flex-1 flex items-center">
                       <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden">
                         <div className="h-full bg-[#FF5722] rounded-full" style={{ width: `${Math.max(2, widthPercent)}%` }}></div>
                       </div>
                     </div>
                   </div>
                 );
               })}
               {topDepartments.length === 0 && (
                 <div className="text-center text-[#8C98A4] text-xs py-10 font-medium">No departments found.</div>
               )}
             </div>
             
             <div className="mt-8 pt-5 border-t border-slate-100 flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-[#FF5722]"></div>
               <p className="text-[11px] font-semibold text-[#8C98A4]">
                 No of Employees increased by <span className="text-[#10B981] font-bold">+20%</span> from last Month
               </p>
             </div>
           </Card>"""


with open('kpi.txt', 'r', encoding='utf-8') as f:
    kpi_original = f.read()

# Since get_block didn't include the end tag, let's just use regex safely, BUT not match everything.
# Re-extract exactly from the text string
idx_kpi = text.find('{/* PRIMARY SECTION */}')
idx_kpi_end = text.find('{/* Row 2: 3 Columns */}')
if idx_kpi != -1 and idx_kpi_end != -1:
    text = text[:idx_kpi] + kpi_replacement + '\n\n         ' + text[idx_kpi_end:]

idx_dept = text.find('{/* Department Workforce Distribution */}')
idx_dept_end = text.find('{/* Branch Workforce Distribution */}')
if idx_dept != -1 and idx_dept_end != -1:
    text = text[:idx_dept] + dept_replacement + '\n\n           ' + text[idx_dept_end:]

with open('src/pages/hr-analytics/WorkforceInsights.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Success')
