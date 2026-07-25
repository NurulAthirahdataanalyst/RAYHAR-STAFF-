import re

file_path = r'C:\Users\HP\ATTENDANCE_SYSTEM\src\pages\EmployeeAnalytics.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_header = """      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#7B0099]/10 dark:bg-[#7B0099]/20 rounded-xl text-[#7B0099]">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-responsive-xl font-black text-foreground tracking-tight uppercase">
              Performance Insights
            </h1>
            <p className="text-responsive-sm text-muted-foreground font-medium italic">
              Employee Attendance Analytics · {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </p>
          </div>
        </div>

        {/* Month/Year Filter */}"""

new_header = """      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 bg-white dark:bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground uppercase tracking-tight">
            PERFORMANCE INSIGHTS
          </h1>
          <p className="text-[15px] sm:text-base text-muted-foreground mt-1">
            Employee Attendance Analytics · {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </p>
        </div>

        {/* Month/Year Filter */}"""

if old_header in content:
    content = content.replace(old_header, new_header)
    print("Header replaced")
else:
    # try replacing with different encoding or line endings
    # Or just use regex
    print("Exact match failed, trying regex")
    
    # regex for Page Header
    pattern = re.compile(r'\{\/\* ── Page Header ── \*\/.*?\{\/\* Month\/Year Filter \*\/\}', re.DOTALL)
    if pattern.search(content):
        content = pattern.sub(new_header.replace('        {/* Month/Year Filter */}', '        {/* Month/Year Filter */}'), content)
        print("Header replaced with regex")
    else:
        print("Regex match failed")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
