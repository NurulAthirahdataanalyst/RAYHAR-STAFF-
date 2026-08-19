import re

with open('src/pages/Employees.tsx', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}' in line:
        lines[i+4] = '                      &laquo;\n'
    if 'onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}' in line:
        lines[i+4] = '                      &raquo;\n'
    if 'Formula: (Present Days / Expected Working Days)' in line:
        lines[i] = re.sub(r'A.*?" 100', '* 100', line)
    if 'Formula: (Approved Leave / Total Entitled)' in line:
        lines[i] = re.sub(r'A.*?" 100', '* 100', line)
    if 'Tandatangan' in lines[i-1] if i > 0 else False:
        if 'DISAHKAN' in line:
            lines[i] = '                            {req.cuti_tanpa_gaji_signature ? "DISAHKAN" : "TIADA PENGESAHAN"}\n'

with open('src/pages/Employees.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
