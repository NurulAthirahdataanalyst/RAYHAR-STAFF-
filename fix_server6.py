import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\backend\\server.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update /api/attendance to accept distance
content = re.sub(
    r'const \{ user_id, location, attendance_type, latitude, longitude, accuracy \} = req\.body;',
    'const { user_id, location, attendance_type, latitude, longitude, accuracy, distance } = req.body;',
    content
)

content = re.sub(
    r'`INSERT INTO attendances \(user_id, clock_in, location, attendance_type\) VALUES \(\?, NOW\(\), \?, \?\)`,\s*\[user_id, finalLocation, finalType\]',
    '`INSERT INTO attendances (user_id, clock_in, location, attendance_type, distance_meters) VALUES (?, NOW(), ?, ?, ?)`,\n        [user_id, finalLocation, finalType, distance || null]',
    content
)

# 2. Update /api/attendance/history SELECT query
content = re.sub(
    r"TO_CHAR\(clock_out AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM'\) AS time_out,\s*DATE\(clock_in\) AS date",
    "TO_CHAR(clock_out AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') AS time_out,\n          DATE(clock_in) AS date,\n          distance_meters",
    content
)

# 3. Update late string formatting
new_late = """          if (isLate && !workHours.off) {
            const clockInMins = clockInHour * 60 + clockInMinute;
            const thresholdMins = lateH * 60 + lateM;
            const diff = clockInMins - thresholdMins;
            const diffH = Math.floor(diff / 60);
            const diffM = diff % 60;
            late = `${diffH.toString().padStart(2, '0')}h ${diffM.toString().padStart(2, '0')}m`;
            status = "LATE";
          } else {
            late = "00h 00m";
          }"""
content = re.sub(
    r'if \(isLate && !workHours\.off\) \{.*?late = `\$\{diff\} mins`;.*?status = "LATE";.*?\} else \{.*?late = "00:00";.*?\}',
    new_late,
    content,
    flags=re.DOTALL
)

# Also update the response payload
content = re.sub(
    r'duration: duration,\s*location_type: location_type,\s*location_name: location_name,',
    'duration: duration,\n          location_type: location_type,\n          location_name: location_name,\n          distance: clockRow ? clockRow.distance_meters : null,',
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated server.js")
