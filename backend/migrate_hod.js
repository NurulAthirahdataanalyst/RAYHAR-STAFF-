const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "../.env") });

const { Pool } = require("pg");

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

(async () => {
  try {
    const pool = new Pool(dbConfig);

    console.log("Creating hod_history table if it doesn't exist...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hod_history (
        id SERIAL PRIMARY KEY,
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
