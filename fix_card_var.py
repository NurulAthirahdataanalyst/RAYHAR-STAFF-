import os

path = r"src\components\shared\EmployeesRequiringAttentionCard.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('onEmployeeClick(item.id)', 'onEmployeeClick(emp.id)')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed card mapping variable")
