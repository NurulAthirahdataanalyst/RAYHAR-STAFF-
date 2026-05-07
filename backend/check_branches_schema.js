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
    const [rows] = await pool.query("DESCRIBE branches;");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
