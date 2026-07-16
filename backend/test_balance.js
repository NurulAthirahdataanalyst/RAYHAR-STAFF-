const { Pool } = require('pg');
require('dotenv').config({path: '.env'});

(async () => {
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const userId = 'E001';
    
    // Check empProfile query in dashboard-stats
    const empProfileResult = await pgPool.query(
      `SELECT 
         p.branch, 
         p.department,
         p.annual_leave_entitlement,
         COALESCE((SELECT SUM(adjustment_days) FROM leave_balance_adjustments WHERE employee_id = p.user_id), 0)::int AS total_adjustment
       FROM profiles p WHERE p.user_id = $1`,
      [userId]
    );
    console.log("Dashboard-stats empProfile:", empProfileResult.rows[0]);
    
    // Check used leaves query
    const leaveRowsResult = await pgPool.query(
      `SELECT SUM(days) AS used_days FROM leave_requests 
       WHERE user_id = $1 
       AND status != 'Rejected' 
       AND leave_type IN ('Cuti Tahunan', 'Annual/Emergency Leave', 'Cuti Sakit', 'Sick Leave', 'Kecemasan', 'Emergency')`,
      [userId]
    );
    console.log("Dashboard-stats leaveRows:", leaveRowsResult.rows[0]);
    
    // Check user-details API queries for contrast
    const userDetailsRowsResult = await pgPool.query(
      `
      SELECT
        p.user_id,
        COALESCE(p.annual_leave_entitlement, 14)::int AS annual_leave_entitlement,
        COALESCE(adj.total_adjustment, 0)::int AS total_adjustment
      FROM profiles p
      LEFT JOIN (
        SELECT employee_id, SUM(adjustment_days) AS total_adjustment
        FROM leave_balance_adjustments
        WHERE leave_type IN ('Annual Leave', 'Annual & Emergency Leave', 'Annual/Emergency Leave', 'Cuti Tahunan')
        GROUP BY employee_id
      ) adj ON adj.employee_id = p.user_id
      WHERE p.user_id = $1
      LIMIT 1
      `,
      [userId]
    );
    console.log("user-details:", userDetailsRowsResult.rows[0]);
    
  } catch(e) {
    console.error(e.message);
  } finally {
    pgPool.end();
  }
})();
