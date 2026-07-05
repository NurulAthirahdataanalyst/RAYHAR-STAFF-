const fs = require('fs');

const attFile = 'c:/Users/HP/ATTENDANCE_SYSTEM/src/pages/reports/AttendanceReports.tsx';
const leaveFile = 'c:/Users/HP/ATTENDANCE_SYSTEM/src/pages/reports/LeaveReports.tsx';

let attContent = fs.readFileSync(attFile, 'utf8');
attContent = attContent.replace(/\\`/g, '`');
fs.writeFileSync(attFile, attContent, 'utf8');

let leaveContent = fs.readFileSync(leaveFile, 'utf8');
leaveContent = leaveContent.replace(/\\`/g, '`');
fs.writeFileSync(leaveFile, leaveContent, 'utf8');

console.log('Fixed backticks in both files');
