const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  const { rows } = await pool.query("SELECT leave_type, COUNT(*) as cnt FROM leave_requests lr JOIN profiles p ON p.user_id = lr.user_id WHERE lr.status = 'Approved' AND EXTRACT(YEAR FROM lr.start_date) = 2026 AND EXTRACT(MONTH FROM lr.start_date) = 7 AND p.status = 'Active' GROUP BY leave_type");
  console.log('Query result:', rows);
  process.exit(0);
}
check();
