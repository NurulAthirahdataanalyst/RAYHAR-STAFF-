import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\backend\\server.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(r'(const isOnLeave = leaveRows\.length > 0;)')
match = pattern.search(content)

new_code = """const isOnLeave = leaveRows.length > 0;

      const [outstationRows] = await pool.query(`
        SELECT * FROM outstation_assignments 
        WHERE user_id = ? AND status != 'Cancelled' AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date BETWEEN (start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date
      `, [empId]);
      
      const isOutstation = outstationRows.length > 0;"""

content = content[:match.start()] + new_code + content[match.end():]

# Now pass it down in the response
pattern2 = re.compile(r'(res\.json\(\{\s*success: true,\s*session:.*?,)\s*(companyLeave: attendanceStatus)')
match2 = pattern2.search(content)

if match2:
    content = content[:match2.start(2)] + "isOnLeave,\n        isOutstation,\n        " + content[match2.start(2):]
else:
    # try another way
    content = content.replace("companyLeave: attendanceStatus", "isOnLeave,\n        isOutstation,\n        companyLeave: attendanceStatus")


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated server.js to return isOutstation")
