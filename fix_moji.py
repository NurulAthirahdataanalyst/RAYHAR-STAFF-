with open('src/pages/Employees.tsx', 'rb') as f:
    content = f.read().decode('utf-8', errors='ignore')

# Fix pagination left
content = content.replace('A,A\xab', '&laquo;')
content = content.replace('A,A\xbb', '&raquo;')
content = content.replace('A,A', '&laquo;')
content = content.replace('A,A', '&raquo;') # This is ambiguous so let's just replace all weird ones.

with open('src/pages/Employees.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
