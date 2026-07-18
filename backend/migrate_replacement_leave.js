require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS replacement_leave_requests (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        leave_request_id INTEGER NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
        leave_date DATE NOT NULL,
        replacement_date DATE NOT NULL,
        description TEXT NOT NULL,
        required_hours DECIMAL(4,2) DEFAULT 4.0,
        actual_hours DECIMAL(4,2) DEFAULT NULL,
        validation_status VARCHAR(50) DEFAULT 'Pending',
        validated_at TIMESTAMP,
        validated_by VARCHAR(50) DEFAULT 'System',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_replacement_date_unique 
      ON replacement_leave_requests (employee_id, replacement_date)
      WHERE validation_status IN ('Pending', 'Waiting for Replacement Date', 'Validated');
    `);

    console.log("Table replacement_leave_requests created successfully.");
  } catch(e) {
    console.error("Migration error:", e);
  } finally {
    pool.end();
  }
}
migrate();
