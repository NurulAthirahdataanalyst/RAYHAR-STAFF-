const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.xvpebtompjcjfvuzeumo:RayharTravel2026@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'
});

async function checkDanishLeaves() {
  try {
    const { rows: prof } = await pool.query("SELECT * FROM profiles WHERE full_name ILIKE '%DANISH HAKIM%'");
    console.log("Danish Hakim Profile:", prof);

    if (prof.length > 0) {
      const uid = prof[0].user_id;
      const { rows: leaves } = await pool.query("SELECT * FROM leave_requests WHERE user_id = $1", [uid]);
      console.log("Leaves:", leaves);
      
      const { rows: adj } = await pool.query("SELECT * FROM leave_balance_adjustments WHERE employee_id = $1", [uid]);
      console.log("Adjustments:", adj);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

checkDanishLeaves();
