import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's search for the exact function body and replace it.
old_func_pattern = re.compile(r'app\.get\("/api/employee-locations", async \(req, res\) => \{.*?(?=\napp\.)', re.DOTALL)

def replacer(match):
    return """app.get("/api/employee-locations", async (req, res) => {
  try {
    const { branch, department, role } = req.query || {};

    let params = [];
    let filter = "";

    if (role === 'branch_leader') {
        const safeBranch = (branch && branch !== "All") ? branch : "INVALID_BYPASS";
        filter = "AND p.branch = ?";
        params.push(safeBranch);
    } else if (role === 'head_of_department') {
        const safeDept = (department && department !== "All") ? department : "INVALID_BYPASS";
        filter = "AND p.department = ?";
        params.push(safeDept);
    } else if (branch && branch !== "All") {
        filter = "AND p.branch = ?";
        params.push(branch);
    }

    const sql = `
      SELECT a.user_id, p.full_name, p.branch, p.department,
             COALESCE(el.recorded_at, a.clock_in) AS last_updated,
             COALESCE(el.latitude, a.clock_in_latitude) AS latitude,
             COALESCE(el.longitude, a.clock_in_longitude) AS longitude,
             COALESCE(el.accuracy, a.clock_in_accuracy) AS accuracy,
             a.distance_meters AS distance,
             CASE WHEN oa.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_outstation
      FROM attendances a
      JOIN (
        SELECT user_id, MAX(clock_in) AS max_in
        FROM attendances
        WHERE (clock_in AT TIME ZONE 'Asia/Kuala_Lumpur')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date
        GROUP BY user_id
      ) m ON a.user_id = m.user_id AND a.clock_in = m.max_in
      LEFT JOIN (
        SELECT el1.employee_id, el1.latitude, el1.longitude, el1.accuracy, el1.recorded_at
        FROM employee_location_logs el1
        JOIN (SELECT employee_id, MAX(id) as max_id FROM employee_location_logs GROUP BY employee_id) el2
          ON el1.id = el2.max_id
      ) el ON el.employee_id = a.user_id
      LEFT JOIN profiles p ON p.user_id = a.user_id
      LEFT JOIN outstation_assignments oa ON oa.user_id = a.user_id 
        AND oa.status != 'Cancelled'
        AND CURRENT_DATE BETWEEN (oa.start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (oa.end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date
      WHERE 1=1 ${filter}
    `;
    const [rows] = await pool.query(sql, params);

    res.json({ success: true, locations: rows });
  } catch (err) {
    console.error("/api/employee-locations error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});"""

new_text = old_func_pattern.sub(replacer, text, count=1)
if new_text != text:
    with open('backend/server.js', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Updated backend API!")
else:
    print("Failed to replace backend API")
