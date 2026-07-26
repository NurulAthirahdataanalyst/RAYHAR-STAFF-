const fs = require('fs');
let content = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

// 1. Remove the opening ternary
content = content.replace(
  /\{\s*viewMode === 'day' \? \(\s*<>\s*\{\/\* Redesigned Top Section: 5-column layout \*\/\}/g,
  '{/* Redesigned Top Section: 5-column layout */}'
);

// 2. Add the opening ternary AFTER the top section
content = content.replace(
  /<div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">/g,
  "{viewMode === 'day' ? (\\n          <>\\n      <div className=\\\"grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6\\\">"
);

// 3. Remove the duplicate filters from the Regional Attendance Map card
const regex = /<\/Select>[\s\S]*?<div className="flex items-center gap-3 flex-wrap">[\s\S]*?<ExportDropdown[\s\S]*?\/>\s*<\/div>\s*<\/CardHeader>/g;
content = content.replace(regex, '</Select>\n                </CardHeader>');

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', content);
console.log('Fixed using fix_workforce_2');
