import sys
import re

file_path = 'src/pages/Dashboard.tsx'
with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Replace all characters that are not ascii, but keep common ones like newlines
content = re.sub(r'VIEW ALL HISTORY[^\n]+', 'VIEW ALL HISTORY', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

file_path2 = 'src/pages/Calendar.tsx'
with open(file_path2, 'r', encoding='utf-8', errors='ignore') as f:
    content2 = f.read()
# Let's just fix Calendar TS errors explicitly if possible.
# Wait, calendar TS error was at 917:124. Let's just strip non-ascii from calendar too.
content2 = re.sub(r'[^\x00-\x7F]+', '', content2)
with open(file_path2, 'w', encoding='utf-8') as f:
    f.write(content2)

