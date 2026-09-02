const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const { rows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles'");
  console.log(rows.map(r => r.column_name));
  process.exit(0);
}
check();