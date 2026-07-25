const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query("SELECT * FROM leave_requests WHERE user_id = 'E003'");
    console.log("Leave requests:", res.rows);
    const reps = await pool.query("SELECT * FROM replacement_leave_requests WHERE employee_id = 'E003'");
    console.log("Replacement leaves:", reps.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
