import re

def clean_card_header_with_icon(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

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
        # Regex to find:
        # <div class="flex flex-col gap-1"> or similar
        #  <div class="flex items-center ...">
        #    <Icon />
        #    <CardTitle>TITLE</CardTitle>
        #  </div>
        #  <p>subtitle</p>
        # </div>
        # We will replace it with just <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">TITLE</CardTitle>

        # A very common pattern in these files:
        pattern1 = r'<div className="flex flex-col gap-[0-9]+">\s*<div className="flex items-center gap-[0-9]+">\s*<[A-Z][A-Za-z0-9]*[^>]*/>\s*<CardTitle[^>]*>(' + title + r')</CardTitle>\s*</div>\s*(?:<CardDescription[^>]*>|<p[^>]*>).*?(?:</CardDescription>|</p>)\s*</div>'
        content = re.sub(pattern1, r'<CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">\1</CardTitle>', content, flags=re.DOTALL)

        # Another common pattern:
        # <CardTitle className="text-xl font-bold text-slate-800 tracking-tight">Leave Utilization Trend vs. Previous Month</CardTitle>
        # just directly replacing the className.
        pattern2 = r'<CardTitle[^>]*>(' + title + r')</CardTitle>'
        # We only want to replace if it's not already correct. Actually, just replacing className is safest.
        content = re.sub(pattern2, r'<CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">\1</CardTitle>', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

clean_card_header_with_icon('src/pages/hr-analytics/AttendanceDashboard.tsx')
clean_card_header_with_icon('src/pages/hr-analytics/WorkforceInsights.tsx')
