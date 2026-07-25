import re

file_path = r'C:\Users\HP\ATTENDANCE_SYSTEM\src\pages\hr-analytics\WorkforceInsights.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add the ref and default week check
ref_code = """  const selectedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  const defaultWeekStart = startOfWeek(selectedDate, { weekStartsOn: 6 });
  const isNavigatedWeek = trendWeekStart.getTime() !== defaultWeekStart.getTime();
  const isNavigatedWeekRef = useRef(isNavigatedWeek);
  useEffect(() => {
    isNavigatedWeekRef.current = isNavigatedWeek;
  }, [isNavigatedWeek]);

  const handleDateSelect = (date: Date | undefined) => {"""

content = content.replace("""  const selectedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  const handleDateSelect = (date: Date | undefined) => {""", ref_code)

if ref_code in content:
    print("Injected ref tracking successfully")
else:
    print("Failed to inject ref tracking")

# Now modify the setLiveWeeklyAttendanceTrend call
old_set_live = "setLiveWeeklyAttendanceTrend(d.weeklyAttendanceTrend || null);"
new_set_live = "setLiveWeeklyAttendanceTrend(prev => isNavigatedWeekRef.current ? prev : (d.weeklyAttendanceTrend || null));"

content = content.replace(old_set_live, new_set_live)

if new_set_live in content:
    print("Injected SSE patch successfully")
else:
    print("Failed to inject SSE patch")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
