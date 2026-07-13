const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.xvpebtompjcjfvuzeumo:RayharTravel2026@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'
});

async function run() {
  try {
    const { rows: leaves } = await pool.query("SELECT * FROM leave_requests WHERE status IN ('Approved', 'Pending')");
    console.log("LEAVES:", leaves.length, leaves.slice(0, 3));
    
    const { rows: outstations } = await pool.query("SELECT * FROM outstation_assignments");
    console.log("OUTSTATIONS:", outstations.length, outstations.slice(0, 3));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
