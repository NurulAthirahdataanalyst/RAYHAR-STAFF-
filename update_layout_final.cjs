const fs = require('fs');

let lines = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8').split('\n');

let leaveCode = lines.slice(1339, 1405).join('\n');
let hodCode = lines.slice(1097, 1248).join('\n');
let empPerfLine = lines[1407]; // <Card className={`col-span-1 lg:col-span-2 ...

let newHodCode = hodCode.replace(
  /<div className="grid grid-cols-1 md:grid-cols-2 gap-6">/,
  `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">`
);
newHodCode = newHodCode.replace(
  /<\/div>\s*\);\s*\}\)\(\)\}/,
  `  ${leaveCode.replace(/\$/g, '$$$$')}\n                  </div>\n                );\n              })()}`
);

let newLeaveCode = `{!['head_of_department', 'branch_leader'].includes(role) && (\n${leaveCode}\n)}`;

let newEmpPerfLine = empPerfLine.replace('lg:col-span-2', `\${['head_of_department', 'branch_leader'].includes(role) ? 'lg:col-span-3' : 'lg:col-span-2'}`);

let fullText = lines.join('\n');

// 1. Remove old hodCode
fullText = fullText.replace(hodCode, '');

// 2. Replace old leaveCode
fullText = fullText.replace(leaveCode, newLeaveCode);

// 3. Replace empPerfLine
fullText = fullText.replace(empPerfLine, newEmpPerfLine);

// 4. Inject newHodCode before BOTTOM SECTION
fullText = fullText.replace(
  '{/* BOTTOM SECTION: LIVE CARDS */}',
  `${newHodCode}\n\n        {/* BOTTOM SECTION: LIVE CARDS */}`
);

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', fullText);
console.log("Done!");
