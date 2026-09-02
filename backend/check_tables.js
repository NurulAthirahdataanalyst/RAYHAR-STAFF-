const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const { rows } = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log(rows.map(r => r.table_name));
  process.exit(0);
}
check();