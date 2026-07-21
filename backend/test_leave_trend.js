const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
const pool = {
  query: async (sql, params) => {
    let i = 1;
    sql = sql.replace(/\?/g, () => `$${i++}`);
    const res = await pgPool.query(sql, params);
    return [res.rows, res];
  }
};
async function check() {
  const tMonth = 7;
  const tYear = 2026;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const leaveTrend = [];
  for (let i = 5; i >= 0; i--) {
    let m = tMonth - i;
    let y = tYear;
    while (m <= 0) { m += 12; y--; }
    
    const [leaveMonthRows] = await pool.query(
      `SELECT leave_type, COUNT(*) as cnt
       FROM leave_requests lr
       JOIN profiles p ON p.user_id = lr.user_id
       WHERE lr.status = 'Approved'
         AND EXTRACT(YEAR FROM lr.start_date) = ?
         AND EXTRACT(MONTH FROM lr.start_date) = ?
         AND p.status = 'Active'
       GROUP BY leave_type`,
      [y, m]
    );

    let annual = 0, sick = 0, replacement = 0;
    for (const r of leaveMonthRows) {
      const lt = (r.leave_type || '').toLowerCase();
      if (lt.includes('annual') || lt.includes('emergency')) annual += parseInt(r.cnt);
      else if (lt.includes('sick') || lt.includes('medical')) sick += parseInt(r.cnt);
      else if (lt.includes('replacement') || lt.includes('cuti ganti')) replacement += parseInt(r.cnt);
    }
    leaveTrend.push({ month: monthNames[m - 1], Annual: annual, Sick: sick, Replacement: replacement });
  }
  console.log('leaveTrend:', leaveTrend);
  process.exit(0);
}
check();
