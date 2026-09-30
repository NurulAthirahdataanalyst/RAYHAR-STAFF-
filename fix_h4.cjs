const fs = require('fs');
let c = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

c = c.replace('Top Attendance Performers\n                </h4>', 'Top Attendance Performers\n                </h4>\n                <div className="text-xs text-foreground mt-0.5 mb-2">Employees with the highest attendance rates during the selected period.</div>');

c = c.replace('Highest Late Arrivals\n                </h4>', 'Highest Late Arrivals\n                </h4>\n                <div className="text-xs text-foreground mt-0.5 mb-2">Employees with the most recorded late arrivals.</div>');

c = c.replace('Highest Absent\n                </h4>', 'Highest Absent\n                </h4>\n                <div className="text-xs text-foreground mt-0.5 mb-2">Employees with the highest number of absence records.</div>');

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', c, 'utf8');
console.log('Done!');
