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
