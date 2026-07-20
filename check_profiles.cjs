require('dotenv').config({path: './backend/.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`SELECT p.user_id, p.full_name, p.status, p.created_at FROM profiles p WHERE p.status = 'Active'`).then(r => {
  console.log('TOTAL:', r.rowCount);
  console.log(r.rows);
  process.exit(0);
});
