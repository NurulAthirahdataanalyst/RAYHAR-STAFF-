const fs = require('fs');

let lines = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8').split('\n');

// 1. Replace the col-span-3 div
let gridDivIdx = lines.findIndex(l => l.includes('className="col-span-1 xl:col-span-3 grid grid-cols-2 lg:grid-cols-5 gap-4"'));
if (gridDivIdx !== -1) {
    lines[gridDivIdx] = lines[gridDivIdx].replace(
        'className="col-span-1 xl:col-span-3 grid grid-cols-2 lg:grid-cols-5 gap-4"',
        'className={`col-span-1 ${[\'head_of_department\', \'branch_leader\'].includes(role) ? \'xl:col-span-4\' : \'xl:col-span-3\'} grid grid-cols-2 lg:grid-cols-5 gap-4`}'
    );
} else {
    console.log("Could not find grid div!");
}

// 2. Splice lines 701 through 745 and replace with the new condition
// Wait, arrays are 0-indexed. Line 701 is index 700!
// Let's find it dynamically to be safe.
let startIdx = lines.findIndex(l => l.includes("Column 3: Employees By Department or Employee Attendance")) + 1;
let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
    if (lines[i].includes(") : (() => {")) {
        endIdx = i;
        break;
    }
}

if (startIdx !== 0 && endIdx !== -1) {
    lines.splice(startIdx, endIdx - startIdx + 1, `          {!['head_of_department', 'branch_leader'].includes(role) && (() => {`);
} else {
    console.log("Could not find condition block!");
}

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', lines.join('\n'));
console.log("Done");
