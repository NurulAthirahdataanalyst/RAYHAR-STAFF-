const { Pool } = require('pg');
require('dotenv').config({path: '.env'});

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const result = await pool.query("SELECT * FROM profiles WHERE full_name ILIKE '%NURUL ATHIRAH%'");
    console.log(result.rows);
  } catch(e) {
    console.error(e.message);
  } finally {
    pool.end();
  }
})();
