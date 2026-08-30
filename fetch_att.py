import codecs

with codecs.open('src/pages/Attendance.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'className=' in line and 'bg-card' in line and 'border' in line:
        print(f"Line {i}: {line.strip()}")
