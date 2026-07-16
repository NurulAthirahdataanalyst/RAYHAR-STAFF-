const { Pool } = require('pg');
require('dotenv').config({path: '.env'});

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const profileCheck = await pool.query("SELECT COUNT(*) as cnt FROM profiles WHERE status = 'Active'");
    console.log("Total Active Profiles:", profileCheck.rows[0].cnt);
    
    const dateCheck = await pool.query("SELECT COUNT(*) as cnt FROM profiles WHERE status = 'Active' AND DATE(created_at) <= '2026-07-16'::date");
    console.log("Total Active Profiles before 2026-07-16:", dateCheck.rows[0].cnt);
    
    const dateCheck2 = await pool.query("SELECT COUNT(*) as cnt FROM profiles WHERE status = 'Active' AND DATE(created_at) <= '2026-07-16'::date::date");
    console.log("Total Active Profiles before 2026-07-16::date::date:", dateCheck2?.rows?.[0]?.cnt);
  } catch(e) {
    console.error(e.message);
  } finally {
    pool.end();
  }
})();
