import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\backend\\server.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("b.location,", "b.location, b.latitude, b.longitude, b.radius,")
content = content.replace("const { name, location, latitude, longitude, radius, zone } = req.body;", "const { name, location, latitude, longitude, radius, zone, operating_zone } = req.body;")
content = content.replace("zone || 'ZONE_B'", "zone || operating_zone || 'ZONE_B'")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("done")
