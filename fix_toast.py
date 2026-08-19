import re

with open('src/pages/Attendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'toast({ title: "Location Updated", description: "Your outstation location has been logged." });',
    'toast({ title: "Location Updated", description: "Your current location has been securely logged." });'
)

with open('src/pages/Attendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
