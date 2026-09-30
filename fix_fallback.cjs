const fs = require('fs');

let n = fs.readFileSync('src/pages/Notifications.tsx', 'utf8');
n = n.replace(
  'msg.includes("submitted a Leave Request") ||',
  'title.includes("submitted a Leave Request") ||\n      msg.includes("submitted a Leave Request") ||'
);
fs.writeFileSync('src/pages/Notifications.tsx', n, 'utf8');

let b = fs.readFileSync('src/components/NotificationBell.tsx', 'utf8');
b = b.replace(
  'n.message.includes("submitted a Leave Request") ||',
  '(n.title && n.title.includes("submitted a Leave Request")) ||\n            n.message.includes("submitted a Leave Request") ||'
);
fs.writeFileSync('src/components/NotificationBell.tsx', b, 'utf8');

console.log('Done!');
