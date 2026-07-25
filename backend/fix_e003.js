const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
  try {
    const leaveId = 16;
    const userId = 'E003';
    
    console.log("Fixing replacement leave request for E003...");
    
    // Check if the record exists in replacement_leave_requests
    const reps = await pool.query("SELECT * FROM replacement_leave_requests WHERE leave_request_id = $1", [leaveId]);
    if (reps.rows.length === 0) {
      console.log("Inserting missing replacement leave request...");
      await pool.query(`
        INSERT INTO replacement_leave_requests (employee_id, leave_request_id, leave_date, replacement_date, description, required_hours, validation_status, actual_hours)
        VALUES ($1, $2, '2026-07-23', '2026-07-24', 'KEY IN JEMAAH', 4, 'Validated', 5.25)
      `, [userId, leaveId]);
    } else {
      console.log("Updating existing replacement leave request...");
      await pool.query(`
        UPDATE replacement_leave_requests 
        SET validation_status = 'Validated', actual_hours = 5.25
        WHERE leave_request_id = $1
      `, [leaveId]);
    }

    // Check if the adjustment has been made
    const adjs = await pool.query("SELECT * FROM leave_balance_adjustments WHERE employee_id = $1 AND reason LIKE '%Replacement Validation Success%'", [userId]);
    if (adjs.rows.length === 0) {
      console.log("Inserting missing leave balance adjustment...");
      await pool.query(`
        INSERT INTO leave_balance_adjustments (employee_id, leave_type, adjustment_days, reason, approved_by) 
        VALUES ($1, 'Annual Leave', 1, 'Replacement Validation Success (Auto-Fixed)', 'System')
      `, [userId]);
    } else {
      console.log("Leave balance adjustment already exists.");
    }
    
    console.log("Fix complete.");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
fix();
