with open('src/pages/TeamAttendance.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '<TableCell>{emp.clock_in_location || "N/A"}</TableCell>' in line:
        lines[i] = '                  <TableCell>{emp.latitude && emp.longitude ? `${Number(emp.latitude).toFixed(6)}, ${Number(emp.longitude).toFixed(6)}` : (emp.clock_in_location || "N/A")}</TableCell>\n'
        lines[i+1] = '                  <TableCell>{emp.distance_meters != null ? `${Math.round(emp.distance_meters)} m` : "N/A"}</TableCell>\n'
        break

with open('src/pages/TeamAttendance.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
