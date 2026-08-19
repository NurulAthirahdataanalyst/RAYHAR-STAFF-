const fs = require('fs');
const content = fs.readFileSync('src/pages/outstation/OutstationReports.tsx', 'utf8');
const idx = content.indexOf('EVENT NAME');
console.log("idx:", idx);
console.log(content.substring(idx - 200, idx + 3000));
