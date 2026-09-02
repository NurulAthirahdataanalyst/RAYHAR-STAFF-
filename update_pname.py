with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('SELECT a.*, p.name, p.department, p.branch', 'SELECT a.*, p.full_name, p.department, p.branch')

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)