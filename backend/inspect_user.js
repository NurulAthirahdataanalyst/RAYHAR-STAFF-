const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.xvpebtompjcjfvuzeumo:RayharTravel2026@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'
});

async function run() {
  try {
    console.log("=== SCHEMAS ===");
    
    const columns = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'leave_requests'`
    );
    console.log("leave_requests columns:", columns.rows.map(r => `${r.column_name} (${r.data_type})`));

    const adjColumns = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'leave_balance_adjustments'`
    );
    console.log("leave_balance_adjustments columns:", adjColumns.rows.map(r => `${r.column_name} (${r.data_type})`));

    const allAdjs = await pool.query(`SELECT * FROM leave_balance_adjustments`);
    console.log("All Adjustments in DB:", allAdjs.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
