import re

file_path = "src/components/shared/StaffProfileDialog.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix array maps in StaffProfileDialog.tsx
content = content.replace(
    'const formattedData = data.employees.map',
    'const formattedData = (data.employees || []).map'
)
content = content.replace(
    'new Set(dbEmployees.map',
    'new Set((dbEmployees || []).map'
)
content = content.replace(
    '...filtered.map',
    '...((filtered || [])).map'
)
content = content.replace(
    'paginatedHistory.map(',
    '(paginatedHistory || []).map('
)
content = content.replace(
    'req.approval_history.map(',
    '(req.approval_history || []).map('
)
content = content.replace(
    '{branchesList.map(',
    '{(branchesList || []).map('
)
content = content.replace(
    '{departmentsList.map(',
    '{(departmentsList || []).map('
)
content = content.replace(
    '{availableRoles.filter(r => r.status === \'Active\').map(',
    '{(availableRoles || []).filter(r => r.status === \'Active\').map('
)
content = content.replace(
    'tempAssignmentsHistory.map(',
    '(tempAssignmentsHistory || []).map('
)
content = content.replace(
    'allowedLocations.filter(c => c !== selectedEmployee?.branch).map(',
    '(allowedLocations || []).filter(c => c !== selectedEmployee?.branch).map('
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated StaffProfileDialog.tsx maps")
