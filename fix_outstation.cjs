const fs = require('fs');
let content = fs.readFileSync('_temp_old_pages/src/pages/outstation/OutstationReports.tsx', 'utf8');
content = content.replace(/<PageActions>([\s\S]*?)<\/PageActions>/, '<div className=\"mb-4\">$1</div>');
fs.writeFileSync('src/pages/outstation/OutstationReports.tsx', content);
