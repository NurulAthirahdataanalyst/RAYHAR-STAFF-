import re

file_path = 'src/pages/hr-analytics/WorkforceCalendar.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We'll inject the useEffect right before `const calDays = useMemo(...)`
injection = """
  // Fetch Daily Attendance when selectedDay changes
  useEffect(() => {
    if (!selectedDay || !isMounted.current) return;
    const fetchDailyData = async () => {
      setLoadingDaily(true);
      try {
        const dateStr = format(selectedDay, 'yyyy-MM-dd');
        const [dailyRes, absentRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/reports/daily-attendance?date=${dateStr}&role=${encodeURIComponent(role || "")}&branch=${encodeURIComponent(userBranch || "")}&department=${encodeURIComponent(userDepartment || "")}`),
          fetch(`${API_BASE_URL}/api/reports/absent-employees?date=${dateStr}&role=${encodeURIComponent(role || "")}&branch=${encodeURIComponent(userBranch || "")}&department=${encodeURIComponent(userDepartment || "")}`)
        ]);
        
        let allAtt: any[] = [];
        
        if (dailyRes.ok) {
           const d = await dailyRes.json();
           if (d.success && d.report) allAtt = [...d.report];
        }
        
        if (absentRes.ok) {
           const d = await absentRes.json();
           if (d.success && d.report) {
               const absents = d.report.map((x: any) => ({
                  ...x,
                  status: "Absent"
               }));
               allAtt = [...allAtt, ...absents];
           }
        }
        
        if (isMounted.current) {
           setDailyAttendance(allAtt);
        }
      } catch (err) {
        console.error("Failed to fetch daily stats", err);
      } finally {
        if (isMounted.current) setLoadingDaily(false);
      }
    };
    
    fetchDailyData();
  }, [selectedDay, role, userBranch, userDepartment]);

  // Calendar grid
"""

content = re.sub(r'// Calendar grid\s+const calDays = useMemo', injection + '  const calDays = useMemo', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected daily attendance fetching effect.")
