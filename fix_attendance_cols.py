import re

file = 'backend/server.js'
with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix daily-attendance query
content = content.replace(
    'SELECT a.user_id, a.clock_in, a.clock_out, a.location, a.attendance_type,\n                TO_CHAR(a.clock_in AT TIME ZONE \'Asia/Kuala_Lumpur\', \'HH12:MI AM\') AS time_in',
    'SELECT a.user_id, a.clock_in, a.clock_out, a.location, a.attendance_type, a.distance_meters, a.clock_in_latitude, a.clock_in_longitude,\n                TO_CHAR(a.clock_in AT TIME ZONE \'Asia/Kuala_Lumpur\', \'HH12:MI AM\') AS time_in'
)

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)

file2 = 'src/pages/reports/AttendanceReports.tsx'
with open(file2, 'r', encoding='utf-8') as f:
    content2 = f.read()

# Fix headers
content2 = content2.replace(
    '        ? ["Employee ID", "Name", "Branch", "Clock In", "Clock Out", "Status", "Working Hours"]\n        : ["Date", "Employee ID", "Name", "Branch", "Clock In", "Clock Out", "Status", "Working Hours"];',
    '        ? ["Employee ID", "Name", "Branch", "Clock In", "Clock Out", "Status", "Working Hours", "Coordinate (Latitude, Longitude)", "Distance", "Location Status"]\n        : ["Date", "Employee ID", "Name", "Branch", "Clock In", "Clock Out", "Status", "Working Hours", "Coordinate (Latitude, Longitude)", "Distance", "Location Status"];'
)

# Fix rows map
old_row_day = r'''            `"${(a.status || '').replace(/"/g, '""')}"`,
            `"${workingHrs}"`
          ];'''
new_row_day = r'''            `"${(a.status || '').replace(/"/g, '""')}"`,
            `"${workingHrs}"`,
            `"${(a.clock_in_latitude && a.clock_in_longitude) ? a.clock_in_latitude + ', ' + a.clock_in_longitude : '-'}"`,
            `"${a.distance_meters ? parseFloat(a.distance_meters).toFixed(2) + ' m' : '-'}"`,
            `"${(a.location || '-').replace(/"/g, '""')}"`
          ];'''

content2 = content2.replace(old_row_day, new_row_day)

# Also fix the TableBody to render these columns
old_table = r'''                            <TableCell>{calculateWorkingHours(req.clock_in, req.clock_out)}</TableCell>
                          </TableRow>'''
new_table = r'''                            <TableCell>{calculateWorkingHours(req.clock_in, req.clock_out)}</TableCell>
                            <TableCell>{(req.clock_in_latitude && req.clock_in_longitude) ? `${req.clock_in_latitude}, ${req.clock_in_longitude}` : "-"}</TableCell>
                            <TableCell>{req.distance_meters ? `${parseFloat(req.distance_meters).toFixed(2)} m` : "-"}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${req.location === 'Outside geo-fence' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {req.location || 'Unknown'}
                              </span>
                            </TableCell>
                          </TableRow>'''

content2 = content2.replace(old_table, new_table)

with open(file2, 'w', encoding='utf-8') as f:
    f.write(content2)

print("Backend and AttendanceReports updated")
