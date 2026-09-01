import os

file_path = "backend/server.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove LIMIT 10 from myAttendanceRows
content = content.replace(
    "ORDER BY sort_time DESC LIMIT 10`,",
    "ORDER BY sort_time DESC`,"
)

# 2. Remove LIMIT 10 from systemActivityRows
content = content.replace(
    "ORDER BY cl.updated_at DESC LIMIT 10`,",
    "ORDER BY cl.updated_at DESC`,"
)

# 3. Add employee_work_assignment to team_acts
team_acts_addition = """
          UNION ALL

          -- Temporary Assignments today
          SELECT 'outstation' AS type,
            'HR Admin' AS actor,
            'assigned a temporary branch assignment to' AS action,
            emp.full_name AS target,
            CONCAT(ewa.location, ' • ', TO_CHAR(ewa.start_date, 'DD/MM/YYYY'), ' – ', COALESCE(TO_CHAR(ewa.end_date, 'DD/MM/YYYY'), 'Ongoing')) AS context,
            TO_CHAR(ewa.created_at AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') AS time,
            ewa.created_at AS sort_time,
            'Assigned' AS badge
          FROM employee_work_assignment ewa
          JOIN profiles emp ON emp.user_id = ewa.user_id
          WHERE DATE(ewa.created_at AT TIME ZONE 'Asia/Kuala_Lumpur') = ?::date
            AND emp.status = 'Active' ${teamFilter.replace(/p\\./g, 'emp.')}
        )
"""

old_team_acts_end = """          WHERE DATE(al.created_at AT TIME ZONE 'Asia/Kuala_Lumpur') = ?::date
            AND emp.status = 'Active' ${teamFilter.replace(/p\\./g, 'emp.')}
        )"""

if old_team_acts_end in content:
    content = content.replace(old_team_acts_end, old_team_acts_end.replace("        )", team_acts_addition))
else:
    print("Could not find team_acts end!")

# 4. Add queryDate and ...teamParams to the end of the params array (it has 7 already, now 8)
old_params = "[queryDate, ...teamParams, queryDate, ...teamParams, queryDate, ...teamParams, queryDate, ...teamParams, queryDate, ...teamParams, queryDate, ...teamParams, queryDate, ...teamParams]"
new_params = "[queryDate, ...teamParams, queryDate, ...teamParams, queryDate, ...teamParams, queryDate, ...teamParams, queryDate, ...teamParams, queryDate, ...teamParams, queryDate, ...teamParams, queryDate, ...teamParams]"

if old_params in content:
    content = content.replace(old_params, new_params)
else:
    print("Could not find teamParams!")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated server.js")
