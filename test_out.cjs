const { pool } = require('./backend/db');

async function test() {
  try {
    const [outstationRows] = await pool.query(
      `SELECT oa.id, oa.user_id, p.full_name, oa.branch, oa.department,
              oa.destination, oa.purpose, oa.start_date, oa.end_date, oa.status
       FROM outstation_assignments oa
       LEFT JOIN profiles p ON oa.user_id = p.user_id
       WHERE 1=1
       ORDER BY oa.start_date DESC`,
      []
    );
    console.log("FETCHED:", outstationRows.length);
    for (const r of outstationRows) {
      const start = r.start_date ? new Date(r.start_date).toISOString().split('T')[0] : null;
      const end = r.end_date ? new Date(r.end_date).toISOString().split('T')[0] : null;
      const today = new Date().toISOString().split('T')[0];
      let computedStatus = r.status;
      if (r.status !== 'Cancelled') {
        if (today < start) computedStatus = 'Upcoming';
        else if (today >= start && today <= end) computedStatus = 'Active';
        else computedStatus = 'Completed';
      }
      console.log("OUTSTATION:", start, end, computedStatus);
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
test();
