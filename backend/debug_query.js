const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function debugQuery() {
  const dbConfig = {
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: Number(process.env.MYSQLPORT || 3306),
    ssl: { rejectUnauthorized: false }
  };

  try {
    const pool = mysql.createPool(dbConfig);
    const branch = 'HQ';
    
    console.log("Running debug query for branch:", branch);
    
    const [rows] = await pool.query(
      `
      SELECT
        p.user_id,
        p.full_name,
        p.email,
        p.branch,
        p.status,
        COALESCE(ur.role, 'employee') AS role,
        COALESCE(lr.pending_leaves, 0) AS pending_leaves,
        COALESCE(lr.approved_leaves, 0) AS approved_leaves,
        COALESCE(lr.rejected_leaves, 0) AS rejected_leaves,
        COALESCE(lr.total_leave_requests, 0) AS total_leave_requests,
        COALESCE(lr.mc_leaves, 0) AS mc_leaves,
        GREATEST(14 - COALESCE(lr.annual_days_used, 0), 0) AS annual_leave_balance,
        COALESCE(att.days_present, 0) AS days_present,
        ROUND((COALESCE(att.days_present, 0) / DAY(CURDATE())) * 100) AS attendance_rate,
        today.clock_in AS today_clock_in,
        today.clock_out AS today_clock_out,
        CASE WHEN leave_today.leave_id IS NOT NULL THEN 1 ELSE 0 END AS is_on_leave
      FROM profiles p
      LEFT JOIN user_role ur ON ur.user_id = p.user_id
      LEFT JOIN (
        SELECT
          user_id,
          SUM(CASE WHEN leave_type = 'Cuti Tahunan' AND status <> 'Rejected' THEN days ELSE 0 END) AS annual_days_used,
          SUM(CASE WHEN status LIKE 'Pending%' THEN 1 ELSE 0 END) AS pending_leaves,
          SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved_leaves,
          SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_leaves,
          SUM(CASE WHEN leave_type = 'Cuti Sakit' THEN 1 ELSE 0 END) AS mc_leaves,
          COUNT(*) AS total_leave_requests
        FROM leave_requests
        GROUP BY user_id
      ) lr ON lr.user_id = p.user_id
      LEFT JOIN (
        SELECT
          user_id,
          COUNT(DISTINCT DATE(clock_in)) AS days_present
        FROM attendances
        WHERE YEAR(clock_in) = YEAR(CURDATE())
        AND MONTH(clock_in) = MONTH(CURDATE())
        GROUP BY user_id
      ) att ON att.user_id = p.user_id
      LEFT JOIN (
        SELECT a.user_id, a.clock_in, a.clock_out
        FROM attendances a
        INNER JOIN (
          SELECT user_id, MAX(attendance_id) AS latest_attendance_id
          FROM attendances
          WHERE DATE(clock_in) = CURDATE()
          GROUP BY user_id
        ) latest ON latest.latest_attendance_id = a.attendance_id
      ) today ON today.user_id = p.user_id
      LEFT JOIN (
        SELECT user_id, leave_id
        FROM leave_requests
        WHERE status = 'Approved'
        AND CURDATE() BETWEEN DATE(start_date) AND DATE(end_date)
        GROUP BY user_id
      ) leave_today ON leave_today.user_id = p.user_id
      WHERE p.branch = ?
      ORDER BY p.full_name ASC
      `,
      [branch]
    );

    console.log("Query successful, rows found:", rows.length);
    if (rows.length > 0) {
        console.log("First row sample:", rows[0]);
    }
    
    await pool.end();
  } catch (err) {
    console.error("QUERY FAILED!");
    console.error(err);
  }
}

debugQuery();
