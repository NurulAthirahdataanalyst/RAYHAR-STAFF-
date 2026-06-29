const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' }); // load root .env or .env

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const res = await pool.query("SELECT department, COUNT(*) as count FROM profiles WHERE status = 'Active' GROUP BY department");
    console.log('Department Counts:', res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();
