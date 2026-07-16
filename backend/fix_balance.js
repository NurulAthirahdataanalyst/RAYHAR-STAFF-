const { Pool } = require('pg');
require('dotenv').config({path: '.env'});

(async () => {
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const userId = 'E001';
    
    // Insert 2 days adjustment for Annual Leave
    await pgPool.query(
      `INSERT INTO leave_balance_adjustments (employee_id, leave_type, adjustment_days, reason, approved_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'Annual Leave', 2, 'HR Manual Adjustment (Syncing local storage)', 'System Admin']
    );
    
    console.log("Adjustment inserted successfully!");
    
    // Verify
    const empProfileResult = await pgPool.query(
      `SELECT p.annual_leave_entitlement, 
       COALESCE((SELECT SUM(adjustment_days) FROM leave_balance_adjustments WHERE employee_id = p.user_id), 0)::int AS total_adjustment 
       FROM profiles p WHERE p.user_id = $1`,
      [userId]
    );
    console.log("New DB balance:", empProfileResult.rows[0]);
    
  } catch(e) {
    console.error(e.message);
  } finally {
    pgPool.end();
  }
})();
