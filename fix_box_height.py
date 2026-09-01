import re

with open('src/pages/Attendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('min-h-[400px]', '')

with open('src/pages/Attendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed min-h-[400px] from Attendance.tsx")
