require("dotenv").config();
const mysql = require("mysql2/promise");

if (!process.env.DB_PASSWORD && !process.env.MYSQLPASSWORD) {
  console.error("DB_PASSWORD is missing. Set it in backend/.env");
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",
  user: process.env.DB_USER || process.env.MYSQLUSER || "root",
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || "employee_portal",
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3307),
});

(async () => {
  try {
    const [lr] = await pool.query("DESCRIBE leave_requests;");
    const [att] = await pool.query("DESCRIBE attendances;");
    console.log("LEAVE_REQUESTS:\n", JSON.stringify(lr, null, 2));
    console.log("ATTENDANCES:\n", JSON.stringify(att, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
