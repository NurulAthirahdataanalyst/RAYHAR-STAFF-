const { Pool } = require('pg');
require('dotenv').config({path: '.env'});

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const role = 'hr_admin';
    const branch = 'HQ';
    const department = 'Haji Umrah (BHU)';
    const queryDate = '2026-07-16';

    let profileFilter = "";
    const queryParams = [];
    const dateCondition = "?::date";
    const profileQueryParams = [queryDate, ...queryParams];
    
    console.log("Query 1:", `SELECT COUNT(*) AS total_employees FROM profiles WHERE status = 'Active' AND DATE(created_at) <= ${dateCondition}::date ${profileFilter}`);
    console.log("Params 1:", profileQueryParams);
    
    const [employeeRows] = await pool.query(
      `SELECT COUNT(*) AS total_employees FROM profiles WHERE status = 'Active' AND DATE(created_at) <= ${dateCondition}::date ${profileFilter}`,
      profileQueryParams
    );
    console.log("Employee Rows:", employeeRows);
    
    // Wait, in `pg`, pool.query returns `result`, and rows are in `result.rows`!!!
    // In mysql2, `pool.query` returns `[rows, fields]`!
  } catch(e) {
    console.error(e.message);
  } finally {
    pool.end();
  }
})();
