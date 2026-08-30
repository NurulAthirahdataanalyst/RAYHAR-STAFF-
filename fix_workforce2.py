import codecs
import re

with codecs.open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Fix d.report missing
content = content.replace('if (d.success && d.report) {', 'const absentData = d.report || d.data;\n             if (d.success && absentData) {')
content = content.replace('const absents = d.report.map((x: any) => ({', 'const absents = absentData.map((x: any) => ({')

with codecs.open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'w', 'utf-8') as f:
    f.write(content)
print("Fixed Workforce Calendar Absent Mapping!")
