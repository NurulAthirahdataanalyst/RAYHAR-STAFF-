const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

const analyticsRoute = `
app.get("/api/employees/:userId/analytics", async (req, res) => {
  const { userId } = req.params;
  try {
    const [empRows] = await pool.query("SELECT * FROM profiles WHERE user_id = ?", [userId]);
    if (empRows.length === 0) return res.status(404).json({ success: false, error: "Employee not found" });
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

    attendances.forEach(a => {
      const klTime = new Date(new Date(a.clock_in).getTime() + 8 * 60 * 60 * 1000);
      const d = klTime.toISOString().split('T')[0];
      const hh = klTime.getUTCHours();
      const mm = klTime.getUTCMinutes();
      const lateTimeStr = getLateThresholdTime ? getLateThresholdTime() : '09:00:00';
      const [lhStr, lmStr] = lateTimeStr.split(':');
      const lh = parseInt(lhStr);
      const lm = parseInt(lmStr);
      const isLate = hh > lh || (hh === lh && mm > lm);

      if (d.startsWith(now.toISOString().substring(0, 7))) {
        monthlyPresent++;
        if (isLate) monthlyLate++;
      }
      yearlyPresent++;
      if (isLate) yearlyLate++;
    });

    const monthlyAttendanceRate = monthlyExpected > 0 ? Math.round((monthlyPresent / monthlyExpected) * 100) : 0;
    const yearlyAttendanceRate = yearlyExpected > 0 ? Math.round((yearlyPresent / yearlyExpected) * 100) : 0;
    let monthlyAbsent = Math.max(0, monthlyExpected - monthlyPresent);
    let yearlyAbsent = Math.max(0, yearlyExpected - yearlyPresent);

    let annualTaken = 0, sickTaken = 0, unpaidTaken = 0, emergencyTaken = 0;
    userLeaves.forEach(l => {
      const days = parseInt(l.duration_days || 0);
      if (l.leave_type.toLowerCase().includes('annual')) annualTaken += days;
      else if (l.leave_type.toLowerCase().includes('medical') || l.leave_type.toLowerCase().includes('sick')) sickTaken += days;
      else if (l.leave_type.toLowerCase().includes('emergency')) emergencyTaken += days;
      else unpaidTaken += days;
    });

    let pendingLeaves = 0, rejectedLeaves = 0;
    allLeaves.forEach(l => {
        if (l.status === 'Pending') pendingLeaves++;
        if (l.status === 'Rejected') rejectedLeaves++;
    });

    const totalLeaveBalance = parseInt(employee.annual_leave_balance || 14) + parseInt(employee.medical_leave_balance || 14);
    const totalTaken = annualTaken + sickTaken + emergencyTaken + unpaidTaken;
    const remainingLeaveBalance = totalLeaveBalance - (annualTaken + sickTaken);
    const leaveUtilizationRate = totalLeaveBalance > 0 ? Math.round(((annualTaken + sickTaken) / totalLeaveBalance) * 100) : 0;

    res.json({
      success: true,
      analytics: {
        attendance: {
          monthly: { rate: Math.min(100, monthlyAttendanceRate), present: monthlyPresent, late: monthlyLate, absent: monthlyAbsent },
          yearly: { rate: Math.min(100, yearlyAttendanceRate), present: yearlyPresent, late: yearlyLate, absent: yearlyAbsent }
        },
        leave: {
          annual: { taken: annualTaken, balance: parseInt(employee.annual_leave_balance || 14) },
          sick: { taken: sickTaken, balance: parseInt(employee.medical_leave_balance || 14) },
          unpaid: { taken: unpaidTaken, balance: parseInt(employee.unpaid_leave_balance || 0) },
          emergency: { taken: emergencyTaken, balance: 0 },
          totalTaken,
          remaining: remainingLeaveBalance,
          utilizationRate: leaveUtilizationRate,
          pending: pendingLeaves,
          rejected: rejectedLeaves
        }
      }
    });
  } catch (err) {
    console.error("Analytics Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

`;

// Insert it right before // EMPLOYEES
if (!content.includes('app.get("/api/employees/:userId/analytics"')) {
    content = content.replace('// EMPLOYEES', analyticsRoute + '// EMPLOYEES');
    fs.writeFileSync('server.js', content, 'utf8');
    console.log("Successfully inserted analytics route.");
} else {
    console.log("Analytics route already exists.");
}
