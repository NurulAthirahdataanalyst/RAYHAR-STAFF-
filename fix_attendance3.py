import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Attendance.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r'if \(acc !== undefined\) payload\.accuracy = acc;\n\s*\}\s*else\s*\{\s*if \(lat !== undefined\) payload\.latitude = lat;',
    'if (acc !== undefined) payload.accuracy = acc;\n          if (dist !== undefined) payload.distance = dist;\n        } else {\n          if (lat !== undefined) payload.latitude = lat;',
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated performClockInOrOut")
