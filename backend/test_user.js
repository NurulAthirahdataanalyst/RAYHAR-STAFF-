const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query("SELECT user_id, full_name FROM profiles WHERE full_name ILIKE '%SYAFIQAH%'");
    console.log(res.rows);
    
    // Let's also find her replacement leave requests
    if (res.rows.length > 0) {
      const userId = res.rows[0].user_id;
      const reps = await pool.query("SELECT * FROM replacement_leave_requests WHERE employee_id = $1", [userId]);
      console.log("Replacement leaves:", reps.rows);
    }
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
