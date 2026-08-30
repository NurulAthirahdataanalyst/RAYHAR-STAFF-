const fs = require('fs');
let code = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

// 1. Update the fetch for work-assignments-all
code = code.replace(
  /fetch\(\`\$\{API_BASE_URL\}\/api\/work-assignments-all\`\)/g,
  'fetch(`${API_BASE_URL}/api/work-assignments-all?${params}`)'
);

// 2. Remove the mock arrays and frontend filtering for ClockIns and Absent
code = code.replace(
  /const filteredClockIns = \[\.\.\.clockInOut, \.\.\.lateList\][\s\S]*?const displayClockIns = filteredClockIns\.length > 0 \? filteredClockIns : mockClockInsHOD;/g,
  `const displayClockIns = [...clockInOut, ...lateList].sort((a, b) => (a.clock_in || '').localeCompare(b.clock_in || ''));`
);

code = code.replace(
  /const filteredAbsent = absentList\.filter\([\s\S]*?const displayAbsent = filteredAbsent\.length > 0 \? filteredAbsent : mockAbsentHOD;/g,
  `const displayAbsent = absentList;`
);

code = code.replace(
  /const displayClockIns = allClockIns\.length > 0 \? allClockIns : mockClockIns;/g,
  `const displayClockIns = allClockIns;`
);

// We should also remove mockClockIns declaration
code = code.replace(
  /\/\/ Mock names when there are no real live clock-ins[\s\S]*?const mockClockIns = \[[^\]]*\];/g,
  ''
);


fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', code);
console.log("Updated WorkforceInsights.tsx");
