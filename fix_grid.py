import re

file = 'src/pages/master/LeaveEntitlementManagement.tsx'
with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix layout grid
content = content.replace(
    '<div className="grid grid-cols-1 md:grid-cols-3 gap-4">',
    '<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">'
)

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)

print("LeaveEntitlementManagement.tsx grid updated")
