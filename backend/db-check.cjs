const { Pool } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT * FROM outstation_assignments WHERE branch = 'TGG'
    `);
    console.log("Assignments for TGG:", res.rows);

    const check = await pool.query(`
      SELECT user_id, start_date, end_date, 
      (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date AS today_date,
      ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date BETWEEN (start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date) AS is_active_today
      FROM outstation_assignments WHERE branch = 'TGG'
    `);
    console.log("Check for TGG:", check.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
