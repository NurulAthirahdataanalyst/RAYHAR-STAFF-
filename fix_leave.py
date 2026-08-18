import os

path = r"src\pages\reports\LeaveReports.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import if missing
if 'MonthPicker' not in content:
    idx = content.rfind('import ')
    line_end = content.find('\n', idx)
    content = content[:line_end+1] + 'import { MonthPicker } from "@/components/shared/MonthPicker";\n' + content[line_end+1:]

block = """              <input
                type="month"
                value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                onChange={(e) => {
                  if (e.target.value) {
                    const [yyyy, mm] = e.target.value.split('-');
                    setSelectedYear(yyyy);
                    setSelectedMonth(parseInt(mm).toString());
                  }
                }}
                className="appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 min-w-[140px]"
              />"""

replacement = """              <MonthPicker
                monthYear={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                onSelectMonthYear={(val) => {
                  const [yyyy, mm] = val.split('-');
                  setSelectedYear(yyyy);
                  setSelectedMonth(parseInt(mm).toString());
                }}
                className="appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 min-w-[140px]"
              />"""

if block not in content and block.replace('\n', '\r\n') in content:
    block = block.replace('\n', '\r\n')
    replacement = replacement.replace('\n', '\r\n')

if block in content:
    content = content.replace(block, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced in", path)
else:
    print("Block not found!")
