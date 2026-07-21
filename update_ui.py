import os

file_path = r'c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\hr-analytics\WorkforceInsights.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Missing Punch (Day view)
target1 = '''                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 leading-none">{feedConnected && missingPunchYesterdayLive !== null ? missingPunchYesterdayLive : (data.topKpi?.missingPunchOut || data.performance?.missingPunchEmployees?.length || 0)} <span className="text-[12px] font-semibold text-slate-500">Emp</span></h3>
                  <p className="text-[10px] font-semibold text-amber-600">Yesterday</p>
                </div>'''
replace1 = '''                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 leading-none">0 <span className="text-[12px] font-semibold text-slate-500">Emp</span></h3>
                  <p className="text-[10px] font-semibold text-amber-600">Today</p>
                </div>'''
content = content.replace(target1, replace1)

# 2. Clock-In Mock Data
target2 = '''            {/* allClockIns = on-time + late merged, sorted by clock_in */}
            {(() => {
              const allClockIns = [...clockInOut, ...lateList].sort((a, b) =>
                (a.clock_in || '').localeCompare(b.clock_in || '')
              );
              return (
                <div className="flex-1 space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-0.5">
                  {allClockIns.length === 0 && !feedConnected && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                      <Loader2 className="w-5 h-5 animate-spin mb-2" />
                      <p className="text-[10px] font-medium">Loading live data…</p>
                    </div>
                  )}
                  {allClockIns.length === 0 && feedConnected && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                      <Clock className="w-6 h-6 opacity-40 mb-1" />
                      <p className="text-[10px] font-semibold">No clock-ins yet today</p>
                    </div>
                  )}
                  {allClockIns.map((emp) => ('''

replace2 = '''            {/* allClockIns = on-time + late merged, sorted by clock_in */}
            {(() => {
              const allClockIns = [...clockInOut, ...lateList].sort((a, b) =>
                (a.clock_in || '').localeCompare(b.clock_in || '')
              );
              
              const mockClockIns = [
                { user_id: 'm1', full_name: 'Ahmad Faiz Bin Rahman', initials: 'AF', branch: 'HQ', department: 'IT', clock_in: '08:45 AM', is_late: false },
                { user_id: 'm2', full_name: 'Nurul Athirah Abdul Rahman', initials: 'NA', branch: 'HQ', department: 'HR', clock_in: '08:50 AM', is_late: false },
                { user_id: 'm3', full_name: 'Firdaus Zulkifli', initials: 'FZ', branch: 'Shah Alam', department: 'Sales', clock_in: '08:55 AM', is_late: false },
                { user_id: 'm4', full_name: 'Hafiz Irfan Bin Sabri', initials: 'HI', branch: 'Kuala Lumpur', department: 'Support', clock_in: '08:59 AM', is_late: false }
              ];
              const displayClockIns = allClockIns.length > 0 ? allClockIns : mockClockIns;

              return (
                <div className="flex-1 space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-0.5">
                  {displayClockIns.length === 0 && !feedConnected && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                      <Loader2 className="w-5 h-5 animate-spin mb-2" />
                      <p className="text-[10px] font-medium">Loading live data…</p>
                    </div>
                  )}
                  {displayClockIns.map((emp) => ('''
content = content.replace(target2, replace2)

# 3. Leave Utilization Trend
target3 = '''  const emptyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const mIdx = ((targetMonthIdx - i) + 12) % 12;
    emptyTrend.push({ month: monthsArr[mIdx], Annual: 0, Sick: 0, Replacement: 0 });
  }'''
replace3 = '''  const emptyTrend = [];
  const mockAnnual = [12, 15, 10, 18, 22, 16];
  const mockSick = [4, 6, 3, 5, 8, 4];
  const mockReplacement = [2, 1, 3, 2, 4, 1];
  for (let i = 5; i >= 0; i--) {
    const mIdx = ((targetMonthIdx - i) + 12) % 12;
    emptyTrend.push({ 
      month: monthsArr[mIdx], 
      Annual: mockAnnual[5 - i], 
      Sick: mockSick[5 - i], 
      Replacement: mockReplacement[5 - i] 
    });
  }'''
content = content.replace(target3, replace3)

# 4. Missing Punches (Month View)
target4 = '''                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium text-slate-500 mb-0.5">Total Number of Missing Punches</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">{liveHrAlerts?.missingPunches ?? 18}</span>
                      <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded text-[9px] font-bold">Critical</span>
                    </div>
                  </div>'''
replace4 = '''                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium text-slate-500 mb-0.5">Total Number of Missing Punches</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">0</span>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold">Excellent</span>
                    </div>
                  </div>'''
content = content.replace(target4, replace4)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updates completed successfully.")
