const fs = require('fs');

let content = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf-8');

// 1. Remove the line entirely from its global position
const lineToRemove = '  const scopeLabel = role === "head_of_department" || role === "hod" ? userDepartment : (role === "branch_leader" ? userBranch : "");\n';
content = content.replace(lineToRemove, '');

// 2. Find where useRole is called inside WorkforceInsights
const useRoleLine = '  const { role, userBranch, userDepartment, userId } = useRole();';
content = content.replace(useRoleLine, useRoleLine + '\n  const scopeLabel = role === "head_of_department" || role === "hod" ? userDepartment : (role === "branch_leader" ? userBranch : "");');

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', content);
console.log('Fixed WorkforceInsights again');
