import re

with open('src/pages/Employees.tsx', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

content = re.sub(r'A\s*?\S*?\s*?100', '* 100', content)
content = re.sub(r'A\s*?,\s*?A\s*?ID', '• ID', content)
content = re.sub(r'A\s*?,\s*?A\s*?', '• ', content)
content = re.sub(r'A\s*?"\s*?o', '', content)
content = re.sub(r'A\s*?,\s*?A\s*?', '• ', content)

# Check any other A artifact (we can't just replace 'A'!)
# So let's look for known strings:
content = content.replace(') A?" 100', ') * 100')
content = content.replace('A,A', '•')

with open('src/pages/Employees.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
