const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function testEmployeesQuery() {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        p.user_id,
        p.full_name,
        p.email,
        p.branch,
        p.department,
        p.status,
        COALESCE(ur.role, 'employee') AS role,
        COALESCE(lr.pending_leaves, 0) AS pending_leaves,
        COALESCE(lr.approved_leaves, 0) AS approved_leaves,
        COALESCE(lr.rejected_leaves, 0) AS rejected_leaves,
        COALESCE(lr.total_leave_requests, 0) AS total_leave_requests,
        COALESCE(lr.mc_leaves, 0) AS mc_leaves,
        GREATEST((COALESCE(p.annual_leave_entitlement, 14) + COALESCE(adj.total_adjustment, 0)) - COALESCE(lr.annual_days_used, 0), 0) AS annual_leave_balance,
        COALESCE(att.days_present, 0) AS days_present,
        LEAST(100, ROUND((COALESCE(att.days_present, 0)::numeric / NULLIF(EXTRACT(DAY FROM CURRENT_DATE), 0)) * 100)) AS attendance_rate,
        COALESCE(leave_today.is_on_leave_today, 0) AS is_on_leave_today,
        COALESCE(outstation_today.is_outstation_today, 0) AS is_outstation_today,
        today.clock_in AS today_clock_in,
        today.clock_out AS today_clock_out,
        today.attendance_type AS today_attendance_type,
        today.location AS today_location
      FROM profiles p
      LEFT JOIN user_role ur ON ur.user_id = p.user_id
      LEFT JOIN (
        SELECT employee_id, 
               SUM(CASE WHEN UPPER(leave_type) IN ('ANNUAL LEAVE', 'ANNUAL & EMERGENCY LEAVE', 'ANNUAL/EMERGENCY LEAVE', 'CUTI TAHUNAN') THEN adjustment_days ELSE 0 END) AS annual_adj,
               SUM(CASE WHEN leave_type IN ('Sick Leave', 'Medical Leave', 'Cuti Sakit') THEN adjustment_days ELSE 0 END) AS medical_adj,
               SUM(CASE WHEN leave_type IN ('Replacement Leave', 'Cuti Ganti') THEN adjustment_days ELSE 0 END) AS replacement_adj,
               SUM(adjustment_days) as total_adjustment 
        FROM leave_balance_adjustments 
        GROUP BY employee_id
      ) adj ON adj.employee_id = p.user_id
      LEFT JOIN (
        SELECT
          user_id,
          SUM(CASE WHEN leave_type IN ('Cuti Tahunan', 'Annual/Emergency Leave', 'Cuti Sakit', 'Sick Leave', 'Replacement Leave', 'Cuti Ganti') AND status = 'Approved' THEN days ELSE 0 END) AS annual_days_used,
          SUM(CASE WHEN status LIKE 'Pending%' THEN 1 ELSE 0 END) AS pending_leaves,
          SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved_leaves,
          SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_leaves,
          SUM(CASE WHEN leave_type IN ('Cuti Sakit', 'Sick Leave') THEN 1 ELSE 0 END) AS mc_leaves,
          COUNT(*) AS total_leave_requests
        FROM leave_requests
        GROUP BY user_id
      ) lr ON lr.user_id = p.user_id
      LEFT JOIN (
        SELECT
          user_id,
          COUNT(DISTINCT DATE(clock_in AT TIME ZONE 'Asia/Kuala_Lumpur')) AS days_present
        FROM attendances
        WHERE EXTRACT(YEAR FROM (clock_in AT TIME ZONE 'Asia/Kuala_Lumpur')) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND EXTRACT(MONTH FROM (clock_in AT TIME ZONE 'Asia/Kuala_Lumpur')) = EXTRACT(MONTH FROM CURRENT_DATE)
        GROUP BY user_id
      ) att ON att.user_id = p.user_id
      LEFT JOIN (
        SELECT a.user_id, a.clock_in, a.clock_out, a.attendance_type, a.location
        FROM attendances a
        INNER JOIN (
          SELECT user_id, MAX(attendance_id) AS latest_attendance_id
          FROM attendances
          WHERE DATE(clock_in AT TIME ZONE 'Asia/Kuala_Lumpur') = CURRENT_DATE
          GROUP BY user_id
        ) latest ON latest.latest_attendance_id = a.attendance_id
      ) today ON today.user_id = p.user_id
      LEFT JOIN (
        SELECT user_id, 1 AS is_on_leave_today
        FROM leave_requests
        WHERE status = 'Approved' 
        AND CURRENT_DATE BETWEEN DATE(start_date) AND DATE(end_date)
        GROUP BY user_id
      ) leave_today ON leave_today.user_id = p.user_id
      LEFT JOIN (
        SELECT user_id, 1 AS is_outstation_today
        FROM outstation_assignments
        WHERE status != 'Cancelled' 
        AND CURRENT_DATE BETWEEN DATE(start_date) AND DATE(end_date)
        GROUP BY user_id
      ) outstation_today ON outstation_today.user_id = p.user_id
      WHERE p.status = 'Active'
      ORDER BY p.full_name ASC
      LIMIT 1;
      `
    );
    console.log("SUCCESS:", rows[0]);
  } catch (e) {
    console.error("SQL ERROR:", e);
  } finally {
    pool.end();
  }
}

testEmployeesQuery();
