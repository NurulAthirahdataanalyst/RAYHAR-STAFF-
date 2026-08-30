const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const oldStr = \[approverUserId, \\\New Leave Request: \\\\, \\\\ submitted a Leave Request and Need Your Approval\\\\n\ • \ • \ Days\\\, 'leave_approval', result.insertId]\;

const newStr = \[approverUserId, \\\\ submitted a Leave Request and Need Your Approval\\\, \\\\ • \ • \ Days\\\, 'leave_approval', result.insertId]\;

code = code.replace(oldStr, newStr);

fs.writeFileSync('backend/server.js', code, 'utf8');
console.log('Done!');
