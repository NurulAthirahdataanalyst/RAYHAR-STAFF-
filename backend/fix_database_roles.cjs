const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log("Connecting to Supabase PostgreSQL database...");
  
  // 1. Fetch user roles before update
  const before = await pool.query('SELECT * FROM user_role');
  console.log("Roles before update:", before.rows.map(r => ({ id: r.id, user_id: r.user_id, role: JSON.stringify(r.role) })));

  // 2. Update to strip carriage returns and newlines
  const updateRes = await pool.query("UPDATE user_role SET role = REGEXP_REPLACE(role, '[\\r\\n]+', '', 'g')");
  console.log("Updated rows count:", updateRes.rowCount);

  // 3. Fetch user roles after update
  const after = await pool.query('SELECT * FROM user_role');
  console.log("Roles after update:", after.rows.map(r => ({ id: r.id, user_id: r.user_id, role: JSON.stringify(r.role) })));

  await pool.end();
  console.log("Database roles clean up completed successfully!");
}

main().catch(err => {
  console.error("Clean up script failed:", err);
  process.exit(1);
});
