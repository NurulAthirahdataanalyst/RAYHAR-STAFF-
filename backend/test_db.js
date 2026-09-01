const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://postgres.uvffziztdwntjtyzcwqg:3ZtZk2R2Tf*uP*n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});
async function run() {
  const { rows } = await pool.query("SELECT COUNT(*) AS total_employees FROM profiles WHERE status = 'Active'");
  console.log("Total (no date filter):", rows[0].total_employees);
  
  const { rows: r2 } = await pool.query("SELECT COUNT(*) AS total_employees FROM profiles WHERE status = 'Active' AND DATE(created_at) <= '2026-09-01'::date");
  console.log("Total (with date filter):", r2[0].total_employees);

  const { rows: r3 } = await pool.query("SELECT created_at FROM profiles LIMIT 5");
  console.log("created_at samples:", r3);
  process.exit(0);
}
run();
