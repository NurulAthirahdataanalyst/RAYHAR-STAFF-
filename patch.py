import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """      // Fetch earned replacement leaves
      const [earnedRlRows] = await pool.query(SELECT SUM(CASE WHEN validation_status = 'Validated' THEN 1 ELSE 0 END) as earned FROM replacement_leave_requests WHERE employee_id = ?, [userId]);
      const replacementEarned = parseInt(earnedRlRows[0]?.earned || 0);

      // Fetch leave balance adjustments for this employee
      const [adjRows] = await pool.query("SELECT leave_type, SUM(adjustment_days) AS total_adjustment FROM leave_balance_adjustments WHERE employee_id = ? GROUP BY leave_type", [userId]);
      let totalAdjustment = 0, medicalAdj = 0, replacementAdj = replacementEarned;"""

content = re.sub(
    r'      // Fetch leave balance adjustments for this employee\s*const \[adjRows\] = await pool\.query\("SELECT leave_type, SUM\(adjustment_days\) AS total_adjustment FROM leave_balance_adjustments WHERE employee_id = \? GROUP BY leave_type", \[userId\]\);\s*let totalAdjustment = 0, medicalAdj = 0, replacementAdj = 0;',
    replacement,
    content
)

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
