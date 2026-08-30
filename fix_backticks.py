import codecs

file_path = 'src/pages/hr-analytics/AttendanceDashboard.tsx'
with codecs.open(file_path, 'r', 'utf-8') as f:
    content = f.read()

# Let's just fix it line by line
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'elative overflow-hidden border border-gray-200' in line:
        lines[i] = line.replace('elative overflow', '\elative overflow')
        print('Found broken backtick line')
        
content = '\n'.join(lines)
with codecs.open(file_path, 'w', 'utf-8') as f:
    f.write(content)
