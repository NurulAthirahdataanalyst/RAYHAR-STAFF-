import re

file_path = 'src/components/shared/EmployeesRequiringAttentionCard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_div = '<div key={emp.id || idx} className=\"border border-slate-300 dark:border-slate-700 rounded-2xl p-4 hover:border-slate-300 hover:shadow-md transition-all group flex flex-col bg-slate-50/30\">'
new_div = '<div key={emp.id || idx} onClick={() => onEmployeeClick ? onEmployeeClick(emp.id) : navigate(\'/employees\')} className=\"border border-slate-300 dark:border-slate-700 rounded-2xl p-4 hover:border-slate-300 hover:shadow-md transition-all group flex flex-col bg-slate-50/30 cursor-pointer\">'

if old_div in content:
    content = content.replace(old_div, new_div)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Patched EmployeesRequiringAttentionCard.tsx')
else:
    print('Could not find the card div')
