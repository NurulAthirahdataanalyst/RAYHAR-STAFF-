const fs = require('fs'); 
const file = 'c:/Users/HP/ATTENDANCE_SYSTEM/backend/server.js'; 
let content = fs.readFileSync(file, 'utf8'); 

const oldCode = `      } else if (matchingOutstation) {
        status = "Outstation";
        // Still populate clock_in/out times if they exist
        if (clockRow) {
          clock_in = clockRow.clock_in;
          clock_out = clockRow.clock_out;
          time_in = clockRow.time_in || "--";
          time_out = clockRow.time_out || "--";
        }
      } else if (clockRow) {`;

const newCode = `      } else if (matchingOutstation) {
        status = "Outstation";
        // Still populate clock_in/out times if they exist
        if (clockRow) {
          clock_in = clockRow.clock_in;
          clock_out = clockRow.clock_out;
          time_in = clockRow.time_in || "--";
          time_out = clockRow.time_out || "--";
        }
      } else if (leaveRow) {
        status = "Approved Leave";
        // Still populate clock_in/out times if they exist
        if (clockRow) {
          clock_in = clockRow.clock_in;
          clock_out = clockRow.clock_out;
          time_in = clockRow.time_in || "--";
          time_out = clockRow.time_out || "--";
        }
      } else if (clockRow) {`;

content = content.replace(oldCode, newCode); 
fs.writeFileSync(file, content); 
console.log('Done');
