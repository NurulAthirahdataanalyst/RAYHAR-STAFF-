with open('src/pages/outstation/OutstationDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('w-2.5 h-2.5 rounded-full bg-', 'w-2.5 h-2.5 shrink-0 rounded-full bg-')

with open('src/pages/outstation/OutstationDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)