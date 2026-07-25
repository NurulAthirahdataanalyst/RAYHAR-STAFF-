const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDanishLeaves() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL
  });

  try {
    const [rows] = await pool.query("SELECT * FROM leave_requests WHERE user_id = 'E009'");
    console.log("Danish Leaves:", rows);
    
    const [adj] = await pool.query("SELECT * FROM leave_balance_adjustments WHERE employee_id = 'E009'");
    console.log("Danish Adjustments:", adj);

    const [prof] = await pool.query("SELECT * FROM profiles WHERE user_id = 'E009'");
    console.log("Danish Profile:", prof);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

checkDanishLeaves();
