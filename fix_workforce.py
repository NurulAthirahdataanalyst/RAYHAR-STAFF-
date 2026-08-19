import re

path = 'src/pages/hr-analytics/WorkforceInsights.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace <div class="flex items-center gap-2"><Icon /><CardTitle ...>Title</CardTitle></div>
# With just <CardTitle ...>Title</CardTitle>

titles = [
    "Branch Workforce Distribution",
    "Temporary Branch Assignment",
    "Attendance Overview",
    "Attendance Trend",
    "Monthly Comparison",
    "Leave Utilization Trend vs. Previous Month",
    r"Missing Punch-Outs?|Missing Punch",
    r"Travel & Outstation Summary|Travel & Outstation"
]

for title in titles:
    # Look for: <div className="flex items-center gap-2">\s*<[A-Za-z0-9]+[^>]*/>\s*<CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">TITLE</CardTitle>\s*</div>
    pattern = r'<div className="flex items-center[^"]*">\s*<[A-Z][A-Za-z0-9]*[^>]*/>\s*<CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">(' + title + r')</CardTitle>\s*</div>'
    content = re.sub(pattern, r'<CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">\1</CardTitle>', content)

    # What about the ones that weren't matched at all by the first pass?
    # e.g. Attendance Trend
    pattern_alt = r'<div className="flex items-center[^"]*">\s*<[A-Z][A-Za-z0-9]*[^>]*/>\s*<CardTitle[^>]*>(' + title + r')</CardTitle>\s*</div>'
    content = re.sub(pattern_alt, r'<CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">\1</CardTitle>', content)
    
    # What about ones with a subtitle?
    # e.g. <p className="...">subtitle</p>
    # Since I don't know the exact class, I will just remove <p className="text-[11px] text-slate-500">...</p> that follow the title
    pattern_p = r'(<CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">' + title + r'</CardTitle>)\s*<p[^>]*>.*?</p>'
    content = re.sub(pattern_p, r'\1', content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
