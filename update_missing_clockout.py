with open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """            const presentOnTime = regulars.filter(a => a.status === "Present (On Time)");
            const presentLate = regulars.filter(a => a.status === "Present (Late)" || a.is_late);"""

new_logic = """            const presentOnTime = regulars.filter(a => a.status === "Present (On Time)" || (a.status === "Missing Clock-Out" && !a.is_late));
            const presentLate = regulars.filter(a => a.status === "Present (Late)" || a.is_late || (a.status === "Missing Clock-Out" && a.is_late));"""

content = content.replace(old_logic, new_logic)

with open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)