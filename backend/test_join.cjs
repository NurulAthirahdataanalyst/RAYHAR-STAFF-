const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.xvpebtompjcjfvuzeumo:RayharTravel2026@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'
});

async function run() {
  try {
    const { rows: profiles } = await pool.query("SELECT * FROM profiles LIMIT 1");
    console.log("PROFILES:", profiles);
    const { rows: testJoin } = await pool.query("SELECT lr.leave_id, lr.user_id, p.full_name FROM leave_requests lr LEFT JOIN profiles p ON p.user_id = lr.user_id LIMIT 1");
    console.log("JOIN:", testJoin);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
