const fs = require('fs');
let code = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

// 1. Extract Leave Monitoring Card
const leaveMatch = code.match(/\{\/\* 3\. Leave Monitoring \*\/\}\s*<Card className=\{`col-span-1[\s\S]*?<\/Card>\s*\{\/\* 6\. Employee Performance & Attendance Ranking \*\/\}/);
if (!leaveMatch) {
  console.log("Could not find Leave Monitoring Card");
  process.exit(1);
}
const leaveMonitoringCode = leaveMatch[0].replace(/\s*\{\/\* 6\. Employee Performance & Attendance Ranking \*\/\}/, '');

// 2. Replace the old Leave Monitoring with conditionally rendering it for NON-HOD/BL
code = code.replace(
  /\{\/\* 3\. Leave Monitoring \*\/\}\s*<Card className=\{`col-span-1[\s\S]*?<\/Card>\s*\{\/\* 6\. Employee Performance & Attendance Ranking \*\/\}/,
  `{!['head_of_department', 'branch_leader'].includes(role) && (
            ${leaveMonitoringCode.replace(/\$/g, '$$$$')}
          )}
          {/* 6. Employee Performance & Attendance Ranking */}`
);

// 3. Make Employee Performance Card span 3 cols if HOD/BL
code = code.replace(
  /\{\/\* 6\. Employee Performance & Attendance Ranking \*\/\}\s*<Card className=\{`col-span-1 lg:col-span-2/g,
  `{/* 6. Employee Performance & Attendance Ranking */}
          <Card className={\`col-span-1 \${['head_of_department', 'branch_leader'].includes(role) ? 'lg:col-span-3' : 'lg:col-span-2'}`
);

// 4. Extract HOD & Branch Leader LIVE CARDS
const hodLiveCardsMatch = code.match(/\{\/\* HOD & Branch Leader LIVE CARDS \(Only show for these roles, under Branch Distribution\) \*\/\}\s*\{.*includes\(role\) && \(\(\) => \{[\s\S]*?return \(\s*<div className="grid grid-cols-1 md:grid-cols-2 gap-6">[\s\S]*?<\/div>\s*\);\s*\}\)\(\)\}/);

if (!hodLiveCardsMatch) {
  console.log("Could not find HOD Live Cards");
  process.exit(1);
}

let hodLiveCardsCode = hodLiveCardsMatch[0];

// Remove the extracted HOD Live Cards from its original place (inside lg:col-span-2)
code = code.replace(hodLiveCardsMatch[0], '');

// 5. Inject HOD Live Cards BEFORE the <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> that contains Leave Monitoring and Employee Performance.
// Wait, the grid that contains Leave Monitoring is: `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">` right after the Row 2 grid.
// Let's modify hodLiveCardsCode to include the Leave Monitoring Card as the 3rd column!
hodLiveCardsCode = hodLiveCardsCode.replace(
  /<div className="grid grid-cols-1 md:grid-cols-2 gap-6">/,
  `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">`
);
// Now we add the Leave Monitoring Card inside the return of HOD Live Cards!
hodLiveCardsCode = hodLiveCardsCode.replace(
  /<\/div>\s*\);\s*\}\)\(\)\}/,
  `  ${leaveMonitoringCode.replace(/\$/g, '$$$$')}
                  </div>
                );
              })()}`
);

// Find the end of `Team Availability` card which is followed by `</div>` that closes `grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start`.
// Let's inject it right after that grid closes.
const injectionPoint = `          </div>\n\n          {/* BOTTOM SECTION: LIVE CARDS */}`;
code = code.replace(
  /          <\/div>\s*\{\/\* BOTTOM SECTION: LIVE CARDS \*\/\}/,
  `          </div>\n\n          ${hodLiveCardsCode.replace(/\$/g, '$$$$')}\n\n          {/* BOTTOM SECTION: LIVE CARDS */}`
);

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', code);
console.log("Updated WorkforceInsights layout!");
