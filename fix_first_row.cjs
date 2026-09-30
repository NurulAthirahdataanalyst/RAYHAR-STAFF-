const fs = require('fs');
let c = fs.readFileSync('src/pages/LeaveAnalytics.tsx', 'utf8');
c = c.replace('<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">\\n        {/* Leave Balance Risk */}', '<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">\\n        {/* Leave Balance Risk */}');
c = c.replace('<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">\n        {/* Leave Balance Risk */}', '<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">\n        {/* Leave Balance Risk */}');
fs.writeFileSync('src/pages/LeaveAnalytics.tsx', c, 'utf8');
