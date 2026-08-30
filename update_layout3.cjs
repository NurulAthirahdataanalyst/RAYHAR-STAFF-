const fs = require('fs');
let code = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

// 1. Extract Leave Monitoring Card
const leaveMatch = code.match(/\{\/\* 3\. Leave Monitoring \*\/\}\s*<Card className=\{`col-span-1 border border-slate-100[\s\S]*?<\/Card>\s*(?=\{\/\* 6\. Employee Performance & Attendance Ranking \*\/})/);
if (!leaveMatch) {
    console.error("No leave match!");
    process.exit(1);
}
const leaveCode = leaveMatch[0]; // Includes the comment /* 3. Leave Monitoring */ and the full Card.

// 2. Extract HOD Live Cards
const hodCardsMatch = code.match(/\{\/\* HOD & Branch Leader LIVE CARDS \(Only show for these roles, under Branch Distribution\) \*\/\}\s*\{.*includes\(role\) && \(\(\) => \{[\s\S]*?return \(\s*<div className="grid grid-cols-1 md:grid-cols-2 gap-6">[\s\S]*?<\/div>\s*\);\s*\}\)\(\)\}/);
if (!hodCardsMatch) {
    console.error("No HOD cards match!");
    process.exit(1);
}
let hodCardsCode = hodCardsMatch[0];

// 3. Remove HOD Live Cards from its original spot
code = code.replace(hodCardsMatch[0], '');

// 4. Modify HOD Live Cards
hodCardsCode = hodCardsCode.replace(
  /<div className="grid grid-cols-1 md:grid-cols-2 gap-6">/,
  `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">`
);
hodCardsCode = hodCardsCode.replace(
  /<\/div>\s*\);\s*\}\)\(\)\}/,
  `  ${leaveCode.replace(/\$/g, '$$$$')}
                  </div>
                );
              })()}`
);

// 5. In original Leave Monitoring location, wrap it for NON-HOD
code = code.replace(
  leaveCode,
  `{!['head_of_department', 'branch_leader'].includes(role) && (
            ${leaveCode.replace(/\$/g, '$$$$')}
          )}
          `
);

// 6. Make Employee Performance span 3 if HOD
code = code.replace(
  /\{\/\* 6\. Employee Performance & Attendance Ranking \*\/\}\s*<Card className=\{`col-span-1 lg:col-span-2/g,
  `{/* 6. Employee Performance & Attendance Ranking */}
          <Card className={\`col-span-1 \${['head_of_department', 'branch_leader'].includes(role) ? 'lg:col-span-3' : 'lg:col-span-2'}`
);

// 7. Inject HOD Live Cards before the grid that contains Leave Monitoring
// Find `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">` that is before `/* 3. Leave Monitoring */`
// Wait, the grid opening is `        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">\n          {/* 3. Leave Monitoring */}`
// But I already replaced `/* 3. Leave Monitoring */` with my non-HOD wrapper.
// So let's replace `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">` directly?
// Wait, there are multiple `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">`? Let's check `WorkforceInsights.tsx`.
code = code.replace(
  /<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">\s*(?:\{!\['head_of_department', 'branch_leader'\]\.includes\(role\) && \()/,
  `${hodCardsCode.replace(/\$/g, '$$$$')}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {!['head_of_department', 'branch_leader'].includes(role) && (`
);

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', code);
console.log("Updated WorkforceInsights.tsx beautifully!");
