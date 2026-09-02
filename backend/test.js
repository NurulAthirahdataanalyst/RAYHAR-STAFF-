const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const sql = "SELECT leave_type, COUNT(*) as cnt FROM leave_requests lr JOIN profiles p ON lr.user_id = p.user_id WHERE lr.status = 'Approved' AND EXTRACT(YEAR FROM lr.start_date) = $1 AND EXTRACT(MONTH FROM lr.start_date) = $2 AND p.status = 'Active' GROUP BY leave_type";
  const { rows } = await pool.query(sql, [2026, 9]);
  console.log("Leaves 9:", rows);
  const { rows: r2 } = await pool.query(sql, [2026, 8]);
  console.log("Leaves 8:", r2)+
  process.exit(0);
}
check();