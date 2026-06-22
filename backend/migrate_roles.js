const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST,
  user: process.env.DB_USER || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE,
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 5432),
  ssl: { rejectUnauthorized: false }
};

const pgPool = connectionString ? new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10
}) : new Pool(dbConfig);

(async () => {
  try {
    console.log("Connecting to Database...");
    
    // Create roles table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("roles table created or already exists.");

    // Insert default roles if table is empty
    const { rows } = await pgPool.query("SELECT COUNT(*) FROM roles");
    if (parseInt(rows[0].count) === 0) {
      console.log("Inserting default roles...");
      const defaultRoles = [
        "Admin", "HR Manager", "Recruitment Manager", "Payroll Manager", 
        "Leave Manager", "Performance Manager", "Reports Analyst", "Employee", "Client"
      ];
      
      for (const role of defaultRoles) {
        await pgPool.query("INSERT INTO roles (name, status) VALUES ($1, 'Active')", [role]);
      }
      console.log("Default roles inserted.");
    } else {
      console.log("Roles already exist, skipping default inserts.");
    }
    
    console.log("Migration successful!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
})();
