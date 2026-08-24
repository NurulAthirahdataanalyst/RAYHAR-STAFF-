import sys

file_path = 'src/pages/LeaveManagement.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for idx, line in enumerate(lines):
    # If the line contains className but the previous lines also had className for the same element, we could just remove it.
    # We know exact lines from the build error: 507, 715, 805
    if idx + 1 in [507, 715, 805] and 'className=' in line:
        pass # Skip the duplicate className line
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print('Fixed duplicates')
