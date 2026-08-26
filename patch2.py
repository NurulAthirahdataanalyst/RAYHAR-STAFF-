import re

file_path = 'src/components/shared/StaffProfileDialog.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state todayStats
old_state = 'const [analytics, setAnalytics] = useState<any>(null);'
new_state = old_state + '\n  const [todayStats, setTodayStats] = useState<any>(null);\n'
content = content.replace(old_state, new_state)

# 2. Add fetchTodayStats
old_fetch = 'const [analyticsDate, setAnalyticsDate] = useState<string>(new Date().toISOString().substring(0, 7));'
new_fetch = old_fetch + '''
  const fetchTodayStats = async (uid: string) => {
    try {
      const dStr = new Date().toLocaleDateString("en-CA");
      const res = await fetch(${API_BASE_URL}/api/dashboard-stats?userId=&date=);
      const data = await res.json();
      if (data.success && data.stats) {
        setTodayStats(data.stats);
      } else {
        setTodayStats(null);
      }
    } catch(e) {
      setTodayStats(null);
    }
  };
'''
content = content.replace(old_fetch, new_fetch)

# 3. Call fetchTodayStats in fetchAttendanceSettings
old_fetch_att = 'const fetchAttendanceSettings = async (userId: string) => {'
new_fetch_att = old_fetch_att + '\n    fetchTodayStats(userId);'
content = content.replace(old_fetch_att, new_fetch_att)

# 4. Replace Attendance Performance Header
old_header = '''                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-0 gap-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-50 text-blue-600 rounded">
                            <TrendingUp className="h-3 w-3" />
                          </div>
                          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Attendance Performance</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <MonthPicker monthYear={analyticsDate} onSelectMonthYear={setAnalyticsDate} className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full cursor-pointer hover:bg-slate-50 transition-colors focus:outline-none focus:ring-1 focus:ring-[#7B0099]" />
                        </div>
                      </div>'''

new_header = '''                      <div className="flex flex-col xl:flex-row xl:items-start justify-between mb-0 gap-4">
                        <div className="flex items-center gap-2 pt-2">
                          <div className="p-1 bg-blue-50 text-blue-600 rounded">
                            <TrendingUp className="h-3 w-3" />
                          </div>
                          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Attendance Performance</h3>
                        </div>
                        <div className="flex flex-col sm:flex-row items-end sm:items-start gap-4">
                          {todayStats && (
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm min-w-[280px]">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">Today's Attendance</p>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1 text-slate-600"><MapPin className="w-3 h-3"/> Clock In</span>
                                  <span className="font-bold">{todayStats.clockInTime || '--:--'}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1 text-slate-600"><MapPin className="w-3 h-3"/> Clock Out</span>
                                  <span className="font-bold">{todayStats.clockOutTime || '--:--'}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1 text-slate-600"><MapPin className="w-3 h-3"/> Distance / Location</span>
                                  <span className="font-bold max-w-[140px] truncate text-right" title={todayStats.location || selectedEmployee?.branch}>{todayStats.distance ? todayStats.distance + 'm, ' : ''}{todayStats.location || selectedEmployee?.branch || 'HQ'}</span>
                                </div>
                                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                                  <span className="text-slate-600">Status</span>
                                  <div className="flex items-center gap-1">
                                    <span className={w-2 h-2 rounded-full }></span>
                                    <span className="font-bold">{todayStats.todayStatus}</span>
                                    {(activeAssignments.length > 0 || allowedLocations.length > 1) && (
                                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded ml-1 font-bold">
                                        [{activeAssignments.length > 0 ? (activeAssignments[0].type === 'OUTSTATION' ? 'Outstation' : 'Temporary') : 'Multi Location'}]
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          <MonthPicker monthYear={analyticsDate} onSelectMonthYear={setAnalyticsDate} className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full cursor-pointer hover:bg-slate-50 transition-colors focus:outline-none focus:ring-1 focus:ring-[#7B0099]" />
                        </div>
                      </div>'''
content = content.replace(old_header, new_header)

# 5. Insert Leave Cards
old_leave_stats = '                            {/* Detailed Leave Stats */}'
new_leave_stats = '''                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 p-3 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1.5">Replacement Leave</p>
                                <p className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tighter">
                                  {employeeLeaves.filter((l: any) => l.type === 'Replacement Leave' && l.status === 'Approved').reduce((s: number, l: any) => s + (l.duration || 1), 0)}
                                </p>
                                <p className="text-[9px] font-bold text-slate-500 mt-1">Days Taken</p>
                              </div>
                              <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 p-3 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1.5">Unpaid Leave</p>
                                <p className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tighter">
                                  {employeeLeaves.filter((l: any) => l.type === 'Unpaid Leave' && l.status === 'Approved').reduce((s: number, l: any) => s + (l.duration || 1), 0)}
                                </p>
                                <p className="text-[9px] font-bold text-slate-500 mt-1">Days Taken</p>
                              </div>
                              <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 p-3 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1.5">Medical/Sick Leave</p>
                                <p className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tighter">
                                  {employeeLeaves.filter((l: any) => (l.type === 'Medical Leave' || l.type === 'Sick Leave') && l.status === 'Approved').reduce((s: number, l: any) => s + (l.duration || 1), 0)}
                                </p>
                                <p className="text-[9px] font-bold text-slate-500 mt-1">Days Taken</p>
                              </div>
                            </div>
                            
                            {/* Detailed Leave Stats */}'''
content = content.replace(old_leave_stats, new_leave_stats)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched StaffProfileDialog.tsx')
