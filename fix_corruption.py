import sys
import re

file_path = 'src/pages/Dashboard.tsx'
with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

content = content.replace("VIEW ALL HISTORY \xef\xbf\xbd+'", "VIEW ALL HISTORY")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

file_path = 'src/pages/Calendar.tsx'
with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content2 = f.read()

content2 = content2.replace("\xef\xbf\xbd", "")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content2)
