import codecs

file_path = 'src/pages/hr-analytics/AttendanceDashboard.tsx'
with codecs.open(file_path, 'r', 'utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if line.startswith('elative overflow-hidden'):
        continue
    elif '<div key={i} className={' in line and 'elative overflow' in lines[i+1]:
        continue
    elif '              })().map((k, i) => (' in line:
        new_lines.append(line)
        new_line = r"                <div key={i} className={elative overflow-hidden border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4  bg-white dark:bg-card rounded-md p-4 flex flex-col justify-between h-[150px] transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 }>\n"
        new_lines.append(new_line)
    else:
        new_lines.append(line)

with codecs.open(file_path, 'w', 'utf-8') as f:
    f.write(''.join(new_lines))
