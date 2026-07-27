const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    const { rows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'attendances'");
    console.log(rows.map(r => r.column_name));
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
checkSchema();
