const { Pool } = require('pg');
const { calculateExpectedWorkingDays } = require("./workingDaysHelper");
const { startOfMonth, endOfMonth, startOfYear, endOfYear, format, isBefore } = require("date-fns");
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres.xvpebtompjcjfvuzeumo:RayharTravel2026@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres' });

const malaysiaHolidays = [
  // 2024
  { date: "2024-01-01", name: "New Year's Day" },
  { date: "2024-02-10", name: "Chinese New Year" },
  { date: "2024-02-11", name: "Chinese New Year" },
  { date: "2024-03-28", name: "Nuzul Al-Quran" },
  { date: "2024-04-10", name: "Hari Raya Aidilfitri" },
  { date: "2024-04-11", name: "Hari Raya Aidilfitri" },
  { date: "2024-05-01", name: "Labour Day" },
  { date: "2024-05-22", name: "Wesak Day" },
  { date: "2024-06-03", name: "Agong's Birthday" },
  { date: "2024-06-17", name: "Hari Raya Haji" },
  { date: "2024-07-07", name: "Awal Muharram" },
  { date: "2024-08-31", name: "Merdeka Day" },
  { date: "2024-09-16", name: "Malaysia Day" },
  { date: "2024-10-31", name: "Deepavali" },
  { date: "2024-12-25", name: "Christmas Day" },
  
  // 2025
  { date: "2025-01-01", name: "New Year's Day" },
  { date: "2025-01-29", name: "Chinese New Year" },
  { date: "2025-01-30", name: "Chinese New Year" },
  { date: "2025-03-17", name: "Nuzul Al-Quran" },
  { date: "2025-03-31", name: "Hari Raya Aidilfitri" },
  { date: "2025-04-01", name: "Hari Raya Aidilfitri" },
  { date: "2025-05-01", name: "Labour Day" },
  { date: "2025-05-12", name: "Wesak Day" },
  { date: "2025-06-02", name: "Agong's Birthday" },
  { date: "2025-06-06", name: "Hari Raya Haji" },
  { date: "2025-06-27", name: "Awal Muharram" },
  { date: "2025-08-31", name: "Merdeka Day" },
  { date: "2025-09-05", name: "Prophet Muhammad's Birthday" },
  { date: "2025-09-16", name: "Malaysia Day" },
  { date: "2025-10-20", name: "Deepavali" },
  { date: "2025-12-25", name: "Christmas Day" },

  // 2026
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-02-17", name: "Chinese New Year" },
  { date: "2026-02-18", name: "Chinese New Year" },
  { date: "2026-03-06", name: "Nuzul Al-Quran" },
  { date: "2026-03-20", name: "Hari Raya Aidilfitri" },
  { date: "2026-03-21", name: "Hari Raya Aidilfitri" },
  { date: "2026-05-01", name: "Labour Day" },
  { date: "2026-05-01", name: "Wesak Day" },
  { date: "2026-05-26", name: "Hari Raya Haji" },
  { date: "2026-06-01", name: "Agong's Birthday" },
  { date: "2026-06-16", name: "Awal Muharram" },
  { date: "2026-08-25", name: "Prophet Muhammad's Birthday" },
  { date: "2026-08-31", name: "Merdeka Day" },
  { date: "2026-09-16", name: "Malaysia Day" },
  { date: "2026-11-08", name: "Deepavali" },
  { date: "2026-12-25", name: "Christmas Day" }
];

function getLateThresholdTime() {
  return "09:00:00";
}

