import sys

file_path = 'src/pages/Employees.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
inserted = False
for line in lines:
    new_lines.append(line)
    if 'const [search, setSearch] = useState' in line and not inserted:
        new_lines.append('  const [empSearchOpen, setEmpSearchOpen] = useState(false);\n')
        new_lines.append('  const [empSearchText, setEmpSearchText] = useState("");\n')
        new_lines.append('  const [checkedEmployees, setCheckedEmployees] = useState<string[]>([]);\n')
        inserted = True

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Updated successfully')
