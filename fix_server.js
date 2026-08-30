const fs = require('fs');
let content = fs.readFileSync('backend/server.js', 'utf8');

// Replace the Team block (which now has just 'submitted a Leave Request')
const teamActivityOld = \            CASE lr.status
              WHEN 'Pending HOD' THEN 'submitted a Leave Request'
              WHEN 'Pending Operation Manager' THEN 'submitted a Leave Request'
              WHEN 'Pending Finance' THEN 'submitted a Leave Request'
              WHEN 'Pending MD' THEN 'submitted a Leave Request'
              WHEN 'Pending Branch Leader' THEN 'submitted a Leave Request'
              ELSE 'submitted a Leave Request'
            END AS action,
            NULL AS target,
            CONCAT(lr.leave_type, ' • ', TO_CHAR(lr.start_date, 'DD/MM/YYYY'), ' – ', TO_CHAR(lr.end_date, 'DD/MM/YYYY'), ' • ', lr.days, ' Days') AS context,\;

const teamActivityNew = \            CASE lr.status
              WHEN 'Pending HOD' THEN 'submitted a Leave Request and Need Your Approval'
              WHEN 'Pending Operation Manager' THEN 'submitted a Leave Request and Need Your Approval'
              WHEN 'Pending Finance' THEN 'submitted a Leave Request and Need Your Approval'
              WHEN 'Pending MD' THEN 'submitted a Leave Request and Need Your Approval'
              WHEN 'Pending Branch Leader' THEN 'submitted a Leave Request and Need Your Approval'
              ELSE 'submitted a Leave Request and Need Your Approval'
            END AS action,
            NULL AS target,
            CASE 
              WHEN lr.leave_type = 'Replacement Leave' OR lr.leave_type = 'Cuti Ganti' THEN 
                CASE WHEN lr.start_date = lr.end_date 
                     THEN CONCAT(lr.leave_type, ' • ', TO_CHAR(lr.start_date, 'DD/MM/YYYY'), ' • ', lr.days, ' Days')
                     ELSE CONCAT(lr.leave_type, ' • ', TO_CHAR(lr.start_date, 'DD/MM/YYYY'), ' and ', TO_CHAR(lr.end_date, 'DD/MM/YYYY'), ' • ', lr.days, ' Days')
                END
              ELSE 
                CASE WHEN lr.start_date = lr.end_date 
                     THEN CONCAT(lr.leave_type, ' • ', TO_CHAR(lr.start_date, 'DD/MM/YYYY'), ' • ', lr.days, ' Days')
                     ELSE CONCAT(lr.leave_type, ' • ', TO_CHAR(lr.start_date, 'DD/MM/YYYY'), ' - ', TO_CHAR(lr.end_date, 'DD/MM/YYYY'), ' • ', lr.days, ' Days')
                END
            END AS context,\;

if (content.includes(teamActivityOld)) {
  content = content.replace(teamActivityOld, teamActivityNew);
  console.log('Replaced Team Activity');
} else {
  console.log('Could not find Team Activity old string');
}

// Replace Notification logic
const notifOld = "[approverUserId, \New Leave Request: \\, \\ has requested \ days of \.\, 'leave_approval', result.insertId]";
const notifNew = "[approverUserId, \New Leave Request: \\, \\ submitted a Leave Request and Need Your Approval\\n\ • \ • \ Days\, 'leave_approval', result.insertId]";

if (content.includes(notifOld)) {
  content = content.replace(notifOld, notifNew);
  console.log('Replaced notification');
} else {
  console.log('Could not find notification old string');
}

fs.writeFileSync('backend/server.js', content);
console.log('Updated server.js');
