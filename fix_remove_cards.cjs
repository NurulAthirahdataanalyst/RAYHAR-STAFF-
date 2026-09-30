const fs = require('fs');
let c = fs.readFileSync('src/pages/LeaveAnalytics.tsx', 'utf8');

// Change grid-cols-3 to grid-cols-2 for these specific rows
// Row 1 starts before Leave Balance Risk
c = c.replace(
  '<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">\n        {/* Leave Balance Risk */}',
  '<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">\n        {/* Leave Balance Risk */}'
);

// Row 2 starts before Approval Perf
c = c.replace(
  '<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">\n        {/* Approval Perf */}',
  '<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">\n        {/* Approval Perf */}'
);


// Regex to remove Leave Calendar card block
c = c.replace(/\s*\{\/\* Leave Calendar \*\/\}\s*<Card className="border border-slate-200[\s\S]*?<\/Card>/, '');

// Regex to remove Approval Perf card block
c = c.replace(/\s*\{\/\* Approval Perf \*\/\}\s*<Card className="border border-slate-200[\s\S]*?<\/Card>/, '');


fs.writeFileSync('src/pages/LeaveAnalytics.tsx', c, 'utf8');
console.log('Removed cards and set 2 columns!');
