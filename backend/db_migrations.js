const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres.xvpebtompjcjfvuzeumo:RayharTravel2026@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'
  });

  try {
    await pool.query('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS annual_leave_entitlement INTEGER DEFAULT 14');
    await pool.query('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medical_leave_entitlement INTEGER DEFAULT 14');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_balance_adjustments (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) REFERENCES profiles(user_id) ON DELETE CASCADE,
        leave_type VARCHAR(100) NOT NULL,
        adjustment_days INTEGER NOT NULL,
        reason TEXT,
        approved_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Migration complete');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
  }
}

run();
