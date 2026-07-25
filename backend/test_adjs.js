const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const adjs = await pool.query("SELECT * FROM leave_balance_adjustments WHERE employee_id = 'E003'");
    console.log("Adjustments:", adjs.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
