import re

with open('src/pages/Attendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'className="px-3 py-1 text-[11px] font-black rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50"',
    'className="px-3 py-1 text-[11px] font-black rounded-md border border-border bg-background hover:bg-[#942392] hover:text-white hover:border-[#942392] disabled:opacity-50 transition-colors"'
)

with open('src/pages/Attendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
