const dotenv = require("dotenv");
dotenv.config();

const mysql = require("mysql2/promise");

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

(async () => {
  try {
    const pool = mysql.createPool(dbConfig);

    console.log("Creating hod_history table if it doesn't exist...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hod_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department VARCHAR(100) NOT NULL,
        previous_hod_id VARCHAR(50),
        new_hod_id VARCHAR(50) NOT NULL,
        changed_by_id VARCHAR(50) NOT NULL,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ hod_history table ready.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
})();
