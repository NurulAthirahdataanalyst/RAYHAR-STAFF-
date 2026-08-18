import os

path = r"src\pages\hr-analytics\WorkforceInsights.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

block = """                  <input
                    type="month"
                    value={`${year}-${month}`}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [newYear, newMonth] = e.target.value.split('-');
                        setYear(newYear);
                        setMonth(newMonth);
                      }
                    }}
                    className="appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 min-w-[140px]"
                  />"""

replacement = """                  <MonthPicker
                    monthYear={`${year}-${month.padStart(2, '0')}`}
                    onSelectMonthYear={(val) => {
                      const [newYear, newMonth] = val.split('-');
                      setYear(newYear);
                      setMonth(parseInt(newMonth).toString());
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
