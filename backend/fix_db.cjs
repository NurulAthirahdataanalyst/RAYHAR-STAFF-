const { Pool } = require('pg');
require('dotenv').config();

async function fix() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  const { rows: leaves } = await pool.query("SELECT lr.leave_id, lr.status, p.role, p.branch FROM leave_requests lr JOIN profiles p ON lr.user_id = p.user_id WHERE lr.status IN ('Pending HOD', 'Pending Branch Leader')");
  
  for (const l of leaves) {
    let newStatus = null;
    if (l.branch === 'HQ' && l.role && l.role.toLowerCase() === 'head_of_department') {
      newStatus = 'Pending Operation Manager';
    } else if (l.branch !== 'HQ' && l.role && l.role.toLowerCase() === 'branch_leader') {
      newStatus = 'Pending Managing Director';
    }
    
    if (newStatus && newStatus !== l.status) {
      await pool.query('UPDATE leave_requests SET status = $1 WHERE leave_id = $2', [newStatus, l.leave_id]);
      console.log('Fixed leave ' + l.leave_id + ' to ' + newStatus);
    }
  }
  process.exit(0);
}
fix();
