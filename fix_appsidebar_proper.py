import re

with open('src/components/layout/AppSidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Briefcase to lucide-react imports
content = re.sub(r'(import \{[^\}]*)\b(Users)\b([^\}]*\})', r'\1\2, Briefcase\3', content, count=1)

# Add Temporary Assignments to hodMenuItems
old_hod = '      { title: "Employee Directory", icon: Users, path: "/employees", roles: HOD_BL_ROLES },\n      {'
new_hod = '      { title: "Employee Directory", icon: Users, path: "/employees", roles: HOD_BL_ROLES },\n      { title: "Temporary Assignments", icon: Briefcase, path: "/branches/temporary-assignments", roles: HOD_BL_ROLES },\n      {'

content = content.replace(old_hod, new_hod)

with open('src/components/layout/AppSidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AppSidebar.tsx properly")
