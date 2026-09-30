const fs = require('fs');
let c = fs.readFileSync('src/components/NotificationBell.tsx', 'utf8');
c = c.replace("msg.includes('submitted a Leave Request')", "msg.includes('submitted a Leave Request') || title.includes('submitted a Leave Request')");
fs.writeFileSync('src/components/NotificationBell.tsx', c, 'utf8');
console.log('Done!');
