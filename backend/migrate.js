const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST,
  user: process.env.DB_USER || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE,
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await pool.query('ALTER TABLE profiles MODIFY COLUMN user_id INT NOT NULL;');
    console.log('1 done');
    await pool.query('ALTER TABLE profiles MODIFY COLUMN user_id VARCHAR(10) NOT NULL;');
    console.log('2 done');
    await pool.query('ALTER TABLE user_role MODIFY COLUMN user_id VARCHAR(10) DEFAULT NULL;');
    console.log('3 done');
    await pool.query("UPDATE profiles SET user_id = CONCAT('E', LPAD(user_id, 3, '0')) WHERE user_id REGEXP '^[0-9]+$';");
    console.log('4 done');
    await pool.query("UPDATE user_role SET user_id = CONCAT('E', LPAD(user_id, 3, '0')) WHERE user_id REGEXP '^[0-9]+$';");
    console.log('5 done');
    await pool.query("UPDATE leave_requests SET user_id = CONCAT('E', LPAD(user_id, 3, '0')) WHERE user_id REGEXP '^[0-9]+$';");
    console.log('6 done');
    await pool.query("UPDATE leave_requests SET approver_id = CONCAT('E', LPAD(approver_id, 3, '0')) WHERE approver_id REGEXP '^[0-9]+$';");
    console.log('7 done');
    await pool.query("UPDATE attendances SET user_id = CONCAT('E', LPAD(user_id, 3, '0')) WHERE user_id REGEXP '^[0-9]+$';");
    console.log('8 done');
    console.log("MIGRATION COMPLETE!");
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();
