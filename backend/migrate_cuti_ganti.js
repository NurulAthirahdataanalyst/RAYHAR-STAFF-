const { Pool } = require('pg');
require('dotenv').config({path: '.env'});

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log("Creating replacement_leave_requests table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS replacement_leave_requests (
          id BIGSERIAL PRIMARY KEY,
          employee_id VARCHAR(50),
          leave_request_id INTEGER,
          leave_date DATE,
          replacement_date DATE,
          description TEXT,
          required_hours DECIMAL(4,2) DEFAULT 4,
          actual_hours DECIMAL(4,2),
          validation_status VARCHAR(50) DEFAULT 'Pending',
          attendance_id BIGINT,
          validated_at TIMESTAMP,
          validated_by VARCHAR(50) DEFAULT 'System',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT fk_leave_request
            FOREIGN KEY (leave_request_id) 
            REFERENCES leave_requests(leave_id) 
            ON DELETE CASCADE
      );
    `);
    
    // Add index on employee_id and dates for faster lookup
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_replacement_leave_emp_date ON replacement_leave_requests (employee_id, replacement_date);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_replacement_leave_status ON replacement_leave_requests (validation_status);`);

    console.log("Table created successfully!");
  } catch(e) {
    console.error("Migration failed:", e);
  } finally {
    pool.end();
  }
})();
