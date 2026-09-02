const fs = require('fs');
let content = fs.readFileSync('src/pages/reports/AttendanceReports.tsx', 'utf8');

content = content.replace(
  "req.status === 'Outstation' ? 'bg-blue-100 text-blue-700' :\\r\\n                                'bg-red-100 text-red-700'",
  "req.status === 'Outstation' ? 'bg-blue-100 text-blue-700' :\\n                                req.status === 'Approved Leave' || req.status === 'Company Leave' ? 'bg-blue-100 text-blue-700' :\\n                                'bg-red-100 text-red-700'"
);
// In case it's \\n
content = content.replace(
  "req.status === 'Outstation' ? 'bg-blue-100 text-blue-700' :\\n                                'bg-red-100 text-red-700'",
  "req.status === 'Outstation' ? 'bg-blue-100 text-blue-700' :\\n                                req.status === 'Approved Leave' || req.status === 'Company Leave' ? 'bg-blue-100 text-blue-700' :\\n                                'bg-red-100 text-red-700'"
);

fs.writeFileSync('src/pages/reports/AttendanceReports.tsx', content);
console.log('done report');