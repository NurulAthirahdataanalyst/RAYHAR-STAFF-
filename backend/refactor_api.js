const fs = require('fs');

let serverCode = fs.readFileSync('c:/Users/HP/ATTENDANCE_SYSTEM/backend/server.js', 'utf8');

// 1. Add the API endpoint for leave adjustments
if (!serverCode.includes('/api/profiles/:userId/leave-adjustments')) {
  const newEndpoint = `
// ===============================
// LEAVE ADJUSTMENTS
// ===============================
app.post("/api/profiles/:userId/leave-adjustments", async (req, res) => {
  const { userId } = req.params;
  const { leaveType, adjustmentDays, reason, approvedBy } = req.body;

  try {
    // Insert into leave_balance_adjustments
    await pool.query(
      \`INSERT INTO leave_balance_adjustments (employee_id, leave_type, adjustment_days, reason, approved_by)
       VALUES ($1, $2, $3, $4, $5)\`,
      [userId, leaveType, adjustmentDays, reason, approvedBy || 'Admin']
    );

    res.json({ message: "Leave adjustment applied successfully" });
  } catch (error) {
    console.error("Error applying leave adjustment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
`;

  // Insert before the last module.exports or somewhere safe. Let's insert before `app.get("/api/leave-requests"`
  serverCode = serverCode.replace(
    'app.get("/api/leave-requests", async (req, res) => {',
    newEndpoint + '\napp.get("/api/leave-requests", async (req, res) => {'
  );
}

// Write the modified code back
fs.writeFileSync('c:/Users/HP/ATTENDANCE_SYSTEM/backend/server.js', serverCode);
console.log('Added endpoint');
