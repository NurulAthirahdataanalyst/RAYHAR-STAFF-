import re

with open('src/pages/hr-analytics/AttendanceDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the specific pagination block container
pattern = r'(<div className="flex items-center gap-4 text-\[10px\] font-bold text-foreground uppercase tracking-widest">)\s*(<span>)\s*(TOTAL SHOWING[^\<]*)\s*(</span>)\s*(<div className="flex items-center gap-1\.5">)'
replacement = r'<div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">\n                \1\n                  \2\n                    \3\n                  \4\n                </div>\n                \5'

content = re.sub(pattern, replacement, content)

with open('src/pages/hr-analytics/AttendanceDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Regex replace applied")
