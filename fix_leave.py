import sys

file_path = 'src/pages/master/LeaveEntitlementManagement.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip().startswith('const [empSearchOpen') or \
       line.strip().startswith('const [empSearchText') or \
       line.strip().startswith('const [checkedEmployees') or \
       line.strip().startswith('const [carryToYear'):
        continue
    new_lines.append(line)

final_lines = []
for line in new_lines:
    final_lines.append(line)
    if 'const [leaveYear, setLeaveYear] = useState' in line:
        final_lines.append('  const [empSearchOpen, setEmpSearchOpen] = useState(false);\n')
        final_lines.append('  const [empSearchText, setEmpSearchText] = useState("");\n')
        final_lines.append('  const [checkedEmployees, setCheckedEmployees] = useState<string[]>([]);\n')
        final_lines.append('  const [carryToYear, setCarryToYear] = useState<string>(new Date().getFullYear().toString());\n')

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)
print('Fixed successfully!')
