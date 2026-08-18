import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\backend\\server.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the redeclaration syntax error
content = re.sub(
    r'      const \[outstationRows\] = await pool\.query\(\n\s*`SELECT destination FROM outstation_assignments WHERE user_id = \? AND status != \'Cancelled\' AND \(CURRENT_TIMESTAMP AT TIME ZONE \'Asia/Kuala_Lumpur\'\)::date BETWEEN \(start_date AT TIME ZONE \'Asia/Kuala_Lumpur\'\)::date AND \(end_date AT TIME ZONE \'Asia/Kuala_Lumpur\'\)::date`,\n\s*\[empId\]\n\s*\);\n\s*const isOnOutstation = outstationRows\.length > 0;',
    '',
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed syntax error")
