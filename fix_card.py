import os

path = r"src\components\shared\EmployeesRequiringAttentionCard.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace props
old_props = "export const EmployeesRequiringAttentionCard = ({ data = [], variant = 'grid' }: { data?: EmployeeAttentionData[], variant?: 'compact' | 'grid' }) => {"
new_props = "export const EmployeesRequiringAttentionCard = ({ data = [], variant = 'grid', onEmployeeClick }: { data?: EmployeeAttentionData[], variant?: 'compact' | 'grid', onEmployeeClick?: (id: string) => void }) => {"
content = content.replace(old_props, new_props)

# Find onClick={() => navigate('/employees')} and replace with onClick logic if they click the ROW
old_onclick = "onClick={() => navigate('/employees')}"
new_onclick = "onClick={() => onEmployeeClick ? onEmployeeClick(item.id) : navigate('/employees')}"

# There are multiple navigate('/employees')
# 1. on the row chevron:
content = content.replace(old_onclick, new_onclick, 1)

# Wait, there's a view all button too
# Let's just replace all except the last one (View All)
# Actually, the user said "click any name", so we can make the name clickable!

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated card")
