const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  try {
    const dateStr = '2026-07-21';
    await pool.query(
      `SELECT COUNT(DISTINCT a.user_id) as cnt
       FROM attendances a
       JOIN profiles p ON p.user_id = a.user_id
       WHERE DATE(a.clock_in) = DATE_SUB($1, INTERVAL 1 DAY)
         AND a.clock_out IS NULL`,
      [dateStr]
    );
    console.log("Success!");
  } catch(e) {
    console.error("Failed:", e.message);
  }
  process.exit(0);
}
check();
