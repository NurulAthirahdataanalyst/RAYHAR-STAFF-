const { Pool } = require('pg');
require('dotenv').config();

async function check() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    const { rows } = await pool.query("SELECT * FROM attendances WHERE DATE(clock_in) = '2026-09-02'");
    console.log("Attendances:", rows);
    
    const { rows: rows2 } = await pool.query("SELECT * FROM leave_requests ORDER BY start_date DESC LIMIT 5");
    console.log("Leaves:", rows2);

    process.exit(0);
}
check();
