const fs = require('fs');

const routeCode = `
// --- CUTI GANTI / REPLACEMENT LEAVE VALIDATION ---
app.post("/api/cron/validate-replacement-leaves", async (req, res) => {
  try {
    // 1. Move Approved -> Waiting for Replacement Date when the date is today or passed
    await pool.query(
      \`UPDATE replacement_leave_requests 
       SET validation_status = 'Waiting for Replacement Date', updated_at = CURRENT_TIMESTAMP
       WHERE validation_status = 'Approved' 
       AND replacement_date <= CURRENT_DATE\`
    );

    // 2. Validate those that are Waiting for Replacement Date and the date is in the past (so attendance is finalized)
    // Or if it's today and they have clocked out.
    const [pendingRequests] = await pool.query(
      \`SELECT r.*, p.full_name 
       FROM replacement_leave_requests r
       JOIN profiles p ON p.user_id = r.employee_id
       WHERE r.validation_status = 'Waiting for Replacement Date'
       AND r.replacement_date <= CURRENT_DATE\`
    );

    let processed = 0;
    for (const request of pendingRequests) {
      // Find attendance for this user and date
      const [att] = await pool.query(
        \`SELECT id, working_hours, clock_in, clock_out FROM attendances 
         WHERE employee_id = ? AND date = ?\`,
        [request.employee_id, request.replacement_date]
      );
      
      let newStatus = null;
      let actualHours = 0;
      let attId = null;

      if (att.length > 0) {
        attId = att[0].id;
        const clockOut = att[0].clock_out;
        const whStr = att[0].working_hours; // e.g., "8h 30m"
        
        // Only validate if date is past, OR they have clocked out today
        const isPast = new Date(request.replacement_date) < new Date(new Date().toDateString());
        if (isPast || clockOut) {
          if (whStr) {
            const hMatch = whStr.match(/(\\d+)h/);
            const mMatch = whStr.match(/(\\d+)m/);
            const h = hMatch ? parseInt(hMatch[1]) : 0;
            const m = mMatch ? parseInt(mMatch[1]) : 0;
            actualHours = h + (m / 60);
          }
          if (actualHours >= request.required_hours) {
            newStatus = 'Validated';
          } else {
            newStatus = 'Failed';
          }
        }
      } else {
        // No attendance record found
        const isPast = new Date(request.replacement_date) < new Date(new Date().toDateString());
        if (isPast) {
          newStatus = 'Failed'; // Absent
        }
      }

      if (newStatus) {
        await pool.query(
          \`UPDATE replacement_leave_requests 
           SET validation_status = ?, actual_hours = ?, attendance_id = ?, validated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?\`,
          [newStatus, actualHours, attId, request.id]
        );
        processed++;
      }
    }

    res.json({ success: true, message: \`Validated \${processed} replacement leave requests.\` });
  } catch(e) {
    console.error("Replacement leave validation error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Endpoint to fetch replacement leaves for a user
app.get("/api/employees/:userId/replacement-leaves", async (req, res) => {
  try {
    const [rows] = await pool.query(
      \`SELECT * FROM replacement_leave_requests WHERE employee_id = ? ORDER BY replacement_date DESC\`,
      [req.params.userId]
    );
    res.json({ success: true, replacementLeaves: rows });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});
`;

fs.appendFileSync('backend/server.js', routeCode);
console.log('Appended cuti ganti routes to server.js');
