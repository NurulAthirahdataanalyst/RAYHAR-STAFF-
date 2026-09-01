import re

file_path = "backend/server.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("AND DATE(created_at) <=", "AND (created_at IS NULL OR DATE(created_at) <=")
# Add the closing bracket
content = content.replace("?::date ${filterP}", "?::date) ${filterP}")
content = content.replace("${dateCondition}::date ${profileFilter}", "${dateCondition}::date) ${profileFilter}")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed created_at filter")
