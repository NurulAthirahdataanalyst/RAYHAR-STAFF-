const fs = require('fs');

let content = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf-8');

// Remove from top level
content = content.replace(
  '  const scopeLabel = role === "head_of_department" || role === "hod" ? userDepartment : (role === "branch_leader" ? userBranch : "");\n',
  ''
);

// Add inside component
content = content.replace(
  '  const { role, userBranch, userDepartment, userId } = useRole();\n',
  '  const { role, userBranch, userDepartment, userId } = useRole();\n  const scopeLabel = role === "head_of_department" || role === "hod" ? userDepartment : (role === "branch_leader" ? userBranch : "");\n'
);

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', content);
console.log('Fixed WorkforceInsights.tsx');
