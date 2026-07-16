const { Pool } = require('pg');
require('dotenv').config({path: '.env'});

(async () => {
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const sanitizeParams = p => p;
  const mysqlToPostgres = (sql, params) => {
    if (params && params.length > 0) {
      let i = 1;
      sql = sql.replace(/\?/g, () => '$' + (i++));
    }
    return sql;
  };

  const pool = {
    query: async (sql, params) => {
      params = sanitizeParams(params);
      sql = mysqlToPostgres(sql, params);
      const res = await pgPool.query(sql, params);
      let resultObj = res.rows || [];
      if (!Array.isArray(resultObj)) resultObj = [];
      return [resultObj, res.fields];
    }
  };

  const getLateThresholdTime = () => "09:00:00";
  
  try {
    const role = 'hr_admin';
    const branch = 'HQ';
    const department = 'Haji Umrah (BHU)';
    const queryDate = '2026-07-16';
    let adminStats = null;
    let globalRecentActivities = null;

    console.log("Starting hr_admin queries...");

    const isBranchLeader = role === "branch_leader";
    const isHOD = role === "head_of_department";
    const queryParams = [];
    let profileFilter = "";
    let attendanceFilter = "AND user_id IN (SELECT user_id FROM profiles WHERE status = 'Active')";

    const dateCondition = "?::date";
    const profileQueryParams = [queryDate, ...queryParams];

    console.log("Query 1: attendanceCheck");
    let attendanceCheckFilter = "";
    let attendanceCheckParams = [queryDate];
    const [attendanceCheck] = await pool.query(
      `SELECT COUNT(*) AS count FROM attendances WHERE DATE(clock_in) = ?::date${attendanceCheckFilter}`,
      attendanceCheckParams
    );
    const totalDayAttendances = parseInt(attendanceCheck[0].count || 0);

    console.log("Query 2: employeeRows");
    const [employeeRows] = await pool.query(
      `SELECT COUNT(*) AS total_employees FROM profiles WHERE status = 'Active' AND DATE(created_at) <= ${dateCondition}::date ${profileFilter}`,
      profileQueryParams
    );
    console.log(employeeRows);

    const presentParams = [queryDate, queryDate, queryDate, ...queryParams];
    const onLeaveParams = [queryDate, ...queryParams];

    console.log("Query 3: presentRows");
    const [presentRows] = await pool.query(
      `SELECT COUNT(DISTINCT user_id) AS present_today FROM attendances WHERE DATE(clock_in) = ${dateCondition} 
       AND NOT EXISTS (
         SELECT 1 FROM leave_requests lr 
         WHERE lr.user_id = attendances.user_id AND lr.status = 'Approved' 
         AND ${dateCondition} BETWEEN lr.start_date AND lr.end_date
       )
       AND NOT EXISTS (
         SELECT 1 FROM outstation_assignments oa 
         WHERE oa.user_id = attendances.user_id AND oa.status != 'Cancelled' 
         AND ${dateCondition} BETWEEN (oa.start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (oa.end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date
       )
       ${attendanceFilter}`,
      presentParams
    );
    console.log(presentRows);

    console.log("Query 4: onLeaveRows");
    const [onLeaveRows] = await pool.query(
      `SELECT COUNT(DISTINCT user_id) AS on_leave FROM leave_requests WHERE status = 'Approved' AND ${dateCondition} BETWEEN DATE(start_date) AND DATE(end_date) ${attendanceFilter}`,
      onLeaveParams
    );

    console.log("Query 5: outstationRows");
    const [outstationRows] = await pool.query(
      `SELECT COUNT(DISTINCT user_id) AS outstation FROM outstation_assignments WHERE status != 'Cancelled' AND ${dateCondition} BETWEEN (start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date ${attendanceFilter}`,
      onLeaveParams
    );

    console.log("Query 6: lateRows");
    const lateTimeStr = getLateThresholdTime();
    const [lateRows] = await pool.query(
      `SELECT COUNT(DISTINCT user_id) AS late_arrivals FROM attendances WHERE DATE(clock_in) = ${dateCondition} AND (clock_in AT TIME ZONE 'Asia/Kuala_Lumpur')::time > '${lateTimeStr}' 
       AND NOT EXISTS (
         SELECT 1 FROM leave_requests lr 
         WHERE lr.user_id = attendances.user_id AND lr.status = 'Approved' 
         AND ${dateCondition} BETWEEN lr.start_date AND lr.end_date
       )
       AND NOT EXISTS (
         SELECT 1 FROM outstation_assignments oa 
         WHERE oa.user_id = attendances.user_id AND oa.status != 'Cancelled' 
         AND ${dateCondition} BETWEEN (oa.start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (oa.end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date
       )
       ${attendanceFilter}`,
      presentParams
    );

    console.log("Query 7: pendingRows");
    const statusToCount = "Pending%";
    const [pendingRows] = await pool.query(
      `SELECT COUNT(*) AS pending_approvals FROM leave_requests WHERE status LIKE ? ${attendanceFilter}`,
      [statusToCount, ...queryParams]
    );

    console.log("Query 8: outstationTodayRows");
    const outstationParams = queryDate ? [queryDate, ...queryParams] : queryParams;
    const [outstationTodayRows] = await pool.query(
      `SELECT COUNT(DISTINCT user_id) AS outstation_today FROM outstation_assignments WHERE status != 'Cancelled' AND ${dateCondition} BETWEEN (start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date ${attendanceFilter}`,
      outstationParams
    );

    console.log("Query 9: upcomingOutstationRows");
    const [upcomingOutstationRows] = await pool.query(
      `SELECT COUNT(DISTINCT user_id) AS upcoming_outstation FROM outstation_assignments WHERE status != 'Cancelled' AND (start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date > ${dateCondition} ${attendanceFilter}`,
      outstationParams
    );

    console.log("Query 10: recentRows");
    const [recentRows] = await pool.query(
      `SELECT p.full_name AS name, 'Leave' AS action, CONCAT('Leave ', lr.status) AS status, TO_CHAR(lr.created_at, 'HH12:MI AM') AS time
      FROM leave_requests lr
      JOIN profiles p ON p.user_id = lr.user_id
      ${profileFilter ? "WHERE 1=1 " + profileFilter : ""}
      ORDER BY lr.created_at DESC LIMIT 5`,
      queryParams
    );

    console.log("Query 11: companyLeaveDays");
    const [companyLeaveDays] = await pool.query(
      `SELECT * FROM company_leave_calendar WHERE status = 'Active' AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date BETWEEN (start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date`
    );

    console.log("Query 12: upcomingCompanyLeaveRows");
    const [upcomingCompanyLeaveRows] = await pool.query(
      `SELECT * FROM company_leave_calendar WHERE status = 'Active' AND DATE(end_date) >= CURRENT_DATE ORDER BY start_date ASC LIMIT 1`
    );

    console.log("Query 13: allActiveProfiles");
    const [allActiveProfiles] = await pool.query(
      `SELECT user_id, branch, department FROM profiles WHERE status = 'Active' AND DATE(created_at) <= ${dateCondition}::date ${profileFilter}`,
      profileQueryParams
    );

    console.log("Query 14: clockedInRows");
    const [clockedInRows] = await pool.query(
      `SELECT DISTINCT user_id FROM attendances WHERE DATE(clock_in) = ${dateCondition} ${attendanceFilter}`,
      onLeaveParams
    );

    console.log("Query 15: personalLeaveRows");
    const [personalLeaveRows] = await pool.query(
      `SELECT DISTINCT user_id FROM leave_requests WHERE status = 'Approved' AND ${dateCondition} BETWEEN DATE(start_date) AND DATE(end_date) ${attendanceFilter}`,
      onLeaveParams
    );

    console.log("Done queries, no crash!");
  } catch(e) {
    console.error('Error:', e);
  } finally {
    pgPool.end();
  }
})();
