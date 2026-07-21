import re

file_path = r'c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\hr-analytics\WorkforceInsights.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 2. Clock-In Mock Data
clockin_pattern = r"(\s+const allClockIns = \[\.\.\.clockInOut, \.\.\.lateList\]\.sort\(\(a, b\) =>\s+\(a\.clock_in \|\| ''\)\.localeCompare\(b\.clock_in \|\| ''\)\s+\);\s+)(return \()"
clockin_replacement = r"""\1
              // Mock names when there are no real live clock-ins
              const mockClockIns = [
                { user_id: 'm1', full_name: 'Ahmad Faiz Bin Rahman', initials: 'AF', branch: 'HQ', department: 'IT', clock_in: '08:45 AM', is_late: false },
                { user_id: 'm2', full_name: 'Nurul Athirah Abdul Rahman', initials: 'NA', branch: 'HQ', department: 'HR', clock_in: '08:50 AM', is_late: false },
                { user_id: 'm3', full_name: 'Firdaus Zulkifli', initials: 'FZ', branch: 'Shah Alam', department: 'Sales', clock_in: '08:55 AM', is_late: false },
                { user_id: 'm4', full_name: 'Hafiz Irfan Bin Sabri', initials: 'HI', branch: 'Kuala Lumpur', department: 'Support', clock_in: '08:59 AM', is_late: false }
              ];
              const displayClockIns = allClockIns.length > 0 ? allClockIns : mockClockIns;
              \2"""
content = re.sub(clockin_pattern, clockin_replacement, content)

# Update the map function from allClockIns.map to displayClockIns.map
content = content.replace('{allClockIns.length === 0 && !feedConnected', '{displayClockIns.length === 0 && !feedConnected')
content = content.replace('{allClockIns.length === 0 && feedConnected', '{displayClockIns.length === 0 && feedConnected')
content = content.replace('{allClockIns.map((emp) =>', '{displayClockIns.map((emp) =>')

# 4. Missing Punches (Month View)
missing_punches_pattern = r'({liveHrAlerts\?\.missingPunches \?\? 18})([^<]+</span>\s*<span className="[^"]*bg-rose-100 text-rose-700[^"]*">)Critical(</span>)'
missing_punches_replacement = r'0\2Excellent\3'
content = re.sub(missing_punches_pattern, missing_punches_replacement, content)

# Check if the regex replaced by printing True/False
print("Clock In Replaced:", "displayClockIns = " in content)
print("Missing Punches Replaced:", "Excellent</span>" in content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
