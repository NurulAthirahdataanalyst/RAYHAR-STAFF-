import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix presentRows query to select user_id
content = content.replace(
    "SELECT COUNT(DISTINCT user_id) AS present_today FROM attendances",
    "SELECT DISTINCT user_id FROM attendances"
)
content = content.replace(
    "SELECT COUNT(DISTINCT user_id) AS on_leave FROM leave_requests",
    "SELECT DISTINCT user_id FROM leave_requests"
)
content = content.replace(
    "SELECT COUNT(DISTINCT user_id) AS outstation_today FROM outstation_assignments",
    "SELECT DISTINCT user_id FROM outstation_assignments"
)

# And fix the assignments to totalEmployees, presentToday, etc.
content = content.replace(
    "presentToday: parseInt(presentRows[0].present_today || 0),",
    "presentToday: presentRows.length,"
)
content = content.replace(
    "onLeave: parseInt(onLeaveRows[0].on_leave || 0),",
    "onLeave: onLeaveRows.length,"
)
content = content.replace(
    "outstationToday: parseInt(outstationTodayRows[0].outstation_today || 0),",
    "outstationToday: outstationTodayRows.length,"
)
content = content.replace(
    "hasRecords: totalDayAttendances > 0 || companyLeaveCount > 0 || parseInt(onLeaveRows[0].on_leave || 0) > 0 || parseInt(outstationTodayRows[0].outstation_today || 0) > 0 || absentCount > 0 || restDayCount > 0,",
    "hasRecords: totalDayAttendances > 0 || companyLeaveCount > 0 || onLeaveRows.length > 0 || outstationTodayRows.length > 0 || absentCount > 0 || restDayCount > 0,"
)

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched dashboard stats queries in server.js")
