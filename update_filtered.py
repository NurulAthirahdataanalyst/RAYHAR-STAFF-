with open('src/pages/outstation/OutstationAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_filtered = """  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      if (!a.start_date) return false;
      return a.start_date.startsWith(selectedYear);
    });
  }, [assignments, selectedYear]);"""

new_filtered = """  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      if (!a.start_date) return false;
      if (!a.start_date.startsWith(selectedYear)) return false;
      if (selectedMonth !== "all") {
        const m = (parseInt(selectedMonth, 10) + 1).toString().padStart(2, '0');
        if (!a.start_date.startsWith(${selectedYear}-)) return false;
      }
      return true;
    });
  }, [assignments, selectedYear, selectedMonth]);"""

content = content.replace(old_filtered, new_filtered)

with open('src/pages/outstation/OutstationAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)