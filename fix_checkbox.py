import codecs
import re

with codecs.open('src/pages/hr-analytics/AttendanceDashboard.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Remove TH
content = re.sub(r'<th className="px-4 py-2 w-4[^>]*?>\s*<Checkbox />\s*</th>', '', content)

# Remove TD
content = re.sub(r'<td className="px-4 py-2">\s*<Checkbox />\s*</td>', '', content)

with codecs.open('src/pages/hr-analytics/AttendanceDashboard.tsx', 'w', 'utf-8') as f:
    f.write(content)
print("Removed Checkbox column!")
