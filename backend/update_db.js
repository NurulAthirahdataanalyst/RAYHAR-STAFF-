const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "LocalHost",
  user: "root",
  password: "625231",
  database: "employee_portal",
  port: 3307,
});

(async () => {
  try {
    try {
      await pool.query("ALTER TABLE user_role ADD COLUMN department VARCHAR(100) DEFAULT NULL;");
      console.log("Added department to user_role");
    } catch(e) { console.log("user_role department might already exist"); }

    try {
      await pool.query("ALTER TABLE profiles ADD COLUMN department VARCHAR(100) DEFAULT NULL;");
      console.log("Added department to profiles");
    } catch(e) { console.log("profiles department might already exist"); }

    console.log("DB Updated");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
