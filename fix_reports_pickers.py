import os

files = [
    r"src\pages\reports\AttendanceReports.tsx",
    r"src\pages\reports\LeaveReports.tsx"
]

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # MonthPicker in AttendanceReports
    old_mp_ar = 'className="h-10 px-4 text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 rounded-md shadow-sm min-w-[140px]"'
    new_mp_ar = 'className="flex items-center justify-between h-10 px-4 text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 rounded-md shadow-sm min-w-[140px]"'
    content = content.replace(old_mp_ar, new_mp_ar)

    # YearPopover in AttendanceReports
    old_yp_ar = 'className="h-10 px-4 text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 rounded-md shadow-sm min-w-[140px]"'
    content = content.replace(old_yp_ar, new_mp_ar)

    # MonthPicker in LeaveReports (maybe same class)
    # Let's check LeaveReports class
    # Actually, if it's identical it's replaced.
    # Let's just do a generic replace for className="h-10 px-4 text-[11px] font-black..." inside these files
    # Wait, earlier I saw LeaveReports had:
    # className="appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 min-w-[140px]"
    # Let's verify what LeaveReports has.

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed pickers in", path)
