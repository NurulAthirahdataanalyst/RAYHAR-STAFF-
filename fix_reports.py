import re

files_to_fix = [
    'src/pages/reports/AttendanceReports.tsx',
    'src/pages/reports/LeaveReports.tsx'
]

for file in files_to_fix:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix link.setAttribute("download", ...)
    if 'attendance_report' in content:
        content = re.sub(
            r'link\.setAttribute\("download", viewType === "day" \? `attendance_report_\$\{date\}\.csv` : `attendance_report_\$\{months\.find\(m => m\.value === selectedMonth\)\?\.label\}_\$\{selectedYear\}\.csv`\);',
            r'link.setAttribute("download", viewType === "day" ? `attendance_report_${date}.csv` : viewType === "month" ? `attendance_report_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.csv` : `attendance_report_${selectedYear}.csv`);',
            content
        )
    if 'leave_report' in content:
        content = re.sub(
            r'link\.setAttribute\("download", viewType === "day" \? `leave_report_\$\{date\}\.csv` : `leave_report_\$\{months\.find\(m => m\.value === selectedMonth\)\?\.label\}_\$\{selectedYear\}\.csv`\);',
            r'link.setAttribute("download", viewType === "day" ? `leave_report_${date}.csv` : viewType === "month" ? `leave_report_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.csv` : `leave_report_${selectedYear}.csv`);',
            content
        )

    # In AttendanceReports, fix Date column
    if 'AttendanceReports.tsx' in file:
        content = content.replace('{viewType === "month" && <TableHead>Date</TableHead>}', '{viewType !== "day" && <TableHead>Date</TableHead>}')
        content = content.replace('{viewType === "month" && <TableCell>{formatDate(req.date)}</TableCell>}', '{viewType !== "day" && <TableCell>{formatDate(req.date)}</TableCell>}')
        content = content.replace('colSpan={viewType === "month" ? 11 : 10}', 'colSpan={viewType !== "day" ? 11 : 10}')
        content = content.replace('const headers = viewType === "day"', 'const headers = viewType === "day"')

    # In LeaveReports, fix Date/Month logic where "year" fetches overlapping months?
    # Wait, the prompt said: "5. Appear data also in July Month , but the Month Picker it is AUGUST, 2026"
    # I should check how LeaveReports filters by selectedMonth.

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done part 1")
