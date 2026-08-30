const fs = require('fs');
let content = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf-8');

const regexToRemove = /^[ \t]*const scopeLabel = role === "head_of_department".*\r?\n/gm;
content = content.replace(regexToRemove, '');

const useRoleLine = '  const { role, userBranch, userDepartment, userId } = useRole();';
content = content.replace(useRoleLine, useRoleLine + '\n  const scopeLabel = role === "head_of_department" || role === "hod" ? userDepartment : (role === "branch_leader" ? userBranch : "");');

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', content);
