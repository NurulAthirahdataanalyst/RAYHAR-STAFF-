import sys

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

myActivityOld = """          CASE lr.status
            WHEN 'Pending HOD' THEN 'submitted a Leave Request (Pending HOD)'
            WHEN 'Pending Operation Manager' THEN 'submitted a Leave Request (Pending OM)'
            WHEN 'Pending Finance' THEN 'submitted a Leave Request (Pending Finance)'
            WHEN 'Pending MD' THEN 'submitted a Leave Request (Pending MD)'
            WHEN 'Pending Branch Leader' THEN 'submitted a Leave Request (Pending Branch Leader)'
            ELSE 'submitted a Leave Request'
          END AS action,
          NULL AS target,
          CONCAT(lr.leave_type, ' • ', TO_CHAR(lr.start_date, 'DD/MM/YYYY'), ' – ', TO_CHAR(lr.end_date, 'DD/MM/YYYY'), ' • ', lr.days, ' Days') AS context,"""

activityNew = """          CASE lr.status
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
          END AS context,"""

if myActivityOld in content:
    content = content.replace(myActivityOld, activityNew)
    print("Replaced My Activity")
else:
    print("Could not find My Activity")

teamActivityOld = """            CASE lr.status
              WHEN 'Pending HOD' THEN 'submitted a Leave Request (Pending HOD)'
              WHEN 'Pending Operation Manager' THEN 'submitted a Leave Request (Pending OM)'
              WHEN 'Pending Finance' THEN 'submitted a Leave Request (Pending Finance)'
              WHEN 'Pending MD' THEN 'submitted a Leave Request (Pending MD)'
              WHEN 'Pending Branch Leader' THEN 'submitted a Leave Request (Pending Branch Leader)'
              ELSE 'submitted a Leave Request'
            END AS action,
            NULL AS target,
            CONCAT(lr.leave_type, ' • ', TO_CHAR(lr.start_date, 'DD/MM/YYYY'), ' – ', TO_CHAR(lr.end_date, 'DD/MM/YYYY'), ' • ', lr.days, ' Days') AS context,"""

teamActivityNew = """            CASE lr.status
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
            END AS context,"""

if teamActivityOld in content:
    content = content.replace(teamActivityOld, teamActivityNew)
    print("Replaced Team Activity")
else:
    print("Could not find Team Activity")


notifOld = """[approverUserId, New Leave Request: , ${leaveData.full_name} has requested  days of ., 'leave_approval', result.insertId]"""
notifNew = """[
          approverUserId, 
          New Leave Request: , 
          ${leaveData.full_name} submitted a Leave Request and Need Your Approval\\n •  •  Days, 
          'leave_approval', 
          result.insertId
        ]"""
if notifOld in content:
    content = content.replace(notifOld, notifNew)
    print("Replaced Notification")
else:
    print("Could not find notification")

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)
