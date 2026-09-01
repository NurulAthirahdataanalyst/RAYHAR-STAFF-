import re

file_path = "src/pages/LeaveAnalytics.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'payload.map(',
    '(payload || []).map('
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated LeaveAnalytics.tsx payload map")
