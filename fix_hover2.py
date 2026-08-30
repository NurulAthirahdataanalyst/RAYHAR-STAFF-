import codecs

with codecs.open('src/pages/hr-analytics/AttendanceDashboard.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'hover:border-purple-500 hover:ring-1 hover:ring-purple-500 hover:bg-purple-50/50' in line:
        lines[i] = '''                <div key={i} className={elative overflow-hidden border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4  bg-white dark:bg-card rounded-md p-4 flex flex-col justify-between h-[150px] transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 }>''' + '\n'
        print('Found and replaced')

with codecs.open('src/pages/hr-analytics/AttendanceDashboard.tsx', 'w', 'utf-8') as f:
    f.writelines(lines)
