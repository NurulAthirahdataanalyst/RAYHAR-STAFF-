import re

with open('src/pages/hr-analytics/AttendanceDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_pag = '''            {filteredDailyAttendance.length > parseInt(limit) && !loadingDaily && (
              <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                      <span>
                        TOTAL SHOWING {((currentPage - 1) * parseInt(limit)) + 1} TO {Math.min(currentPage * parseInt(limit), filteredDailyAttendance.length)} OF {filteredDailyAttendance.length} ENTRIES
                      </span>
                <div className="flex items-center gap-1.5">'''

new_pag = '''            {filteredDailyAttendance.length > parseInt(limit) && !loadingDaily && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                  <span>
                    TOTAL SHOWING {((currentPage - 1) * parseInt(limit)) + 1} TO {Math.min(currentPage * parseInt(limit), filteredDailyAttendance.length)} OF {filteredDailyAttendance.length} ENTRIES
                  </span>
                </div>
                <div className="flex items-center gap-1.5">'''

content = content.replace(old_pag, new_pag)

with open('src/pages/hr-analytics/AttendanceDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AttendanceDashboard.tsx pagination")
