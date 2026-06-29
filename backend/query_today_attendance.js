const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT 
        attendance_id, 
        user_id, 
        clock_in,
        clock_in::text as clock_in_raw_text,
        clock_in AT TIME ZONE 'Asia/Kuala_Lumpur' as clock_in_kl,
        TO_CHAR(clock_in AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') as clock_in_char
      FROM attendances 
      WHERE DATE(clock_in) = CURRENT_DATE;
    `);
    console.log("Today's attendance records in DB:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
