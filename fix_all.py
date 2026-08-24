import sys

file_path = 'src/pages/master/LeaveEntitlementManagement.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
inserted = False
for line in lines:
    new_lines.append(line)
    if 'const [employees, setEmployees] = useState<any[]>([]);' in line and not inserted:
        new_lines.append('  const [empSearchOpen, setEmpSearchOpen] = useState(false);\n')
        new_lines.append('  const [empSearchText, setEmpSearchText] = useState("");\n')
        new_lines.append('  const [checkedEmployees, setCheckedEmployees] = useState<string[]>([]);\n')
        new_lines.append('  const [carryToYear, setCarryToYear] = useState<string>(new Date().getFullYear().toString());\n')
        inserted = True

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)


file_path2 = 'src/pages/outstation/OutstationDashboard.tsx'
with open(file_path2, 'r', encoding='utf-8') as f:
    lines2 = f.readlines()

new_lines2 = []
for line in lines2:
    if 'destination: string; department: string; project: string;' in line:
        line = line.replace('project: string;', 'project: string; purpose?: string;')
    new_lines2.append(line)

with open(file_path2, 'w', encoding='utf-8') as f:
    f.writelines(new_lines2)

print('Updated everything successfully')
