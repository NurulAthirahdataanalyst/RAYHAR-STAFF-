const fs = require('fs');

let content = fs.readFileSync('backend/server.js', 'utf8');

const startIdx = content.indexOf('app.get("/api/reports/workforce-insights"');
if (startIdx === -1) throw new Error("Could not find start");
const endIdx = content.indexOf('app.get("/api/branches"', startIdx);
if (endIdx === -1) throw new Error("Could not find end");

const newApi = `app.get("/api/reports/workforce-insights", async (req, res) => {
  try {
    const { role, branch, department } = req.query;
    const requestedMonth = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const requestedYear = parseInt(req.query.year) || new Date().getFullYear();
    const todayStr = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kuala_Lumpur"})).toISOString().split('T')[0];
    const isDayView = !!req.query.date;
    const targetDateStr = req.query.date ? req.query.date : todayStr;
    const lateTimeStr = getLateThresholdTime();

    let profileFilter = "";
    let pFilterParams = [];

    if (role === 'branch_leader') {
      const safeBranch = (branch && branch !== "All") ? branch : "INVALID_BYPASS";
      profileFilter = " AND p.branch = ?";
      pFilterParams.push(safeBranch);
    } else if (role === 'head_of_department') {
      const safeDept = (department && department !== "All") ? department : "INVALID_BYPASS";
      profileFilter = " AND p.department = ?";
      pFilterParams.push(safeDept);
    }

    // 1. Employees & KPI
    const [empRows] = await pool.query(\`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active FROM profiles p WHERE DATE(p.created_at) <= ?::date \${profileFilter}\`, [targetDateStr, ...pFilterParams]);
    const totalHeadcount = parseInt(empRows[0].total || 0);
    const activeEmployees = parseInt(empRows[0].active || 0);

    // Fetch active company leaves
    const [companyLeaveRows] = await pool.query(
      \`SELECT * FROM company_leave_calendar WHERE status = 'Active' AND start_date <= ? AND end_date >= ?\`,
      [targetDateStr, targetDateStr]
    );

    // Calculate company leave exactly
    let companyLeaveCount = 0;
    const [allProfiles] = await pool.query(
      \`SELECT * FROM profiles p WHERE p.status = 'Active' \${profileFilter}\`, pFilterParams
    );
    
    let isCompanyLeaveDay = false;
    let companyLeaveEmployees = new Set();
    allProfiles.forEach(emp => {
      let onCL = false;
      for (let cl of companyLeaveRows) {
        if (cl.applies_to === 'All') onCL = true;
        else if (cl.applies_to === 'Specific Branch' && emp.branch === cl.branch_code) onCL = true;
        else if (cl.applies_to === 'Specific Department' && emp.department === cl.department) onCL = true;
      }
      if (onCL) {
        companyLeaveCount++;
        companyLeaveEmployees.add(emp.user_id);
      }
    });

    if (companyLeaveCount > 0 && companyLeaveCount === activeEmployees) {
      isCompanyLeaveDay = true;
    }

    // 2. Attendance & Lates
    const [attRows] = await pool.query(
      \`SELECT 
        a.user_id, p.full_name as name, p.branch, p.department, a.clock_in, a.clock_out,
        CASE WHEN (a.clock_in AT TIME ZONE 'Asia/Kuala_Lumpur')::time > ?::time THEN 1 ELSE 0 END as is_late
       FROM attendances a
       JOIN profiles p ON p.user_id = a.user_id
       WHERE EXTRACT(MONTH FROM a.clock_in) = ? AND EXTRACT(YEAR FROM a.clock_in) = ? AND p.status = 'Active' \${profileFilter}\`,
      [lateTimeStr, requestedMonth, requestedYear, ...pFilterParams]
    );

    let totalLateArrivals = 0;
    let presentToday = 0;
    let lateToday = 0;
    
    const userStats = {};

    attRows.forEach(att => {
      const isLate = parseInt(att.is_late) === 1;
      const dateObj = new Date(att.clock_in);
      const dateStr = new Date(dateObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
      
      if (isLate) totalLateArrivals++;
      if (dateStr === targetDateStr) {
        presentToday++;
        if (isLate) lateToday++;
      }

      if (!userStats[att.user_id]) {
        userStats[att.user_id] = { name: att.name, presentDays: 0, lateDays: 0 };
      }
      userStats[att.user_id].presentDays++;
      if (isLate) userStats[att.user_id].lateDays++;
    });

    const workingDaysInMonth = 22; 
    const possibleAttendances = activeEmployees * workingDaysInMonth;
    let averageAttendance = 0;
    
    if (isDayView) {
      if (isCompanyLeaveDay) {
        averageAttendance = 0;
      } else {
        const expectedToClockIn = activeEmployees - companyLeaveCount;
        averageAttendance = expectedToClockIn > 0 ? Math.round((presentToday / expectedToClockIn) * 100) : 0;
      }
    } else {
      averageAttendance = possibleAttendances > 0 ? Math.round((attRows.length / possibleAttendances) * 100) : 0;
    }

    const absences = Math.max(0, possibleAttendances - attRows.length);

    // 3. Leave Stats
    const [leaveRows] = await pool.query(
      \`SELECT lr.status, lr.start_date, lr.end_date, p.full_name as name
       FROM leave_requests lr
       JOIN profiles p ON p.user_id = lr.user_id
       WHERE EXTRACT(MONTH FROM lr.start_date) = ? AND EXTRACT(YEAR FROM lr.start_date) = ? AND p.status = 'Active' \${profileFilter}\`,
      [requestedMonth, requestedYear, ...pFilterParams]
    );

    let pendingApproval = 0;
    let approvedThisMonth = 0;
    let onLeaveToday = 0;

    leaveRows.forEach(lr => {
      if (lr.status.startsWith('Pending')) pendingApproval++;
      if (lr.status === 'Approved') approvedThisMonth++;
      
      const startObj = new Date(lr.start_date);
      const endObj = new Date(lr.end_date);
      const start = new Date(startObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
      const end = new Date(endObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
      
      if (targetDateStr >= start && targetDateStr <= end && lr.status === 'Approved') {
        onLeaveToday++;
      }
    });

    // 4. Team Availability today
    const absentToday = Math.max(0, activeEmployees - presentToday - onLeaveToday - companyLeaveCount);

    // 5. Rankings
    const rankings = Object.values(userStats).map(u => ({
      name: u.name,
      attendanceRate: Math.min(100, Math.round((u.presentDays / workingDaysInMonth) * 100)),
      lateCount: u.lateDays
    }));

    const topAttendance = [...rankings].sort((a, b) => b.attendanceRate - a.attendanceRate).slice(0, 5);
    const topLate = [...rankings].sort((a, b) => b.lateCount - a.lateCount).filter(u => u.lateCount > 0).slice(0, 5);

    // 6. Trends (Mock Data for presentation as requested)
    const monthlyTrend = [
      { month: "Jan", rate: 94 }, { month: "Feb", rate: 96 }, { month: "Mar", rate: 92 },
      { month: "Apr", rate: 97 }, { month: "May", rate: 95 }, { month: "Jun", rate: 98 }
    ];
    
    const dailyMap = {};
    attRows.forEach(att => {
      const dateObj = new Date(att.clock_in);
      const dateStr = new Date(dateObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
      const d = dateStr.slice(8, 10); 
      if (!dailyMap[d]) dailyMap[d] = { rate: 0, lates: 0, count: 0 };
      dailyMap[d].count++;
      if (parseInt(att.is_late) === 1) dailyMap[d].lates++;
    });
    
    const dailyTrend = Object.keys(dailyMap).sort().map(d => ({
      date: d,
      rate: activeEmployees > 0 ? Math.round((dailyMap[d].count / activeEmployees) * 100) : 0,
      lates: dailyMap[d].lates
    })).slice(-10);

    // 7. Employees by Department
    const [deptRows] = await pool.query(
      \`SELECT p.department, COUNT(*) as count 
       FROM profiles p 
       WHERE p.status = 'Active' AND DATE(p.created_at) <= ?::date AND p.department IS NOT NULL AND p.department != '' \${profileFilter}
       GROUP BY p.department\`,
      [targetDateStr, ...pFilterParams]
    );

    // 8. Employees by Branch
    const [branchRows] = await pool.query(
      \`SELECT p.branch, COUNT(*) as count 
       FROM profiles p 
       WHERE p.status = 'Active' AND DATE(p.created_at) <= ?::date AND p.branch IS NOT NULL AND p.branch != '' \${profileFilter}
       GROUP BY p.branch\`,
      [targetDateStr, ...pFilterParams]
    );

    const branchMonthlyAttendance = {};
    attRows.forEach(a => {
      const b = a.branch || 'HQ';
      if (!branchMonthlyAttendance[b]) branchMonthlyAttendance[b] = 0;
      branchMonthlyAttendance[b]++;
    });

    const [realLeaveAnalyticsRows] = await pool.query(
      \`SELECT lr.leave_type, COUNT(*) as count 
       FROM leave_requests lr
       JOIN profiles p ON p.user_id = lr.user_id
       WHERE lr.status = 'APPROVED'
       \${profileFilter}
       GROUP BY lr.leave_type\`,
      pFilterParams
    );
    let realLeaveAnalytics = { annual: 0, medical: 0, emergency: 0, unpaid: 0 };
    realLeaveAnalyticsRows.forEach(r => {
      const type = String(r.leave_type || '').toLowerCase();
      const count = parseInt(r.count) || 0;
      if (type.includes('annual')) realLeaveAnalytics.annual += count;
      else if (type.includes('medical') || type.includes('sick')) realLeaveAnalytics.medical += count;
      else if (type.includes('emergency')) realLeaveAnalytics.emergency += count;
      else realLeaveAnalytics.unpaid += count;
    });

    // Populate missing attendees for SSE simulation payload
    const presentUserIds = new Set(attRows.filter(a => {
      const dateObj = new Date(a.clock_in);
      const dateStr = new Date(dateObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
      return dateStr === targetDateStr;
    }).map(a => a.user_id));

    let simulatedAbsent = [];
    let simulatedCompanyLeave = [];
    allProfiles.forEach(p => {
      if (!presentUserIds.has(p.user_id)) {
        if (companyLeaveEmployees.has(p.user_id)) {
          simulatedCompanyLeave.push({
            user_id: p.user_id,
            full_name: p.full_name,
            initials: p.full_name.split(' ').map(n=>n[0]).join('').substring(0,2),
            department: p.department || '—',
            branch: p.branch || '—',
            status: 'companyLeave'
          });
        } else {
          simulatedAbsent.push({
            user_id: p.user_id,
            full_name: p.full_name,
            initials: p.full_name.split(' ').map(n=>n[0]).join('').substring(0,2),
            department: p.department || '—',
            branch: p.branch || '—',
            status: 'absent'
          });
        }
      }
    });

    // Combine them, putting company leaves first
    const finalAbsentList = [...simulatedCompanyLeave, ...simulatedAbsent].slice(0, 10);

    const sseInitialPayload = {
      attendance: attRows.filter(a => {
        const dateObj = new Date(a.clock_in);
        const dateStr = new Date(dateObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
        return dateStr === targetDateStr;
      }).map(a => ({
        user_id: a.user_id,
        full_name: a.name,
        initials: a.name.split(' ').map(n=>n[0]).join('').substring(0,2),
        department: a.department || '—',
        branch: a.branch || '—',
        clock_in: a.clock_in
      })).slice(0, 5),
      late: attRows.filter(a => {
        const dateObj = new Date(a.clock_in);
        const dateStr = new Date(dateObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
        return dateStr === targetDateStr && parseInt(a.is_late) === 1;
      }).map(a => ({
        user_id: a.user_id,
        full_name: a.name,
        initials: a.name.split(' ').map(n=>n[0]).join('').substring(0,2),
        department: a.department || '—',
        branch: a.branch || '—',
        clock_in: a.clock_in
      })).slice(0, 5),
      absent: finalAbsentList
    };

    res.json({
      success: true,
      departmentMetrics: deptRows.map(r => ({ name: r.department, value: parseInt(r.count || 0) })),
      monthlyComparison: {
        attendance: { current: 95.4, previous: 93.3 },
        lateArrivals: { current: 28, previous: 41 },
        absences: { current: 12, previous: 18 },
        leaveRequests: { current: 35, previous: 30 },
        outstation: { current: 15, previous: 11 }
      },
      branchMetrics: branchRows.map(r => {
        const total = parseInt(r.count || 0);
        const monthlyPresent = branchMonthlyAttendance[r.branch] || 0;
        const possibleBranchAttendances = total * workingDaysInMonth;
        const rate = possibleBranchAttendances > 0 
          ? Math.round((monthlyPresent / possibleBranchAttendances) * 100) 
          : 0;
        return {
          name: r.branch, 
          count: total, 
          attendanceRate: Math.min(100, rate)
        }
      }),
      leaveAnalytics: realLeaveAnalytics,
      outstationAnalytics: {
        completed: 25,
        upcoming: 8,
        cancelled: 2,
        popularRoutes: [
          { route: 'KL → Penang', trips: 8 },
          { route: 'KL → Johor', trips: 6 },
          { route: 'KL → Sabah', trips: 4 }
        ]
      },
      workforceMovement: {
        newJoiners: 4,
        resigned: 2,
        transferred: 3,
        promotions: 1
      },
      hrAlerts: [
        { title: '4 Employees', description: 'Absent 3 Consecutive Days', type: 'critical' },
        { title: '2 Contracts', description: 'Expiring in 30 Days', type: 'warning' },
        { title: '7 Leave Requests', description: 'Awaiting Approval', type: 'info' },
        { title: 'Attendance', description: '↑4% vs Last Month', type: 'success' }
      ],
      topKpi: {
        totalHeadcount,
        activeEmployees,
        attendanceRate: Math.min(100, averageAttendance),
        onLeaveToday,
        companyLeaveToday: companyLeaveCount,
        outstationToday: 0
      },
      attendanceOverview: {
        averageAttendance: Math.min(100, averageAttendance),
        lateArrivals: totalLateArrivals,
        absences,
        monthlyTrend,
        dailyTrend
      },
      leaveMonitoring: {
        pendingApproval,
        approvedThisMonth,
        staffOnLeaveToday: onLeaveToday
      },
      teamAvailability: {
        present: presentToday,
        onLeave: onLeaveToday,
        companyLeave: companyLeaveCount,
        absent: absentToday,
        late: lateToday
      },
      performance: {
        topAttendance,
        topLate,
        allAttendance: rankings
      },
      sseInitialPayload
    });
  } catch (err) {
    console.error("workforce-insights error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
`;

content = content.substring(0, startIdx) + newApi + content.substring(endIdx);
fs.writeFileSync('backend/server.js', content, 'utf8');
console.log('Workforce insights patched successfully');
