import re

file_path = 'src/components/leave/ApprovalStatusTracker.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('["Submit", "Branch Leader", "MD"]', '["Submit", "Branch Leader", "Managing Director"]')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated MD to Managing Director")
