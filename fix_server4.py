import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\backend\\server.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("b.location,\n        b.operating_zone,", "b.location,\n        b.latitude,\n        b.longitude,\n        b.radius,\n        b.operating_zone,")

content = content.replace("const { name, location, latitude, longitude, radius, zone } = req.body;", "const { name, location, latitude, longitude, radius, zone, operating_zone } = req.body;")

content = content.replace("[name, location, latitude || null, longitude || null, radius || 50, zone || 'ZONE_B', req.params.code]", "[name, location, latitude || null, longitude || null, radius || 50, zone || operating_zone || 'ZONE_B', req.params.code]")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated server.js")
