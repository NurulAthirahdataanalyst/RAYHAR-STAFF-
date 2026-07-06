const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

if (!content.includes('app.get("/api/reports/monthly-attendance"')) {
  const index = content.indexOf('// ===============================\r\n// DAILY ATTENDANCE REPORT');
  const index2 = content.indexOf('// ===============================\n// DAILY ATTENDANCE REPORT');
  
  const targetIndex = index !== -1 ? index : index2;
  if (targetIndex === -1) {
    console.log('Could not find DAILY ATTENDANCE REPORT');
    process.exit(1);
  }
  
  const monthlyRoute = `
// ===============================
// MONTHLY ATTENDANCE REPORT
// ===============================
app.get("/api/reports/monthly-attendance", async (req, res) => {
  const { month, year, role, branch, department } = req.query;
  
  if (!month || !year) {
    return res.status(400).json({ success: false, error: "Month and year are required" });
  }

  try {
    let profileFilter = "";
    let queryParams = [];

    if (role === 'branch_leader') {
      const safeBranch = (branch && branch !== "All") ? branch : "INVALID_BYPASS";
      profileFilter = " AND p.branch = ?";
      queryParams.push(safeBranch);
    } else if (role === 'head_of_department') {
      const safeDept = (department && department !== "All") ? department : "INVALID_BYPASS";
      profileFilter = " AND p.department = ?";
      queryParams.push(safeDept);
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
    
    queryParams.unshift(endDate);
    queryParams.unshift(startDate);

    const [allProfiles] = await pool.query(
      \`SELECT p.user_id, p.full_name, p.branch, p.department, COALESCE(ur.role, 'employee') AS role
       FROM profiles p
       LEFT JOIN user_role ur ON ur.user_id = p.user_id
       WHERE p.status = 'Active' AND DATE(p.created_at) <= ?::date \${profileFilter}
       ORDER BY p.full_name ASC\`,
      [endDate, ...queryParams.slice(2)]
    );

    const [clockRows] = await pool.query(
      \`SELECT a.user_id, a.clock_in, a.clock_out,
              TO_CHAR(a.clock_in AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') AS time_in,
              TO_CHAR(a.clock_out AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') AS time_out
       FROM attendances a
       JOIN profiles p ON p.user_id = a.user_id
       WHERE DATE(a.clock_in) >= ?::date AND DATE(a.clock_in) <= ?::date \${profileFilter}\`,
      queryParams
    );

    const { format } = require('date-fns');
    const lateThreshold = typeof getLateThresholdTime === 'function' ? getLateThresholdTime() : "09:00:00";

    const reportData = clockRows.map(clock => {
      const emp = allProfiles.find(p => p.user_id === clock.user_id) || {};
      const clockInTimeStr = format(new Date(clock.clock_in), 'HH:mm:ss');
      const isLate = clockInTimeStr > lateThreshold;

      return {
        user_id: clock.user_id,
        full_name: emp.full_name || 'Unknown',
        branch: emp.branch || 'HQ',
        date: new Date(clock.clock_in).toISOString().split('T')[0],
        time_in: clock.time_in,
        time_out: clock.time_out,
        clock_in: clock.clock_in,
        clock_out: clock.clock_out,
        is_late: isLate,
        status: isLate ? "Present (Late)" : "Present (On Time)"
      };
    });

    res.json({
      success: true,
      data: reportData
    });
  } catch (err) {
    console.error("Monthly Attendance Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
`;
  content = content.slice(0, targetIndex) + monthlyRoute + '\n' + content.slice(targetIndex);
  fs.writeFileSync('server.js', content, 'utf8');
  console.log('Added monthly-attendance');
} else {
  console.log('Already exists');
}
