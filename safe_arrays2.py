import re

file_path = "src/pages/Employees.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'req.approval_history.map',
    '(req.approval_history || []).map'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated Employees.tsx")
