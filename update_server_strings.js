const fs = require('fs');
let content = fs.readFileSync('backend/server.js', 'utf8');

const myActivityOld = \          CASE lr.status
            WHEN 'Pending HOD' THEN 'submitted a Leave Request (Pending HOD)'
            WHEN 'Pending Operation Manager' THEN 'submitted a Leave Request (Pending OM)'
            WHEN 'Pending Finance' THEN 'submitted a Leave Request (Pending Finance)'
            WHEN 'Pending MD' THEN 'submitted a Leave Request (Pending MD)'
            WHEN 'Pending Branch Leader' THEN 'submitted a Leave Request (Pending Branch Leader)'
            ELSE 'submitted a Leave Request'
          END AS action,
          NULL AS target,
          CONCAT(lr.leave_type, ' • ', TO_CHAR(lr.start_date, 'DD/MM/YYYY'), ' – ', TO_CHAR(lr.end_date, 'DD/MM/YYYY'), ' • ', lr.days, ' Days') AS context,\;

const activityNew = \          CASE lr.status
            WHEN 'Pending HOD' THEN 'submitted a Leave Request and Need Your Approval'
            WHEN 'Pending Operation Manager' THEN 'submitted a Leave Request and Need Your Approval'
            WHEN 'Pending Finance' THEN 'submitted a Leave Request and Need Your Approval'
            WHEN 'Pending MD' THEN 'submitted a Leave Request and Need Your Approval'
            WHEN 'Pending Branch Leader' THEN 'submitted a Leave Request and Need Your Approval'
            ELSE 'submitted a Leave Request'
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

if (content.includes(myActivityOld)) {
  content = content.replace(myActivityOld, activityNew);
  console.log('Replaced My Activity');
} else {
  console.log('Could not find My Activity old string');
}

const teamActivityOld = \            CASE lr.status
              WHEN 'Pending HOD' THEN 'submitted a Leave Request (Pending HOD)'
              WHEN 'Pending Operation Manager' THEN 'submitted a Leave Request (Pending OM)'
              WHEN 'Pending Finance' THEN 'submitted a Leave Request (Pending Finance)'
              WHEN 'Pending MD' THEN 'submitted a Leave Request (Pending MD)'
              WHEN 'Pending Branch Leader' THEN 'submitted a Leave Request (Pending Branch Leader)'
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
              ELSE 'submitted a Leave Request'
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

fs.writeFileSync('backend/server.js', content);
