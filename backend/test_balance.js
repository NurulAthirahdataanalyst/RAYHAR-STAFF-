const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const usedLeaves = await pool.query("SELECT leave_type, SUM(days) as total_used FROM leave_requests WHERE user_id = 'E003' AND status = 'Approved' GROUP BY leave_type");
    console.log("Used leaves:", usedLeaves.rows);
    const adjustments = await pool.query("SELECT leave_type, SUM(adjustment_days) as total_adj FROM leave_balance_adjustments WHERE employee_id = 'E003' GROUP BY leave_type");
    console.log("Adjustments:", adjustments.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
