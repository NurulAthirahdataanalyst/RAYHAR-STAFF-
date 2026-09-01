with open(r'c:\Users\HP\ATTENDANCE_SYSTEM\src\components\shared\StaffProfileDialog.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'const monthStr = dateStr.substring(0, 7); // YYYY-MM' in line:
        lines[i] = "        if (dateStr.endsWith('-all')) {\n          params.append('month', 'all');\n          params.append('year', dateStr.substring(0, 4));\n        } else {\n          const monthStr = dateStr.substring(0, 7); // YYYY-MM\n"
    elif 'const yearStr = dateStr.substring(0, 4);  // YYYY' in line:
        lines[i] = "          const yearStr = dateStr.substring(0, 4);  // YYYY\n"
    elif 'params.append("month", monthStr);' in line:
        lines[i] = "          params.append('month', monthStr);\n"
    elif 'params.append("year", yearStr);' in line:
        lines[i] = "          params.append('year', yearStr);\n        }\n"

with open(r'c:\Users\HP\ATTENDANCE_SYSTEM\src\components\shared\StaffProfileDialog.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
