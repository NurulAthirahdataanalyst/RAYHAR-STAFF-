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
    console.log("Connecting to Database to update roles...");
    
    // Delete all existing roles
    await pgPool.query("DELETE FROM roles");
    console.log("Deleted old roles.");

    // Insert the specific roles requested by the user
    const exactRoles = [
      "employee", 
      "branch_leader", 
      "hr_admin", 
      "managing_director", 
      "finance_manager", 
      "branch_officer"
    ];
    
    for (const role of exactRoles) {
      await pgPool.query("INSERT INTO roles (name, status) VALUES ($1, 'Active')", [role]);
    }
    
    console.log("Exact roles inserted successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
})();
