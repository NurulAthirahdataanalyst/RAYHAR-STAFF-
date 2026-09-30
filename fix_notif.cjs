const fs = require('fs');
let c = fs.readFileSync('src/pages/Notifications.tsx', 'utf8');
c = c.replace("msg.includes('submitted a Leave Request')", "msg.includes('submitted a Leave Request') || title.includes('submitted a Leave Request')");
fs.writeFileSync('src/pages/Notifications.tsx', c, 'utf8');
console.log('Done!');
