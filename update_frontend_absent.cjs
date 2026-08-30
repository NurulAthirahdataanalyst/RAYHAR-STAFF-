const fs = require('fs');
let code = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

code = code.replace(
  /const mockAbsentHOD = \[\s*\{[^}]*\}\s*\];\s*const displayAbsent = filteredAbsent\.length > 0 \? filteredAbsent : mockAbsentHOD;/g,
  `const displayAbsent = absentList;`
);

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', code);
console.log("Updated WorkforceInsights.tsx again");
