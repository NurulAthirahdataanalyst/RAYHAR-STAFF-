with open('src/pages/TeamAttendance.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'const isNoGPS = Number(h.lat)' in line:
        lines.insert(i, '                          const branchData = apiBranches.find((b: any) => b.branch_code === branchName);\n                          if (branchData && branchData.latitude && branchData.longitude && h.lat && h.lng) {\n                            distance = calculateDistance(Number(h.lat), Number(h.lng), Number(branchData.latitude), Number(branchData.longitude));\n                          }\n')
        break

with open('src/pages/TeamAttendance.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
