const fs = require('fs');
let code = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

// 1. Extract Leave Monitoring Card
const leaveMatch = code.match(/\{\/\* 3\. Leave Monitoring \*\/\}\s*<Card className=\{`col-span-1[\s\S]*?<\/Card>\s*\{\/\* 6\. Employee Performance & Attendance Ranking \*\/\}/);
const leaveMonitoringCode = leaveMatch[0].replace(/\s*\{\/\* 6\. Employee Performance & Attendance Ranking \*\/\}/, '');

// 2. Extract HOD Live Cards
const hodLiveCardsMatch = code.match(/\{\/\* HOD & Branch Leader LIVE CARDS \(Only show for these roles, under Branch Distribution\) \*\/\}\s*\{.*includes\(role\) && \(\(\) => \{[\s\S]*?return \(\s*<div className="grid grid-cols-1 md:grid-cols-2 gap-6">[\s\S]*?<\/div>\s*\);\s*\}\)\(\)\}/);
let hodLiveCardsCode = hodLiveCardsMatch[0];

// 3. Remove them from their original spots
code = code.replace(leaveMatch[0], `{/* 6. Employee Performance & Attendance Ranking */}`);
code = code.replace(hodLiveCardsMatch[0], '');

// 4. Modify HOD Live Cards to be a 3-column grid containing Leave Monitoring
hodLiveCardsCode = hodLiveCardsCode.replace(
  /<div className="grid grid-cols-1 md:grid-cols-2 gap-6">/,
  `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">`
);
hodLiveCardsCode = hodLiveCardsCode.replace(
  /<\/div>\s*\);\s*\}\)\(\)\}/,
  `  ${leaveMonitoringCode.replace(/\$/g, '$$$$')}
                  </div>
                );
              })()}`
);

// 5. Inject the combined HOD Live Cards BEFORE the BOTTOM SECTION: LIVE CARDS
// Let's use a very reliable anchor: `{/* BOTTOM SECTION: LIVE CARDS */}`
code = code.replace(
  /\{\/\* BOTTOM SECTION: LIVE CARDS \*\/\}/,
  `\n          ${hodLiveCardsCode.replace(/\$/g, '$$$$')}\n\n          {/* BOTTOM SECTION: LIVE CARDS */}`
);

// 6. Conditionally render the remaining original Leave Monitoring? No, we just extracted it. We need to inject it back in the original place but ONLY for NON-HOD/BL.
// Actually, we replaced leaveMatch with just `Employee Performance`.
// So let's replace `Employee Performance` with the non-HOD leave monitoring + Employee Performance.
code = code.replace(
  /\{\/\* 6\. Employee Performance & Attendance Ranking \*\/\}\s*<Card className=\{`col-span-1 lg:col-span-2/g,
  `{!['head_of_department', 'branch_leader'].includes(role) && (
            ${leaveMonitoringCode.replace(/\$/g, '$$$$')}
          )}
          {/* 6. Employee Performance & Attendance Ranking */}
          <Card className={\`col-span-1 \${['head_of_department', 'branch_leader'].includes(role) ? 'lg:col-span-3' : 'lg:col-span-2'}`
);

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', code);
console.log("Updated layout cleanly.");
