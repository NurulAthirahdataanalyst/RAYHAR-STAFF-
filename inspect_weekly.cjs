const fs = require('fs');
const content = fs.readFileSync('backend/server.js', 'utf8');

const targetStr = 
    // Build Weekly Attendance Trend (CURRENT WEEK ONLY)
    const weeklyMap = {;

const endStr = 
    const weeklyAttendanceTrend = weeklyOrder.map(day => {;

const startIndex = content.indexOf(targetStr);
const endIndex = content.indexOf(endStr);

console.log(content.substring(startIndex, endIndex));