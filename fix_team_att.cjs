const fs = require('fs');
let content = fs.readFileSync('src/pages/TeamAttendance.tsx', 'utf8');

content = content.replace(
  "emp.status === 'Outstation' ? 'bg-blue-100 text-blue-700' :\\n                              'bg-red-100 text-red-700'",
  "emp.status === 'Outstation' ? 'bg-blue-100 text-blue-700' :\\n                              emp.status === 'Approved Leave' || emp.status === 'Company Leave' ? 'bg-blue-100 text-blue-700' :\\n                              'bg-red-100 text-red-700'"
);

fs.writeFileSync('src/pages/TeamAttendance.tsx', content);
console.log('done');