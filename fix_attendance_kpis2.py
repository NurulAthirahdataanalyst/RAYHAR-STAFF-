import codecs
import re

with codecs.open('src/pages/hr-analytics/AttendanceDashboard.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Replace the 6 KPI blocks again
kpis = [
    ('Total<br/>Employees', 'blue-500'),
    ('Total<br/>Present', 'emerald-500'),
    ('Present<br/>(On Time)', 'emerald-400'),
    ('Present<br/>(Late)', 'amber-500'),
    ('Absent<br/>&nbsp;', 'rose-500'),
    ('Outstation<br/>&nbsp;', 'purple-500')
]

for title, color in kpis:
    # Find the block, ensuring we grab the entire className up to the closing quote
    pattern = r'(<div className="flex flex-col items-center justify-center py-3 px-2 rounded-\[24px\].*?)(?: hover:border-purple-200 dark:hover:border-purple-900/50| border-l-4 border-transparent hover:border-purple-500 hover:-translate-y-1 hover:shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800)?(">\s*<span className="text-\[10px\][^>]*?>' + title.replace('<br/>', r'<br\s*/>') + r'</span>)'
    
    replacement = r'\1 border-l-4 border-transparent hover:border-' + color + r' hover:-translate-y-1 hover:shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800\2'
    
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with codecs.open('src/pages/hr-analytics/AttendanceDashboard.tsx', 'w', 'utf-8') as f:
    f.write(content)
print("Updated KPIs cleanly!")
