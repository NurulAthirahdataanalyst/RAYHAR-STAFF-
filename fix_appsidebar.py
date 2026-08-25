import re

with open('src/components/layout/AppSidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Temporary Assignments to hodMenuItems
old_hod = '      { title: "Employee Directory", icon: Users, path: "/employees", roles: HOD_BL_ROLES },\\n      {'
new_hod = '      { title: "Employee Directory", icon: Users, path: "/employees", roles: HOD_BL_ROLES },\\n      { title: "Temporary Assignments", icon: Briefcase, path: "/branches/temporary-assignments", roles: HOD_BL_ROLES },\\n      {'

content = content.replace('      { title: "Employee Directory", icon: Users, path: "/employees", roles: HOD_BL_ROLES },\n      {',
                          '      { title: "Employee Directory", icon: Users, path: "/employees", roles: HOD_BL_ROLES },\n      { title: "Temporary Assignments", icon: Briefcase, path: "/branches/temporary-assignments", roles: HOD_BL_ROLES },\n      {')

if 'import { Briefcase' not in content:
    content = content.replace('import { ', 'import { Briefcase, ')

with open('src/components/layout/AppSidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AppSidebar.tsx")
