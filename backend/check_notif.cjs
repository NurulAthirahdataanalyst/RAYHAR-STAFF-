const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.xvpebtompjcjfvuzeumo:RayharTravel2026@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres' });

async function run() {
  // Check all elevated roles including operation_manager
  const roles = await pool.query("SELECT p.user_id, p.full_name, ur.role FROM profiles p JOIN user_role ur ON p.user_id = ur.user_id WHERE ur.role IN ('managing_director','operation_manager','hr_admin','finance_manager') AND p.status='Active'");
  console.log('All elevated role users:');
  roles.rows.forEach(r => console.log(' -', r.user_id, r.full_name, '|', r.role));

  // Check the actual backend server.js on Render - look at the leave route commit
  const latestCommit = await pool.query("SELECT 'DB connected, checking Render deploy' as status");
  console.log('\nDB status:', latestCommit.rows[0].status);
  process.exit(0);
}
run();
