with open('src/components/shared/StaffProfileDialog.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("Location History (Last 14 Days)", "Location History")

with open('src/components/shared/StaffProfileDialog.tsx', 'w', encoding='utf-8') as f:
    f.write(content)