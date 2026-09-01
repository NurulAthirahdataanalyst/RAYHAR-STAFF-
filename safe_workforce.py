import re

file_path = "src/pages/hr-analytics/WorkforceInsights.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix data.performance.topAttendance / topLate
content = content.replace(
    'data.performance.topAttendance.length > 0 ? data.performance.topAttendance.map',
    'data?.performance?.topAttendance?.length > 0 ? data.performance.topAttendance.map'
)
content = content.replace(
    'data.performance.topLate.length > 0 ? data.performance.topLate.map',
    'data?.performance?.topLate?.length > 0 ? data.performance.topLate.map'
)

# And payload? Wait, Recharts tooltip doesn't have payload here, it's just donutData and leaveData
content = content.replace(
    'donutData.map(',
    '(donutData || []).map('
)
content = content.replace(
    'leaveData.map(',
    '(leaveData || []).map('
)

# displayClockIns, displayAbsent, lateList, absentList, activeOutstationList, upcomingOutstationList
content = content.replace('displayClockIns.map(', '(displayClockIns || []).map(')
content = content.replace('displayAbsent.map(', '(displayAbsent || []).map(')
content = content.replace('lateList.map(', '(lateList || []).map(')
content = content.replace('absentList.map(', '(absentList || []).map(')
content = content.replace('activeOutstationList.map(', '(activeOutstationList || []).map(')
content = content.replace('upcomingOutstationList.map(', '(upcomingOutstationList || []).map(')
content = content.replace('pendingApprovalsList.map(', '(pendingApprovalsList || []).map(')
content = content.replace('activeAndUpcomingAssignments.slice(0, 5).map(', '(activeAndUpcomingAssignments || []).slice(0, 5).map(')
content = content.replace('baseTrendData.map(', '(baseTrendData || []).map(')
content = content.replace('filteredBranches.map(', '(filteredBranches || []).map(')
content = content.replace('displayEmps.map(', '(displayEmps || []).map(')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated WorkforceInsights.tsx")