async function run() {
  const userId = 'E016';
  try {
    const [empRows] = await pool.query("SELECT * FROM profiles WHERE user_id = ?", [userId]);
    if (empRows.length === 0) return console.log("Employee not found");
    const employee = empRows[0];

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const currentYearStart = startOfYear(now);
    const currentYearEnd = endOfYear(now);

    const [companyLeaves] = await pool.query("SELECT * FROM company_leave_calendar WHERE status = 'Active' AND EXTRACT(YEAR FROM start_date) = ?", [now.getFullYear()]);
    const [allLeaves] = await pool.query("SELECT * FROM leave_requests WHERE user_id = ? AND EXTRACT(YEAR FROM start_date) = ?", [userId, now.getFullYear()]);
    const userLeaves = allLeaves.filter(l => l.status === 'Approved');

    const [attendances] = await pool.query("SELECT clock_in, clock_out FROM attendances WHERE user_id = ? AND EXTRACT(YEAR FROM clock_in) = ?", [userId, now.getFullYear()]);

    const monthEndToUse = isBefore(now, currentMonthEnd) ? now : currentMonthEnd;
    const yearEndToUse = now;

    const monthlyExpected = calculateExpectedWorkingDays(currentMonthStart, monthEndToUse, employee, companyLeaves, userLeaves, malaysiaHolidays);
    const yearlyExpected = calculateExpectedWorkingDays(currentYearStart, yearEndToUse, employee, companyLeaves, userLeaves, malaysiaHolidays);

    let monthlyPresent = 0;
    let monthlyLate = 0;
    let yearlyPresent = 0;
    let yearlyLate = 0;

    const lateThreshold = getLateThresholdTime();

    attendances.forEach(att => {
      const clockIn = new Date(att.clock_in);
      const clockInTimeStr = format(clockIn, 'HH:mm:ss');
      
      const isLate = clockInTimeStr > lateThreshold;
      
      if (clockIn >= currentYearStart && clockIn <= currentYearEnd) {
        yearlyPresent++;
        if (isLate) yearlyLate++;
      }
      
      if (clockIn >= currentMonthStart && clockIn <= currentMonthEnd) {
        monthlyPresent++;
        if (isLate) monthlyLate++;
      }
    });

    const monthlyAbsent = Math.max(0, monthlyExpected - monthlyPresent);
    const yearlyAbsent = Math.max(0, yearlyExpected - yearlyPresent);

    const monthlyRate = monthlyExpected > 0 ? Math.round((monthlyPresent / monthlyExpected) * 100) : 100;
    const yearlyRate = yearlyExpected > 0 ? Math.round((yearlyPresent / yearlyExpected) * 100) : 100;

    let annualLeaveEntitlement = 14;
    let approvedLeaveUsed = 0;
    let pendingLeaves = 0;
    let rejectedLeaves = 0;

    allLeaves.forEach(l => {
      const isAnnual = ['Cuti Tahunan', 'Annual/Emergency Leave', 'Cuti Sakit', 'Sick Leave'].includes(l.leave_type);
      if (l.status === 'Approved' && isAnnual) {
        approvedLeaveUsed += Number(l.days || 0);
      }
      if (l.status.startsWith('Pending')) pendingLeaves++;
      if (l.status === 'Rejected') rejectedLeaves++;
    });

    const remainingLeaveBalance = Math.max(0, annualLeaveEntitlement - approvedLeaveUsed);
    const leaveUtilizationRate = Math.round((approvedLeaveUsed / annualLeaveEntitlement) * 100);

    console.log(JSON.stringify({
      success: true,
      analytics: {
        attendance: {
          monthly: { rate: monthlyRate, present: monthlyPresent, late: monthlyLate, absent: monthlyAbsent, expected: monthlyExpected },
          yearly: { rate: yearlyRate, present: yearlyPresent, late: yearlyLate, absent: yearlyAbsent, expected: yearlyExpected }
        },
        leave: {
          entitlement: annualLeaveEntitlement,
          used: approvedLeaveUsed,
          remaining: remainingLeaveBalance,
          utilizationRate: leaveUtilizationRate,
          pending: pendingLeaves,
          rejected: rejectedLeaves
        }
      }
    }, null, 2));
    pool.end();
  } catch (err) {
    console.error("Analytics Error:", err);
    pool.end();
  }
}
run();
