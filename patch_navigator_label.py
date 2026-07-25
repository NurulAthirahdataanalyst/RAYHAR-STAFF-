import re

file_path = r'C:\Users\HP\ATTENDANCE_SYSTEM\src\pages\hr-analytics\WorkforceInsights.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 rounded-full shadow-sm">
                    {(() => {
                      const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 6 });
                      const isCurrentWeek = trendWeekStart.getTime() === currentWeekStart.getTime();
                      return isCurrentWeek ? (
                        <>
                          <span className="text-xs font-bold text-slate-500">This Week</span>
                          <span className="text-xs sm:text-sm font-black text-[#7B0099] whitespace-nowrap">
                            ({format(trendWeekStart, "dd MMM yyyy")} - {format(endOfWeek(trendWeekStart, { weekStartsOn: 6 }), "dd MMM yyyy")})
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-slate-500">Week</span>
                          <span className="text-xs sm:text-sm font-black text-[#7B0099] whitespace-nowrap">
                            {format(trendWeekStart, "dd MMM")} - {format(endOfWeek(trendWeekStart, { weekStartsOn: 6 }), "dd MMM yyyy")}
                          </span>
                        </>
                      );
                    })()}
                  </div>"""

new_logic = """                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 rounded-full shadow-sm">
                    <span className="text-xs sm:text-sm font-black text-[#7B0099] whitespace-nowrap">
                      {format(trendWeekStart, "dd MMM yyyy")} - {format(endOfWeek(trendWeekStart, { weekStartsOn: 6 }), "dd MMM yyyy")}
                    </span>
                  </div>"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Could not find old logic")
