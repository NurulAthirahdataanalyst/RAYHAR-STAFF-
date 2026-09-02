const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    const { rows } = await pool.query("SELECT leave_type, start_date, status FROM leave_requests WHERE status = 'Approved' ORDER BY start_date DESC LIMIT 20");
    console.log("Leaves:", rows);
    process.exit(0);
}
check();
