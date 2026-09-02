with open('src/pages/master/Role.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'role.' in line or ' role ' in line:
        pass
        
for i, line in enumerate(lines):
    if 'role' in line and 'role.' not in line and 'roles' not in line:
        pass
