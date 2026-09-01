import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix role checking logic
def patch_role_logic(match):
    return """let role = req.query.role ? req.query.role.toString().trim().toLowerCase() : "";
    if (role.includes('hr admin') || role === 'hr_admin' || role.includes('hr ')) role = 'hr_admin';
    else if (role.includes('md') || role.includes('managing director')) role = 'managing_director';
    else if (role.includes('branch leader') || role === 'branch_leader') role = 'branch_leader';
    else if (role.includes('finance manager') || role.includes('operation manager') || role.includes('operations manager')) role = 'operation_manager';
    else if (role.includes('head of department') || role.includes('hod') || role === 'head_of_department') role = 'head_of_department';"""

# Replace `let role = req.query.role ...` blocks
pattern = re.compile(r'let role = req\.query\.role \? req\.query\.role\.toString\(\)\.trim\(\)\.toLowerCase\(\) : "";\s*if \(role === \'hr\' \|\| role === \'hr admin\'\) role = \'hr_admin\';\s*if \(role === \'md\' \|\| role === \'managing director\'\) role = \'managing_director\';\s*if \(role === \'branch leader\'\) role = \'branch_leader\';\s*if \(role === \'finance manager\' \|\| role === \'operation manager\' \|\| role === \'operations manager\'\) role = \'operation_manager\';\s*if \(role === \'head of department\' \|\| role === \'hod\'\) role = \'head_of_department\';', re.MULTILINE)

content = pattern.sub(patch_role_logic, content)

# Also fix the requesterRole block in /api/reports/leave-trends
def patch_requester_role(match):
    return """if (requesterRole.includes('hr admin') || requesterRole === 'hr_admin' || requesterRole.includes('hr ')) requesterRole = 'hr_admin';
    else if (requesterRole.includes('md') || requesterRole.includes('managing director')) requesterRole = 'managing_director';
    else if (requesterRole.includes('branch leader') || requesterRole === 'branch_leader') requesterRole = 'branch_leader';
    else if (requesterRole.includes('finance manager') || requesterRole.includes('operation manager') || requesterRole.includes('operations manager')) requesterRole = 'operation_manager';
    else if (requesterRole.includes('head of department') || requesterRole.includes('hod') || requesterRole === 'head_of_department') requesterRole = 'head_of_department';"""

pattern2 = re.compile(r'if \(requesterRole === \'hr\' \|\| requesterRole === \'hr admin\'\) requesterRole = \'hr_admin\';\s*if \(requesterRole === \'md\' \|\| requesterRole === \'managing director\'\) requesterRole = \'managing_director\';\s*if \(requesterRole === \'branch leader\'\) requesterRole = \'branch_leader\';\s*if \(requesterRole === \'finance manager\'\) requesterRole = \'finance_manager\';\s*if \(requesterRole === \'head of department\' \|\| requesterRole === \'hod\'\) requesterRole = \'head_of_department\';', re.MULTILINE)

content = pattern2.sub(patch_requester_role, content)

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched role logic in server.js")
