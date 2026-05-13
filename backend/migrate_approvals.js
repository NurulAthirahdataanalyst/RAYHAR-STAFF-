const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST,
  user: process.env.DB_USER || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE,
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  ssl: {
    rejectUnauthorized: false
  }
};

async function migrate() {
  const connection = await mysql.createConnection(dbConfig);
  console.log("Connected to database.");

  try {
    // 1. Create leave_approvals table
    console.log("Creating leave_approvals table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS leave_approvals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        leave_id INT NOT NULL,
        approver_id VARCHAR(50) NOT NULL,
        approver_role VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (leave_id) REFERENCES leave_requests(leave_id) ON DELETE CASCADE
      )
    `);
    console.log("✅ leave_approvals table created.");

    // 2. Add any missing columns to leave_requests if necessary (already mostly there)
    // The plan implies we might need to handle more statuses than before.
    
    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await connection.end();
  }
}

migrate();
