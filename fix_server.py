import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\backend\\server.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_select = """      const queryStr = `
        SELECT 
          b.code, 
          b.name,
          b.location,
          b.operating_zone,"""

new_select = """      const queryStr = `
        SELECT 
          b.code, 
          b.name,
          b.location,
          b.operating_zone,
          b.latitude,
          b.longitude,
          b.radius,"""

content = content.replace(old_select, new_select)

old_put = """      const { name, location, latitude, longitude, radius, zone } = req.body;
      await pool.query(
        `UPDATE branches SET name = ?, location = ?, latitude = ?, longitude = ?, radius = ?, operating_zone = ? WHERE code = ?`,
        [name, location, latitude || null, longitude || null, radius || 50, zone || 'ZONE_B', req.params.code]
      );"""

new_put = """      const { name, location, latitude, longitude, radius, zone, operating_zone } = req.body;
      await pool.query(
        `UPDATE branches SET name = ?, location = ?, latitude = ?, longitude = ?, radius = ?, operating_zone = ? WHERE code = ?`,
        [name, location, latitude || null, longitude || null, radius || 50, zone || operating_zone || 'ZONE_B', req.params.code]
      );"""

content = content.replace(old_put, new_put)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated server.js")
