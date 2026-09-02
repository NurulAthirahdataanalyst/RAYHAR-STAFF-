with open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """            const rawAbsent = regulars.filter(a => a.status === "Absent");
            const absent = rawAbsent.filter(a => !isWeekend(selectedDay, a.branch, a.zone));
            const restDays = rawAbsent.filter(a => isWeekend(selectedDay, a.branch, a.zone));"""

new_logic = """            const backendRestDays = regulars.filter(a => a.status === "Weekend");
            const rawAbsent = regulars.filter(a => a.status === "Absent");
            const absent = rawAbsent.filter(a => !isWeekend(selectedDay, a.branch, a.zone));
            const calculatedRestDays = rawAbsent.filter(a => isWeekend(selectedDay, a.branch, a.zone));
            const restDays = [...backendRestDays, ...calculatedRestDays];"""

content = content.replace(old_logic, new_logic)

with open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)