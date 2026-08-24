import re

file_path = 'src/pages/EmployeeAnalyticsView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_content = re.sub(r'dot={\(props: any\) => \{[\s\S]*?\}\}', "dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }}", content)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Fixed line')
