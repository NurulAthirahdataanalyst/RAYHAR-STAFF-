with open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_logic = """        if (filterBranch !== "__ALL__" && e.branch !== filterBranch) return false;
        if (filterDept !== "__ALL__" && e.department !== filterDept) return false;
        return e.start_date <= dateStr && e.end_date >= dateStr;"""

new_logic = """        if (filterBranch !== "__ALL__" && e.branch !== filterBranch) return false;
        if (filterDept !== "__ALL__" && e.department !== filterDept) return false;
        
        const evStart = e.start_date.substring(0, 10);
        const evEnd = e.end_date.substring(0, 10);
        return evStart <= dateStr && evEnd >= dateStr;"""

if old_logic in text:
    text = text.replace(old_logic, new_logic)
    with open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Fixed!")
else:
    print("Not found")
