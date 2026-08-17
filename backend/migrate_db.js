const { Pool } = require('pg');
require('dotenv').config({path: './.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function migrate() {
  await pool.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7)`);
  await pool.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7)`);
  await pool.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS radius INT DEFAULT 50`);

  await pool.query(`ALTER TABLE attendances ADD COLUMN IF NOT EXISTS clock_in_latitude DECIMAL(10, 7)`);
  await pool.query(`ALTER TABLE attendances ADD COLUMN IF NOT EXISTS clock_in_longitude DECIMAL(10, 7)`);
  await pool.query(`ALTER TABLE attendances ADD COLUMN IF NOT EXISTS clock_in_accuracy DECIMAL(10, 2)`);
  
  await pool.query(`ALTER TABLE attendances ADD COLUMN IF NOT EXISTS clock_out_latitude DECIMAL(10, 7)`);
  await pool.query(`ALTER TABLE attendances ADD COLUMN IF NOT EXISTS clock_out_longitude DECIMAL(10, 7)`);
  await pool.query(`ALTER TABLE attendances ADD COLUMN IF NOT EXISTS clock_out_accuracy DECIMAL(10, 2)`);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employee_location_logs (
      id SERIAL PRIMARY KEY,
      employee_id VARCHAR(50),
      attendance_id INT,
      assignment_id INT,
      latitude DECIMAL(10, 7),
      longitude DECIMAL(10, 7),
      accuracy DECIMAL(10, 2),
      location_type VARCHAR(50),
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(45)
    )
  `);
  console.log('Migration done');
  process.exit(0);
}
migrate();
