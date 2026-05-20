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
    const connection = await pool.getConnection();
    
    // 1. Rename employee_id to user_id in leave_requests
    try {
      await connection.query("ALTER TABLE leave_requests DROP FOREIGN KEY leave_requests_ibfk_1;");
      console.log("Dropped FK leave_requests_ibfk_1");
    } catch (e) { console.log(e.message); }

    try {
      await connection.query("ALTER TABLE leave_requests CHANGE employee_id user_id VARCHAR(10) NOT NULL;");
      console.log("Renamed employee_id to user_id in leave_requests");
    } catch (e) { console.log(e.message); }
    
    try {
      await connection.query("ALTER TABLE leave_requests ADD CONSTRAINT lr_user_fk FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;");
      console.log("Added FK lr_user_fk");
    } catch (e) { console.log(e.message); }

    // 2. Rename employee_id to user_id in attendances
    try {
      await connection.query("ALTER TABLE attendances DROP FOREIGN KEY attendances_ibfk_1;");
      console.log("Dropped FK attendances_ibfk_1");
    } catch (e) { console.log(e.message); }

    try {
      await connection.query("ALTER TABLE attendances CHANGE employee_id user_id VARCHAR(10) NOT NULL;");
      console.log("Renamed employee_id to user_id in attendances");
    } catch (e) { console.log(e.message); }

    try {
      await connection.query("ALTER TABLE attendances ADD CONSTRAINT att_user_fk FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;");
      console.log("Added FK att_user_fk");
    } catch (e) { console.log(e.message); }

    // 3. Make email unique in profiles if not already
    try {
      await connection.query("ALTER TABLE profiles ADD UNIQUE (email);");
      console.log("Added unique constraint to email in profiles");
    } catch (e) { console.log(e.message); }
    
    // 4. Update any existing user_id if they are numbers (just in case)
    try {
      await connection.query("UPDATE profiles SET user_id = CONCAT('E', LPAD(user_id, 3, '0')) WHERE user_id REGEXP '^[0-9]+$';");
      await connection.query("UPDATE leave_requests SET user_id = CONCAT('E', LPAD(user_id, 3, '0')) WHERE user_id REGEXP '^[0-9]+$';");
      await connection.query("UPDATE leave_requests SET approver_id = CONCAT('E', LPAD(approver_id, 3, '0')) WHERE approver_id REGEXP '^[0-9]+$';");
      await connection.query("UPDATE attendances SET user_id = CONCAT('E', LPAD(user_id, 3, '0')) WHERE user_id REGEXP '^[0-9]+$';");
      await connection.query("UPDATE user_role SET user_id = CONCAT('E', LPAD(user_id, 3, '0')) WHERE user_id REGEXP '^[0-9]+$';");
      console.log("Updated numeric IDs to E00x format");
    } catch (e) { console.log(e.message); }

    connection.release();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
