with open(r'c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\LeaveAnalytics.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'if (localMonthStr !== selectedMonthYear) return false;' in line:
        lines[i] = "          if (selectedMonthYear.endsWith('-all')) {\n            if (localMonthStr.split('-')[0] !== selectedMonthYear.split('-')[0]) return false;\n          } else if (localMonthStr !== selectedMonthYear) {\n            return false;\n          }\n"
        break

with open(r'c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\LeaveAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
