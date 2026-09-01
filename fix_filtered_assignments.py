import codecs
import re

with codecs.open('src/pages/outstation/OutstationAnalytics.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()

for i in range(125, min(260, len(lines))):
    lines[i] = re.sub(r'assignments\.forEach\(\(a\)', r'filteredAssignments.forEach((a)', lines[i])
    lines[i] = re.sub(r'assignments\.filter\(a =>', r'filteredAssignments.filter(a =>', lines[i])
    lines[i] = re.sub(r'assignments\.map\(a =>', r'filteredAssignments.map(a =>', lines[i])
    lines[i] = re.sub(r'assignments\.length', r'filteredAssignments.length', lines[i])
    lines[i] = re.sub(r'\[assignments\]\)', r'[filteredAssignments])', lines[i])
    
    if "const allRecentAssignments = useMemo(() => assignments" in lines[i]:
        lines[i] = lines[i].replace("assignments", "filteredAssignments")
    elif "const totalEventsCount = eventGroups.length > 0 ? eventGroups.length : assignments.length;" in lines[i]:
        lines[i] = lines[i].replace("assignments.length", "filteredAssignments.length")

with codecs.open('src/pages/outstation/OutstationAnalytics.tsx', 'w', 'utf-8') as f:
    f.writelines(lines)

print("Updated filteredAssignments")
