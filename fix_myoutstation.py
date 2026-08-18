import os

path = r"src\pages\outstation\MyOutstation.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix MonthPicker
old_mp = 'className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 bg-white dark:bg-card border border-slate-200 dark:border-slate-700 rounded-md shadow-sm min-w-[120px]"'
new_mp = 'className="flex items-center justify-between h-9 px-3 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 bg-white dark:bg-card border border-slate-200 dark:border-slate-700 rounded-md shadow-sm min-w-[140px]"'
content = content.replace(old_mp, new_mp)

# Fix YearPopover
old_yp = 'className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 bg-white dark:bg-card border border-slate-200 dark:border-slate-700 rounded-md shadow-sm min-w-[100px]"'
new_yp = 'className="flex items-center justify-between h-9 px-3 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 bg-white dark:bg-card border border-slate-200 dark:border-slate-700 rounded-md shadow-sm min-w-[140px]"'
content = content.replace(old_yp, new_yp)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed MyOutstation MonthPicker")
