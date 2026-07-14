const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await pool.query('DELETE FROM leave_balance_adjustments WHERE id IN (3, 4, 5)');
    console.log("Deleted recent test adjustments from the database!");
    
    const res = await pool.query('SELECT * FROM leave_balance_adjustments ORDER BY created_at DESC LIMIT 5');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
