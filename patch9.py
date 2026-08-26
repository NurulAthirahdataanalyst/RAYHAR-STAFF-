import re

file_path = 'src/components/shared/EmployeesRequiringAttentionCard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("fetch(/api/leave-requests)", "fetch(${API_BASE_URL}/api/leave-requests)")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Syntax fixed properly")
