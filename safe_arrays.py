import re
import glob

files_to_check = [
    "src/pages/LeaveAnalytics.tsx",
    "src/pages/Employees.tsx",
    "src/pages/hr-analytics/WorkforceInsights.tsx"
]

for file_path in files_to_check:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Safety fallbacks for array mapping
    if "Employees.tsx" in file_path:
        content = content.replace(
            'const formattedData = data.employees.map',
            'const formattedData = (data.employees || []).map'
        )
        content = content.replace(
            'new Set(dbEmployees.map',
            'new Set((dbEmployees || []).map'
        )
        content = content.replace(
            '...filtered.map',
            '...((filtered || [])).map'
        )
        content = content.replace(
            'uniqueBranches.map',
            '(uniqueBranches || []).map'
        )
        content = content.replace(
            'uniquePositions.map',
            '(uniquePositions || []).map'
        )
        content = content.replace(
            'currentItems.map',
            '(currentItems || []).map'
        )
        content = content.replace(
            'branchesList.map',
            '(branchesList || []).map'
        )
        content = content.replace(
            'departmentsList.map',
            '(departmentsList || []).map'
        )
        content = content.replace(
            'availableRoles.filter(r => r.status === \'Active\').map',
            '(availableRoles || []).filter(r => r.status === \'Active\').map'
        )
        
    elif "LeaveAnalytics.tsx" in file_path:
        content = content.replace(
            'absentData.data.map',
            '(absentData.data || []).map'
        )
        content = content.replace(
            'outstationData.data.map',
            '(outstationData.data || []).map'
        )
        content = content.replace(
            'onLeaveData.data.map',
            '(onLeaveData.data || []).map'
        )
        content = content.replace(
            'presentData.attendance.filter((a: any) => a.clock_in).map',
            '(presentData.attendance || []).filter((a: any) => a.clock_in).map'
        )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Added safe array maps")
