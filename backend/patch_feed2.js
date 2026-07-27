const fs = require('fs');
const path = require('path');

// 1. Patch server.js
const serverFile = path.join(__dirname, '../backend/server.js');
let serverContent = fs.readFileSync(serverFile, 'utf8');

// B. Update /api/employees query
const selectRegex = /today\.clock_in AS today_clock_in,\s*today\.clock_out AS today_clock_out/g;
serverContent = serverContent.replace(
  selectRegex, 
  'today.clock_in AS today_clock_in,\n        today.clock_out AS today_clock_out,\n        today.attendance_type AS today_attendance_type,\n        today.location AS today_location'
);

const subqueryRegex = /SELECT a\.user_id, a\.clock_in, a\.clock_out/g;
serverContent = serverContent.replace(
  subqueryRegex,
  'SELECT a.user_id, a.clock_in, a.clock_out, a.attendance_type, a.location'
);

fs.writeFileSync(serverFile, serverContent, 'utf8');
console.log("server.js global patch applied!");
