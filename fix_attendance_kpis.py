import codecs
import re

with codecs.open('src/pages/hr-analytics/AttendanceDashboard.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Replace the 6 KPI blocks
kpis = [
    ('Total<br/>Employees', 'blue-500'),
    ('Total<br/>Present', 'emerald-500'),
    ('Present<br/>(On Time)', 'emerald-400'),
    ('Present<br/>(Late)', 'amber-500'),
    ('Absent<br/>&nbsp;', 'rose-500'),
    ('Outstation<br/>&nbsp;', 'purple-500')
]

for title, color in kpis:
    # Find the block
    pattern = r'(<div className="[^"]*?bg-slate-50/50 dark:bg-slate-800/30 transition-colors)[^"]*?(">.*?<span className="text-\[10px\][^>]*?>' + title.replace('<br/>', r'<br\s*/>') + r'</span>)'
    
    # We want to replace the hover classes with hover:border-l-4 and the color, plus a slight transform for 3D
    replacement = r'\1 border-l-4 border-transparent hover:border-' + color + r' hover:-translate-y-1 hover:shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800\2'
    
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with codecs.open('src/pages/hr-analytics/AttendanceDashboard.tsx', 'w', 'utf-8') as f:
    f.write(content)
print("Updated KPIs!")
