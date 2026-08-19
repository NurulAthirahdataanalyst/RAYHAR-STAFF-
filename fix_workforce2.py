import re

path = 'src/pages/hr-analytics/WorkforceInsights.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

titles_h2 = [
    "Attendance Trend",
    "Monthly Comparison",
    "Leave Utilization Trend vs. Previous Month",
    r"Missing Punch-Outs",
    r"Travel & Outstation Summary"
]

for title in titles_h2:
    # Pattern to match <div class="flex items-center gap-2"> <Icon /> <h2>TITLE</h2> </div>
    pattern = r'<div className="flex items-center gap-2">\s*(<[A-Z][A-Za-z0-9]*[^>]*/>)?\s*<h2[^>]*>(' + title + r')</h2>\s*</div>'
    content = re.sub(pattern, r'<CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">\2</CardTitle>', content)

    # If they are just <h2>TITLE</h2> without the div wrapper
    pattern_alt = r'<h2[^>]*>(' + title + r')</h2>'
    content = re.sub(pattern_alt, r'<CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">\1</CardTitle>', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
