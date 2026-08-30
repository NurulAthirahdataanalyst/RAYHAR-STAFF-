import codecs
import re

file_path = 'src/pages/hr-analytics/AttendanceDashboard.tsx'
with codecs.open(file_path, 'r', 'utf-8') as f:
    content = f.read()

pattern = r'className=\{elative overflow-hidden border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 \$\{k\.color\.replace\(\'text-\', \'border-l-\'\)\} bg-white dark:bg-card rounded-md p-4 flex flex-col justify-between h-\[150px\] transition-all duration-200 cursor-pointer hover:border-purple-500 hover:ring-1 hover:ring-purple-500 hover:bg-purple-50/50 dark:hover:bg-slate-900/50\}'

new_classes = r"""className={elative overflow-hidden border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4  bg-white dark:bg-card rounded-md p-4 flex flex-col justify-between h-[150px] transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 }"""

if re.search(pattern, content):
    content = re.sub(pattern, new_classes, content)
    with codecs.open(file_path, 'w', 'utf-8') as f:
        f.write(content)
    print("Updated AttendanceDashboard.tsx")
else:
    print("Pattern not found in AttendanceDashboard.tsx")
