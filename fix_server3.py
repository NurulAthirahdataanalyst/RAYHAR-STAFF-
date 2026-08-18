import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\backend\\server.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix GET /api/branches
pattern_get = re.compile(r'(app\.get\("/api/branches",.*?SELECT\s+b\.code,\s+b\.name,\s+b\.location,)(.*?b\.operating_zone)', re.DOTALL)
content = pattern_get.sub(r'\1\n        b.latitude,\n        b.longitude,\n        b.radius,\2', content)

# Fix PUT /api/branches/:code
pattern_put = re.compile(r'(app\.put\("/api/branches/:code",.*?try \{.*?const\s+\{.*?)(\s+zone\s+\}\s+=\s+req\.body;.*?\[.*?)(zone\s*\|\|\s*\'ZONE_B\')', re.DOTALL)
content = pattern_put.sub(r'\1, operating_zone\2zone || operating_zone || \'ZONE_B\'', content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Safe replaced server.js")
