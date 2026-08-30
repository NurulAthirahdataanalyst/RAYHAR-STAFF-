const fs = require('fs');

let code = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

code = code.replace(
  /\{\!\['head_of_department', 'branch_leader'\]\.includes\(role\) && \(\s*\{\/\* 3\. Leave Monitoring \*\/\}/g,
  `{!['head_of_department', 'branch_leader'].includes(role) && (`
);

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', code);
console.log('Fixed comment syntax error');
