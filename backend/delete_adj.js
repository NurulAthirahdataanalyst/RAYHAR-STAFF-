const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query("DELETE FROM leave_balance_adjustments WHERE employee_id = 'E003' AND reason = 'Replacement Validation Success (Auto-Fixed)'");
    console.log("Deleted");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
