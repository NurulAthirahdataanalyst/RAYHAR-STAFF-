import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\backend\\server.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update /api/attendance to accept distance
content = content.replace(
    "const { user_id, location, attendance_type, latitude, longitude, accuracy } = req.body;",
    "const { user_id, location, attendance_type, latitude, longitude, accuracy, distance } = req.body;"
)

content = content.replace(
    "`INSERT INTO attendances (user_id, clock_in, location, attendance_type) VALUES (?, NOW(), ?, ?)`,\n        [user_id, finalLocation, finalType]",
    "`INSERT INTO attendances (user_id, clock_in, location, attendance_type, distance_meters) VALUES (?, NOW(), ?, ?, ?)`,\n        [user_id, finalLocation, finalType, distance || null]"
)

# 2. Update /api/attendance/history SELECT query
content = content.replace(
    "TO_CHAR(clock_out AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') AS time_out,\n          DATE(clock_in) AS date",
    "TO_CHAR(clock_out AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') AS time_out,\n          DATE(clock_in) AS date,\n          distance_meters"
)

# 3. Update late string formatting
old_late = """          if (isLate && !workHours.off) {
            const clockInMins = clockInHour * 60 + clockInMinute;
            const thresholdMins = lateH * 60 + lateM;
            const diff = clockInMins - thresholdMins;
            late = `${diff} mins`;
            status = "LATE";
          } else {
            late = "00:00";
          }"""

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
content = content.replace(old_late, new_late)

# Also update the response payload
content = content.replace(
    "duration: duration,\n          location_type: location_type,\n          location_name: location_name,",
    "duration: duration,\n          location_type: location_type,\n          location_name: location_name,\n          distance: clockRow ? clockRow.distance_meters : null,"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated server.js")
