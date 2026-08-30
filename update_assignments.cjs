const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

code = code.replace(
  /app\.get\("\/api\/work-assignments-all", async \(req, res\) => \{\s*try \{\s*const \[rows\] = await pool\.query\(`([\s\S]*?)`\);\s*res\.json\(\{ success: true, assignments: rows \}\);\s*\} catch\(e\) \{\s*res\.status\(500\)\.json\(\{ success: false, error: e\.message \}\);\s*\}\s*\}\);/g,
  `app.get("/api/work-assignments-all", async (req, res) => {
    try {
      const { role, branch, department } = req.query;
      let filterP = "";
      let paramsTotal = [];

      if (role === 'branch_leader') {
        const safeBranch = (branch && branch !== "All") ? branch : "INVALID_BYPASS";
        filterP = " WHERE p.branch = ?";
        paramsTotal.push(safeBranch);
      } else if (role === 'head_of_department') {
        const safeDept = (department && department !== "All") ? department : "INVALID_BYPASS";
        filterP = " WHERE p.department = ?";
        paramsTotal.push(safeDept);
      }

      const [rows] = await pool.query(\`
        SELECT 
          ewa.id,
          ewa.user_id,
          ewa.location as temp_branch,
          ewa.start_date,
          ewa.end_date,
          ewa.status,
          p.full_name as name,
          p.branch as primary_branch,
          p.department,
          p.role
        FROM employee_work_assignment ewa
        JOIN profiles p ON ewa.user_id = p.user_id
        \${filterP}
        ORDER BY ewa.start_date DESC
      \`, paramsTotal);
      res.json({ success: true, assignments: rows });
    } catch(e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });`
);

fs.writeFileSync('backend/server.js', code);
console.log("Updated server.js");
