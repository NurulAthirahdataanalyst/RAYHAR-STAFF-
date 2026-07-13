const { pool } = require('./backend/db');

async function test() {
  try {
    const [rows] = await pool.query('SELECT oa.id, oa.user_id, p.full_name, oa.status FROM outstation_assignments oa LEFT JOIN profiles p ON oa.user_id = p.user_id');
    console.log("OUTSTATIONS:", rows);
    const [lrows] = await pool.query('SELECT lr.leave_id AS id, lr.user_id, p.full_name, lr.status FROM leave_requests lr JOIN profiles p ON p.user_id = lr.user_id');
    console.log("LEAVES:", lrows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
test();
