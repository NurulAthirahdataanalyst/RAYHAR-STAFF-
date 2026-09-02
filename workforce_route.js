
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
    const [empRows] = await pool.query(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active FROM profiles p WHERE DATE(p.created_at) <= ?::date ${profileFilter}`, [targetDateStr, ...pFilterParams]);
    const totalHeadcount = parseInt(empRows[0].total || 0);
    const activeEmployees = parseInt(empRows[0].active || 0);

    // Fetch active company leaves
    const [companyLeaveRows] = await pool.query(
      `SELECT * FROM company_leave_calendar WHERE status = 'Active' AND start_date <= ? AND end_date >= ?`,
      [targetDateStr, targetDateStr]
    );

    // Calculate company leave exactly
    let companyLeaveCount = 0;
    const [allProfiles] = await pool.query(
      `SELECT * FROM profiles p WHERE p.status = 'Active' ${profileFilter}`, pFilterParams
    );
    
    let isCompanyLeaveDay = false;
    let companyLeaveEmployees = new Set();
    allProfiles.forEach(emp => {
      let onCL = false;
      for (let cl of companyLeaveRows) {
        if (cl.applies_to === 'All' || cl.applies_to === 'all') onCL = true;
        else if ((cl.applies_to === 'Specific Branch' || cl.applies_to === 'branch') && cl.branch_id && cl.branch_id.split(',').includes(emp.branch)) onCL = true;
        else if ((cl.applies_to === 'Specific Department' || cl.applies_to === 'department') && cl.department_id && cl.department_id.split(',').includes(emp.department)) onCL = true;
      }
      if (onCL) {
        companyLeaveCount++;
        companyLeaveEmployees.add(emp.user_id);
      }
    });

    if (companyLeaveCount > 0 && companyLeaveCount === activeEmployees) {
      isCompanyLeaveDay = true;
    }

    const outstationParams = [targetDateStr, ...pFilterParams];
    const [outstationTodayRows] = await pool.query(
      `SELECT DISTINCT o.user_id
       FROM outstation_assignments o
       JOIN profiles p ON p.user_id = o.user_id
       WHERE o.status != 'Cancelled'
       AND ?::date BETWEEN (o.start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (o.end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date
       ${profileFilter}`,
      outstationParams
    );
    const outstationTodayCount = outstationTodayRows.length;
    const outstationEmployees = new Set(outstationTodayRows.map(r => r.user_id));
// 3. Leave Stats
    const [leaveRows] = await pool.query(
      `SELECT lr.user_id, lr.status, lr.start_date, lr.end_date, p.full_name as name
       FROM leave_requests lr
       JOIN profiles p ON p.user_id = lr.user_id
       WHERE EXTRACT(MONTH FROM lr.start_date) = ? AND EXTRACT(YEAR FROM lr.start_date) = ? AND p.status = 'Active' ${profileFilter}`,
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

    

    // 2. Attendance & Lates
    const [attRows] = await pool.query(
      `SELECT 
        a.user_id, p.full_name as name, p.branch, p.department, a.clock_in, a.clock_out,
        CASE WHEN (a.clock_in AT TIME ZONE 'Asia/Kuala_Lumpur')::time > ?::time THEN 1 ELSE 0 END as is_late
       FROM attendances a
       JOIN profiles p ON p.user_id = a.user_id
       WHERE EXTRACT(MONTH FROM a.clock_in) = ? AND EXTRACT(YEAR FROM a.clock_in) = ? AND p.status = 'Active' ${profileFilter}`,
      [lateTimeStr, requestedMonth, requestedYear, ...pFilterParams]
    );

    let totalLateArrivals = 0;
    let presentToday = 0;
    let lateToday = 0;
    
    const userStats = {};

    const onLeaveEmployees = new Set();
    leaveRows.forEach(lr => {
      const startObj = new Date(lr.start_date);
      const endObj = new Date(lr.end_date);
      const start = new Date(startObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
      const end = new Date(endObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
      if (targetDateStr >= start && targetDateStr <= end && lr.status === 'Approved') {
        onLeaveEmployees.add(lr.user_id);
      }
    });

    attRows.forEach(att => {
      const isLate = parseInt(att.is_late) === 1;
      const dateObj = new Date(att.clock_in);
      const dateStr = new Date(dateObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
      const isOutstation = outstationEmployees.has(att.user_id);
      const isOnLeave = onLeaveEmployees.has(att.user_id);
      
      // Explicitly ignore users who are Outstation or On Leave from Present/Late counts for today
      if (dateStr === targetDateStr) {
        if (!isOutstation && !isOnLeave) {
          presentToday++;
          if (isLate) lateToday++;
        }
      }

      if (isLate && !isOutstation && !isOnLeave) totalLateArrivals++;

      if (!userStats[att.user_id]) {
        userStats[att.user_id] = { name: att.name, department: att.department, branch: att.branch, presentDays: 0, lateDays: 0, missingPunches: 0, lastMissingPunch: null };
      }
      
      if (!isOutstation && !isOnLeave) {
        userStats[att.user_id].presentDays++;
        if (isLate) userStats[att.user_id].lateDays++;
        
        // Missing Punch Check ignores users on leave/outstation
        if (!att.clock_out && dateStr < targetDateStr) {
          userStats[att.user_id].missingPunches++;
          if (!userStats[att.user_id].lastMissingPunch || dateStr > userStats[att.user_id].lastMissingPunch) {
            userStats[att.user_id].lastMissingPunch = dateStr;
          }
        }
      }
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

    // 4. Team Availability today
    let absentToday = Math.max(0, activeEmployees - presentToday - onLeaveToday - companyLeaveCount - outstationTodayCount);

    // 5. Rankings
    const rankings = Object.values(userStats).map(u => ({
      name: u.name,
      attendanceRate: Math.min(100, Math.round((u.presentDays / workingDaysInMonth) * 100)),
      lateCount: u.lateDays
    }));

    const topAttendance = [...rankings].sort((a, b) => b.attendanceRate - a.attendanceRate).slice(0, 5);
    const topLate = [...rankings].sort((a, b) => b.lateCount - a.lateCount).filter(u => u.lateCount > 0).slice(0, 5);

    // 6. Trends (Real Data)
    const [trendRows] = await pool.query(
      `SELECT EXTRACT(MONTH FROM clock_in) as m, EXTRACT(YEAR FROM clock_in) as y, COUNT(*) as total_att
       FROM attendances
       WHERE clock_in >= (DATE_TRUNC('month', ?::date) - INTERVAL '5 months')
       GROUP BY y, m
       ORDER BY y, m`,
       [targetDateStr]
    );
    
    const realMonthlyTrend = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(requestedYear, requestedMonth - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const lastDayOfMonth = new Date(y, m, 0);
      let historicalCount = 0;
      allProfiles.forEach(p => {
        const pCreated = new Date(p.created_at);
        pCreated.setHours(0,0,0,0);
        if (pCreated <= lastDayOfMonth) historicalCount++;
      });
      const row = trendRows.find(r => parseInt(r.m) === m && parseInt(r.y) === y);
      const atts = row ? parseInt(row.total_att) : 0;
      const possible = historicalCount > 0 ? historicalCount * 22 : 22;
      const rate = possible > 0 ? Math.round((atts / possible) * 100) : 0;
      realMonthlyTrend.push({
        month: monthNames[m - 1],
        rate: Math.min(100, Math.max(0, rate))
      });
    }
    
    const dailyMap = {};
    attRows.forEach(att => {
      const dateObj = new Date(att.clock_in);
      const dateStr = new Date(dateObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
      const d = dateStr.slice(8, 10); 
      if (!dailyMap[d]) dailyMap[d] = { rate: 0, lates: 0, count: 0, dateStr: dateStr };
      dailyMap[d].count++;
      if (parseInt(att.is_late) === 1) dailyMap[d].lates++;
    });
    
    const dailyTrend = Object.keys(dailyMap).sort().map(d => {
      const dIter = new Date(dailyMap[d].dateStr);
      let historicalCount = 0;
      allProfiles.forEach(p => {
        const pCreated = new Date(p.created_at);
        pCreated.setHours(0,0,0,0);
        if (pCreated <= dIter) historicalCount++;
      });
      return {
        date: d,
        rate: historicalCount > 0 ? Math.round((dailyMap[d].count / historicalCount) * 100) : 0,
        lates: dailyMap[d].lates
      };
    }).slice(-10);

    // Build Weekly Attendance Trend (CURRENT WEEK ONLY)
    const weeklyMap = {
      'Mon': { present: 0, late: 0, leave: 0, expected: 0 },
      'Tue': { present: 0, late: 0, leave: 0, expected: 0 },
      'Wed': { present: 0, late: 0, leave: 0, expected: 0 },
      'Thu': { present: 0, late: 0, leave: 0, expected: 0 },
      'Fri': { present: 0, late: 0, leave: 0, expected: 0 },
      'Sat': { present: 0, late: 0, leave: 0, expected: 0 },
      'Sun': { present: 0, late: 0, leave: 0, expected: 0 },
    };
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Find Saturday of the target date's week
    const targetD = req.query.weekStartDate ? new Date(req.query.weekStartDate) : new Date(targetDateStr);
    const dayOfWeek = targetD.getDay();
    const diffToSat = dayOfWeek === 6 ? 0 : -1 - dayOfWeek;
    const weekStartD = new Date(targetD);
    weekStartD.setDate(targetD.getDate() + diffToSat);
    weekStartD.setHours(0,0,0,0);

    const weekEndD = new Date(weekStartD);
    weekEndD.setDate(weekStartD.getDate() + 6);
    weekEndD.setHours(23,59,59,999);
    
    // Sum expected attendances per weekday up to the target date (within current week)
    const branchZoneMapW = await getBranchZoneMap();
    const dIter = new Date(weekStartD);
    const dEnd = new Date(targetDateStr);
    dEnd.setHours(23,59,59,999);
    while (dIter <= weekEndD) {
      const dayOfWeekNum = dIter.getDay();
      const dayName = dayNames[dayOfWeekNum];
      
      let expectedForDay = 0;
      let totalEmployeesForDay = 0;
      allProfiles.forEach(p => {
        const pCreated = new Date(p.created_at);
        pCreated.setHours(0,0,0,0);
        if (pCreated <= dIter) {
          totalEmployeesForDay++;
          const userZone = branchZoneMapW.get(p.branch) || 'ZONE_B';
          const isFirstSaturday = dayOfWeekNum === 6 && dIter.getDate() <= 7;
          const isRest = (userZone === 'ZONE_A' && (dayOfWeekNum === 5 || isFirstSaturday)) || 
                         (userZone === 'ZONE_B' && (dayOfWeekNum === 0 || isFirstSaturday));
          if (!isRest) {
            expectedForDay++;
          }
        }
      });
      weeklyMap[dayName].expected = expectedForDay;
      weeklyMap[dayName].totalEmployees = totalEmployeesForDay;
      weeklyMap[dayName].isFuture = dIter > dEnd;
      dIter.setDate(dIter.getDate() + 1);
    }

    // Add Present and Late from attRows (ONLY for current week)
    attRows.forEach(att => {
      const dateObj = new Date(att.clock_in);
      const isOutstation = outstationEmployees.has(att.user_id);
      
      // Check if user is on leave on this specific date
      const dateStr = new Date(dateObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
      const isOnLeave = leaveRows.some(lr => {
        if (lr.status !== 'Approved') return false;
        const s = new Date(new Date(lr.start_date).getTime() + 8*3600*1000).toISOString().split('T')[0];
        const e = new Date(new Date(lr.end_date).getTime() + 8*3600*1000).toISOString().split('T')[0];
        return dateStr >= s && dateStr <= e && lr.user_id === att.user_id;
      });

      if (dateObj >= weekStartD && dateObj <= weekEndD) {
        if (!isOutstation && !isOnLeave) {
          const dayName = dayNames[dateObj.getDay()];
          if (parseInt(att.is_late) === 1) {
            weeklyMap[dayName].late++;   // Present (Late) only
          } else {
            weeklyMap[dayName].present++; // Present (On Time) only
          }
        }
      }
    });

    // Add Leave from leaveRows (actual calculation for the week)
    leaveRows.forEach(lr => {
      if (lr.status === 'Approved') {
        const startObj = new Date(lr.start_date);
        const endObj = new Date(lr.end_date);
        
        // Loop over the days of the leave, and if it falls in the current week up to today, count it
        let dIter = new Date(startObj);
        dIter.setHours(0,0,0,0);
        const lEnd = new Date(endObj);
        lEnd.setHours(23,59,59,999);
        
        while (dIter <= lEnd) {
          if (dIter >= weekStartD && dIter <= weekEndD) {
            const dayName = dayNames[dIter.getDay()];
            weeklyMap[dayName].leave++;
          }
          dIter.setDate(dIter.getDate() + 1);
        }
      }
    });

    // Add Outstation to weekly map
    const [weekOutstationRows] = await pool.query(
      `SELECT user_id, start_date, end_date FROM outstation_assignments WHERE status != 'Cancelled'`
    );
    weekOutstationRows.forEach(o => {
       const startObj = new Date(o.start_date); startObj.setHours(0,0,0,0);
       const endObj = new Date(o.end_date); endObj.setHours(23,59,59,999);
       let dIter = new Date(startObj);
       while (dIter <= endObj) {
         if (dIter >= weekStartD && dIter <= weekEndD) {
           const dayName = dayNames[dIter.getDay()];
           weeklyMap[dayName].outstation = (weeklyMap[dayName].outstation || 0) + 1;
         }
         dIter.setDate(dIter.getDate() + 1);
       }
    });

    const weeklyOrder = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const weeklyAttendanceTrend = weeklyOrder.map(day => {
      const data = weeklyMap[day];
      const outstation = data.outstation || 0;
      const absent = data.isFuture ? 0 : Math.max(0, data.expected - data.present - data.late - data.leave - outstation);
      return {
        name: day,
        present: data.present,
        late: data.late,
        absent: absent,
        leave: data.leave,
        weekend: Math.max(0, data.totalEmployees - data.expected)
      };
    });


    // 7. Employees by Department
    const [deptRows] = await pool.query(
      `SELECT p.department, COUNT(*) as count 
       FROM profiles p 
       WHERE p.status = 'Active' AND DATE(p.created_at) <= ?::date AND p.department IS NOT NULL AND p.department != '' ${profileFilter}
       GROUP BY p.department`,
      [targetDateStr, ...pFilterParams]
    );

    // 8. Employees by Branch
    const [branchRows] = await pool.query(
      `SELECT p.branch, b.operating_zone, COUNT(*) as count 
       FROM profiles p 
       LEFT JOIN branches b ON p.branch = b.name
       WHERE p.status = 'Active' AND DATE(p.created_at) <= ?::date AND p.branch IS NOT NULL AND p.branch != '' ${profileFilter}
       GROUP BY p.branch, b.operating_zone`,
      [targetDateStr, ...pFilterParams]
    );

    const branchStats = {};
    branchRows.forEach(r => {
      branchStats[r.branch] = { total: parseInt(r.count), onTime: 0, late: 0, onLeave: 0, compLeave: 0, absent: 0, outstation: 0, operating_zone: r.operating_zone };
    });

    const departmentStats = {};
    deptRows.forEach(r => {
      departmentStats[r.department] = { total: parseInt(r.count), onTime: 0, late: 0, onLeave: 0, compLeave: 0, absent: 0, outstation: 0 };
    });

    // 1. Process Attendances (Monthly computation)
    const branchMonthlyAttendance = {};
    const departmentMonthlyAttendance = {};
    attRows.forEach(a => {
      const b = a.branch || 'HQ';
      const d = a.department || 'Unassigned';
      if (!branchMonthlyAttendance[b]) branchMonthlyAttendance[b] = 0;
      if (!departmentMonthlyAttendance[d]) departmentMonthlyAttendance[d] = 0;
      branchMonthlyAttendance[b]++;
      departmentMonthlyAttendance[d]++;
    });

    // 2. Process Outstation (Need the data for priority logic)
    const [outstationRows] = await pool.query(
      `SELECT p.branch, o.user_id 
       FROM outstation_assignments o
       JOIN profiles p ON p.user_id = o.user_id
       WHERE o.status != 'Cancelled' AND ?::date BETWEEN DATE(o.start_date) AND DATE(o.end_date)`,
      [targetDateStr]
    );

    const loopBranchZoneMap = await getBranchZoneMap();
    // 3. Day View computation (Single Pass via Priority)
    allProfiles.forEach(p => {
      const b = p.branch;
      if (b && branchStats[b]) {
         const isOnLeave = leaveRows.some(lr => lr.user_id === p.user_id && lr.status === 'Approved' && targetDateStr >= new Date(new Date(lr.start_date).getTime() + 8*3600*1000).toISOString().split('T')[0] && targetDateStr <= new Date(new Date(lr.end_date).getTime() + 8*3600*1000).toISOString().split('T')[0]);
         const isCompanyLeave = companyLeaveEmployees.has(p.user_id);
         
         const att = attRows.find(a => a.user_id === p.user_id && new Date(new Date(a.clock_in).getTime() + 8*3600*1000).toISOString().split('T')[0] === targetDateStr);
         const isPresent = !!att;
         const isLate = isPresent && parseInt(att.is_late) === 1;

         // Fetch outstation for this specific user
         const isOutstation = outstationRows.some(o => o.user_id === p.user_id);
         
         const userZone = loopBranchZoneMap.get(p.branch) || 'ZONE_B';
         const isWeekend = checkIsWeekend(userZone, new Date(targetDateStr));
         const matchingHoliday = malaysiaHolidays.find(h => h.date === targetDateStr);

         // Priority logic:
         if (isOnLeave) {
            branchStats[b].onLeave++;
         } else if (isCompanyLeave) {
            branchStats[b].compLeave++;
         } else if (isOutstation) {
            branchStats[b].outstation++;
         } else if (isPresent) {
            if (isLate) branchStats[b].late++;
            else branchStats[b].onTime++;
         } else if (!isWeekend && !matchingHoliday) {
            branchStats[b].absent++;
         }
      }
      const d = p.department;
      if (d && departmentStats[d]) {
         const isOnLeave = leaveRows.some(lr => lr.user_id === p.user_id && lr.status === 'Approved' && targetDateStr >= new Date(new Date(lr.start_date).getTime() + 8*3600*1000).toISOString().split('T')[0] && targetDateStr <= new Date(new Date(lr.end_date).getTime() + 8*3600*1000).toISOString().split('T')[0]);
         const isCompanyLeave = companyLeaveEmployees.has(p.user_id);
         const att = attRows.find(a => a.user_id === p.user_id && new Date(new Date(a.clock_in).getTime() + 8*3600*1000).toISOString().split('T')[0] === targetDateStr);
         const isPresent = !!att;
         const isLate = isPresent && parseInt(att.is_late) === 1;
         const isOutstation = outstationRows.some(o => o.user_id === p.user_id);
         const userZone = loopBranchZoneMap.get(p.branch) || 'ZONE_B';
         const isWeekend = checkIsWeekend(userZone, new Date(targetDateStr));
         const matchingHoliday = malaysiaHolidays.find(h => h.date === targetDateStr);

         if (isOnLeave) departmentStats[d].onLeave++;
         else if (isCompanyLeave) departmentStats[d].compLeave++;
         else if (isOutstation) departmentStats[d].outstation++;
         else if (isPresent) {
            if (isLate) departmentStats[d].late++;
            else departmentStats[d].onTime++;
         } else if (!isWeekend && !matchingHoliday) {
            departmentStats[d].absent++;
         }
      }
    });

    const [realLeaveAnalyticsRows] = await pool.query(
      `SELECT lr.leave_type, COUNT(*) as count 
       FROM leave_requests lr
       JOIN profiles p ON p.user_id = lr.user_id
       WHERE lr.status = 'Approved'
       ${profileFilter}
       GROUP BY lr.leave_type`,
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

    const [attentionRows] = await pool.query(
      `SELECT
         p.user_id as id,
         p.full_name as name,
         CASE WHEN p.department = 'General' THEN 'Employee' ELSE 'Executive' END as role,
         p.department as dept,
         p.branch,
         COALESCE(lr.annual_days_used, 0) as taken,
         CAST(COALESCE(p.annual_leave_entitlement, '14') AS NUMERIC) + CAST(COALESCE(adj.total_adjustment, 0) AS NUMERIC) as total
       FROM profiles p
       LEFT JOIN (
         SELECT employee_id, SUM(adjustment_days) as total_adjustment 
         FROM leave_balance_adjustments 
         WHERE UPPER(leave_type) IN ('ANNUAL LEAVE', 'ANNUAL & EMERGENCY LEAVE', 'ANNUAL/EMERGENCY LEAVE', 'CUTI TAHUNAN') 
         GROUP BY employee_id
       ) adj ON adj.employee_id = p.user_id
       LEFT JOIN (
         SELECT user_id, 
                SUM(CASE WHEN leave_type IN ('Annual Leave', 'Annual & Emergency Leave', 'Annual/Emergency Leave', 'Cuti Tahunan') AND status = 'Approved' THEN days ELSE 0 END) as annual_days_used
         FROM leave_requests
         WHERE leave_type IN ('Annual Leave', 'Annual & Emergency Leave', 'Annual/Emergency Leave', 'Cuti Tahunan')
         GROUP BY user_id
       ) lr ON lr.user_id = p.user_id
       WHERE p.status = 'Active' ${profileFilter}
       ORDER BY taken DESC
       LIMIT 5`,
      pFilterParams
    );
    const attentionEmployees = attentionRows.map(r => ({
      id: r.id,
      name: r.name,
      role: r.role,
      dept: r.dept || 'General',
      branch: r.branch || 'HQ',
      taken: parseInt(r.taken) || 0,
      total: parseInt(r.total) || 14
    }));

    // Missing Punches Logic
    const missingPunchEmployees = Object.values(userStats)
      .filter(u => u.missingPunches >= 2)
      .map(u => ({
        name: u.name,
        department: u.department || 'General',
        branch: u.branch || 'HQ',
        missingPunches: u.missingPunches,
        lastOccurrence: u.lastMissingPunch
      }))
      .sort((a, b) => b.missingPunches - a.missingPunches);

    // Get previous month missing punches for trend indicator
    const prevMonthDate = new Date(requestedYear, requestedMonth - 2, 1);
    const prevMonthStr = prevMonthDate.getMonth() + 1;
    const prevYearStr = prevMonthDate.getFullYear();
    const [prevAttRows] = await pool.query(
      `SELECT a.user_id, a.clock_in 
       FROM attendances a
       JOIN profiles p ON p.user_id = a.user_id
       WHERE EXTRACT(MONTH FROM a.clock_in) = ? AND EXTRACT(YEAR FROM a.clock_in) = ? 
         AND a.clock_out IS NULL 
         AND p.status = 'Active' ${profileFilter}`,
      [prevMonthStr, prevYearStr, ...pFilterParams]
    );

    const prevMissingStats = {};
    prevAttRows.forEach(a => {
      const dateStr = new Date(new Date(a.clock_in).getTime() + 8*3600*1000).toISOString().split('T')[0];
      if (dateStr < targetDateStr) {
        prevMissingStats[a.user_id] = (prevMissingStats[a.user_id] || 0) + 1;
      }
    });
    
    const prevMissingCount = Object.values(prevMissingStats).filter(c => c >= 2).length;
    const currMissingCount = missingPunchEmployees.length;
    const diffMissing = currMissingCount - prevMissingCount;
    const missingPunchIndicator = diffMissing > 0 
      ? `↑ ${diffMissing} employees compared to last month`
      : diffMissing < 0 
      ? `↓ ${Math.abs(diffMissing)} employees compared to last month`
      : `Same as last month`;

    const branchZoneMap = await getBranchZoneMap();
    const dateObj = new Date(targetDateStr);
    
    let finalAbsentList = [];
    allProfiles.forEach(p => {
       const isOnLeave = leaveRows.some(lr => lr.user_id === p.user_id && lr.status === 'Approved' && targetDateStr >= new Date(new Date(lr.start_date).getTime() + 8*3600*1000).toISOString().split('T')[0] && targetDateStr <= new Date(new Date(lr.end_date).getTime() + 8*3600*1000).toISOString().split('T')[0]);
       const isCompanyLeave = companyLeaveEmployees.has(p.user_id);
       const isOutstation = outstationRows.some(o => o.user_id === p.user_id);
       
       const att = attRows.find(a => a.user_id === p.user_id && new Date(new Date(a.clock_in).getTime() + 8*3600*1000).toISOString().split('T')[0] === targetDateStr);
       const isPresent = !!att;

       const userZone = branchZoneMap.get(p.branch) || 'ZONE_B';
       const isWeekend = checkIsWeekend(userZone, dateObj);
       const matchingHoliday = malaysiaHolidays.find(h => h.date === targetDateStr);

       if (isOnLeave) {
          finalAbsentList.push({ user_id: p.user_id, full_name: p.full_name, initials: p.full_name.split(' ').map(n=>n[0]).join('').substring(0,2), department: p.department || '—', branch: p.branch || '—', status: 'onLeave' });
       } else if (isCompanyLeave) {
          finalAbsentList.push({ user_id: p.user_id, full_name: p.full_name, initials: p.full_name.split(' ').map(n=>n[0]).join('').substring(0,2), department: p.department || '—', branch: p.branch || '—', status: 'companyLeave' });
       } else if (isOutstation) {
          finalAbsentList.push({ user_id: p.user_id, full_name: p.full_name, initials: p.full_name.split(' ').map(n=>n[0]).join('').substring(0,2), department: p.department || '—', branch: p.branch || '—', status: 'outstation' });
       } else if (!isPresent && !isWeekend && !matchingHoliday) {
          finalAbsentList.push({ user_id: p.user_id, full_name: p.full_name, initials: p.full_name.split(' ').map(n=>n[0]).join('').substring(0,2), department: p.department || '—', branch: p.branch || '—', status: 'absent' });
       }
    });

    if (isDayView) {
      let aggPresent = 0;
      let aggLate = 0;
      let aggOnLeave = 0;
      let aggCompLeave = 0;
      let aggAbsent = 0;
      let aggOutstation = 0;

      Object.values(branchStats).forEach(s => {
        aggPresent += (s.onTime + s.late);
        aggLate += s.late;
        aggOnLeave += s.onLeave;
        aggCompLeave += s.compLeave;
        aggAbsent += s.absent;
        aggOutstation += s.outstation;
      });

      presentToday = aggPresent;
      lateToday = aggLate;
      onLeaveToday = aggOnLeave;
      companyLeaveCount = aggCompLeave;
      absentToday = aggAbsent;
      // We do not override outstationTodayCount globally unless we want to, but let's override it for consistency:
      // Note: outstationTodayCount in topKpi uses the local variable `outstationTodayCount`
    }

    const dynamicMetrics = await computeDynamicWorkforceMetrics(targetDateStr, role, branch, department);

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
        return dateStr === targetDateStr && parseInt(a.is_late) === 1 && !outstationRows.some(o => o.user_id === a.user_id);
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

    // Calculate missingPunchYesterday
    const [missingPunchYesterdayRows] = await pool.query(
      `SELECT COUNT(DISTINCT a.user_id) as cnt
       FROM attendances a
       JOIN profiles p ON p.user_id = a.user_id
       WHERE (a.clock_in AT TIME ZONE 'Asia/Kuala_Lumpur')::date = ?::date - INTERVAL '1 day'
         AND a.clock_out IS NULL
         AND p.status = 'Active' ${profileFilter}
         AND NOT EXISTS (
           SELECT 1 FROM leave_requests lr 
           WHERE lr.user_id = a.user_id 
           AND lr.status = 'Approved' 
           AND (?::date - INTERVAL '1 day') BETWEEN lr.start_date AND lr.end_date
         )`,
      [targetDateStr, ...pFilterParams, targetDateStr]
    );
    const missingPunchYesterday = parseInt(missingPunchYesterdayRows[0]?.cnt || 0);

    const monthlyTrend = [
      { month: 'Jan', rate: 85 },
      { month: 'Feb', rate: 88 },
      { month: 'Mar', rate: 92 },
      { month: 'Apr', rate: 90 },
      { month: 'May', rate: 95 },
      { month: 'Jun', rate: 97 }
    ];

    res.json({
      success: true,
      departmentMetrics: deptRows.map(r => {
        const dName = r.department;
        const s = departmentStats[dName] || { total: parseInt(r.count) };
        const total = s.total;
        let rate = 0;
        if (isDayView) {
          rate = total > 0 ? Math.round(((s.onTime + s.late + s.outstation) / total) * 100) : 0;
        } else {
          const monthlyPresent = departmentMonthlyAttendance[dName] || 0;
          const possibleAttendances = total * workingDaysInMonth;
          rate = possibleAttendances > 0 ? Math.round((monthlyPresent / possibleAttendances) * 100) : 0;
        }
        return { name: dName, value: total, count: total, attendanceRate: rate, ...s };
      }),
      monthlyComparison: dynamicMetrics.monthlyComparison,
      branchMetrics: Object.keys(branchStats).map(b => {
        const s = branchStats[b];
        const total = s.total;
        let rate = 0;
        if (isDayView) {
          rate = total > 0 ? Math.round(((s.onTime + s.late + s.outstation) / total) * 100) : 0;
        } else {
          const monthlyPresent = branchMonthlyAttendance[b] || 0;
          const possibleBranchAttendances = total * workingDaysInMonth;
          rate = possibleBranchAttendances > 0 
            ? Math.round((monthlyPresent / possibleBranchAttendances) * 100) 
            : 0;
        }
        return {
          name: b, 
          count: total, 
          attendanceRate: Math.min(100, rate),
          stats: s
        }
      }),
      leaveAnalytics: realLeaveAnalytics,
      outstationAnalytics: dynamicMetrics.outstationAnalytics,
      workforceMovement: {
        newJoiners: 4,
        resigned: 2,
        transferred: 3,
        promotions: 1
      },
      hrAlerts: dynamicMetrics.hrAlerts,
      topKpi: {
        totalHeadcount,
        activeEmployees,
        attendanceRate: Math.min(100, averageAttendance),
        onLeaveToday,
        companyLeaveToday: companyLeaveCount,
        outstationToday: outstationTodayCount,
        missingPunchYesterday
      },
      attendanceOverview: {
        averageAttendance: Math.min(100, averageAttendance),
        lateArrivals: totalLateArrivals,
        absences,
        monthlyTrend,
        dailyTrend,
        weeklyAttendanceTrend,
        branchZone: branchRows.length > 0 ? (branchRows.find(b => b.branch === branch)?.operating_zone || 'ZONE_B') : 'ZONE_B'
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
        allAttendance: rankings,
        attentionEmployees,
        missingPunchEmployees,
        missingPunchIndicator
      },
      sseInitialPayload
    });
  } catch (err) {
    console.error("workforce-insights error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/outstation/log-location", async (req, res) => {
  try {
    const { employee_id, attendance_id, latitude, longitude, accuracy } = req.body;
    await pool.query(
        `INSERT INTO employee_location_logs (employee_id, attendance_id, latitude, longitude, accuracy, location_type, ip_address) VALUES (?, ?, ?, ?, ?, 'UPDATE', ?)`,
        [employee_id, attendance_id || null, latitude, longitude, accuracy, req.ip || req.connection.remoteAddress]
    );
    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/outstation/today", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.attendance_id, a.user_id, p.full_name, p.department, a.clock_in, a.clock_out, a.attendance_type
      FROM attendances a
      JOIN profiles p ON p.user_id = a.user_id
      WHERE DATE(a.clock_in) = CURRENT_DATE AND a.attendance_type = 'OUTSTATION'
    `);
    
    // Postgres specific: getting latest row per employee_id
    const [logs] = await pool.query(`
      SELECT DISTINCT ON (employee_id) employee_id, latitude, longitude, accuracy, recorded_at, location_type
      FROM employee_location_logs
      WHERE DATE(recorded_at) = CURRENT_DATE
      ORDER BY employee_id, recorded_at DESC
    `);
    
    res.json({ success: true, attendances: rows, latest_locations: logs });
  } catch(e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/outstation/history/:user_id", async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT * FROM employee_location_logs
      WHERE employee_id = ? AND DATE(recorded_at) = CURRENT_DATE
      ORDER BY recorded_at ASC
    `, [req.params.user_id]);
    res.json({ success: true, history: logs });
  } catch(e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.put("/api/branches/:code", async (req, res) => {
  try {
    const { name, location, latitude, longitude, radius, zone, operating_zone } = req.body;
    await pool.query(
      `UPDATE branches SET name = ?, location = ?, latitude = ?, longitude = ?, radius = ?, operating_zone = ? WHERE code = ?`,
      [name, location, latitude || null, longitude || null, radius || 50, zone || operating_zone || 'ZONE_B', req.params.code]
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/branches", async (req, res) => {
  try {
    const queryStr = `
      SELECT 
        b.code, 
        b.name,
        b.location,
        b.latitude,
        b.longitude,
        b.radius,
        b.operating_zone,
        (
          SELECT p.full_name 
          FROM profiles p
          JOIN user_role ur ON p.user_id = ur.user_id
          WHERE p.status = 'Active' AND (
            (b.code = 'HQ' AND ur.role = 'managing_director') 
            OR (b.code != 'HQ' AND p.branch = b.code AND ur.role = 'branch_leader') 
          )
          LIMIT 1
        ) AS leader_name
      FROM branches b 
      ORDER BY 
        CASE WHEN b.code = 'HQ' THEN 0 ELSE 1 END,
        b.name ASC
    `;
    let [rows] = await pool.query(queryStr);
    
    if (rows.length === 0) {
      const fallbackBranches = [
        { code: "HQ", name: "Rayhar HQ", location: "Kemaman,Terengganu" },
        { code: "KMM", name: "Kemaman", location: "Kemaman,Terengganu" },
        { code: "CNH", name: "Cheneh", location: "Kemaman,Terengganu" },
        { code: "KBG", name: "Kuala Berang", location: "Hulu Terengganu,Terengganu" },
        { code: "TGG", name: "Kuala Terengganu", location: "Kuala Terengganu,Terengganu" },
        { code: "DGN", name: "Dungun", location: "Dungun,Terengganu" },
        { code: "JTH", name: "Jertih", location: "Besut,Terengganu" },
        { code: "KBR", name: "Kota Bharu", location: "Kota Bharu,Kelantan" },
        { code: "RMP", name: "Rompin", location: "Rompin,Pahang" },
        { code: "MZM", name: "Muadzam Shah", location: "Muadzam Shah,Pahang" },
        { code: "SHA", name: "Shah Alam", location: "Shah Alam,Selangor" },
        { code: "BBB", name: "Bandar Baru Bangi", location: "Bandar Baru Bangi,Selangor" },
        { code: "KUL", name: "Kuala Lumpur", location: "Kuala Lumpur,Wilayah Persekutuan" },
        { code: "IPH", name: "Ipoh", location: "Ipoh,Perak" },
        { code: "MJG", name: "Manjung", location: "Manjung,Perak" },
        { code: "KKS", name: "Kuala Kangsar", location: "Kuala Kangsar,Perak" },
        { code: "MLK", name: "Melaka", location: "Melaka,Melaka" },
        { code: "AOR", name: "Alor Setar", location: "Alor Setar,Kedah" },
        { code: "BTM", name: "Bertam", location: "Bertam,Pulau Pinang" },
        { code: "SNS", name: "Seremban", location: "Seremban,Negeri Sembilan" },
        { code: "BTP", name: "Batu Pahat", location: "Batu Pahat,Johor" },
        { code: "JB", name: "Johor Bharu", location: "Johor Bharu,Johor" },
        { code: "TWU", name: "Tawau", location: "Tawau,Sabah" }
      ];

      for (const b of fallbackBranches) {
        await pool.query(
          "INSERT INTO branches (branch, code, name, location) VALUES (?, ?, ?, ?)",
          [b.code, b.code, b.name, b.location]
        );
      }
      
      const [reFetch] = await pool.query(queryStr);
      rows = reFetch;
    }

    res.json({
      success: true,
      branches: rows
    });

  } catch (err) {
    console.error("Error fetching branches:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.post("/api/branches", async (req, res) => {
  const { code, name, location, operating_zone, operatorName, operatorRole } = req.body;

  if (!code || !name) {
    return res.status(400).json({ success: false, error: "Code and name are required" });
  }

  try {
    const cleanCode = code.trim().toUpperCase();
    const [existing] = await pool.query("SELECT code FROM branches WHERE code = ?", [cleanCode]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: "Branch code already exists" });
    }

    const branchLocation = location ? location.trim() : 'RAYHAR BRANCH';
    const zone = operating_zone || 'ZONE_B';

    await pool.query(
      "INSERT INTO branches (branch, code, name, location, operating_zone) VALUES (?, ?, ?, ?, ?)",
      [cleanCode, cleanCode, name.trim(), branchLocation, zone]
    );

    // Broadcast branch registration event via SSE
    broadcastPresenceUpdate({
      type: "config-change",
      timestamp: new Date().toISOString(),
      operatorName: operatorName || "System",
      operatorRole: operatorRole || "admin",
      action: `Registered new branch: ${name.trim()} (${cleanCode})`
    });

    res.json({ success: true, message: "Branch created successfully" });
  } catch (err) {
    console.error("Error creating branch:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/branches/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Note: The param name is code
    await pool.query("DELETE FROM branches WHERE code = ?", [id]);
    res.json({ success: true, message: "Branch deleted successfully" });
  } catch (err) {
    console.error("Error deleting branch:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// GET BRANCHES STATS API
// ===============================
app.get("/api/branches-stats", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        b.code AS branch,
        COUNT(DISTINCT p.user_id) AS total_employees,
        COUNT(DISTINCT CASE WHEN att.user_id IS NOT NULL AND oa.id IS NULL AND lr.leave_id IS NULL THEN att.user_id END) AS present_today,
        COUNT(DISTINCT lr.leave_id) AS on_leave,
        COUNT(DISTINCT oa.id) AS outstation
      FROM branches b
      LEFT JOIN profiles p 
        ON p.branch = b.code AND p.status = 'Active'
      LEFT JOIN attendances att 
        ON att.user_id = p.user_id 
        AND DATE(att.clock_in) = CURRENT_DATE
      LEFT JOIN leave_requests lr
        ON lr.user_id = p.user_id
        AND lr.status = 'Approved'
        AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
      LEFT JOIN outstation_assignments oa
        ON oa.user_id = p.user_id
        AND oa.status != 'Cancelled'
        AND CURRENT_DATE BETWEEN oa.start_date AND oa.end_date
      GROUP BY b.code
    `);
    res.json({ success: true, stats: rows });
  } catch (err) {
    console.error("Error fetching branches stats:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// DEPARTMENTS API (HQ Departments)
// ===============================
app.get("/api/departments", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM departments ORDER BY id ASC");
    res.json({ success: true, departments: rows });
  } catch (error) {
    console.error("Fetch departments error:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

app.post("/api/departments", async (req, res) => {
  const { code, name, operatorName, operatorRole } = req.body;
  
  if (!code || !name) {
    return res.status(400).json({ success: false, error: "Code and name are required" });
  }

  try {
    const [existing] = await pool.query(
      "SELECT * FROM departments WHERE code = ? OR name = ?", 
      [code.toUpperCase(), name]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: "Department with this code or name already exists" });
    }

    // Broadcast department registration event via SSE
    broadcastPresenceUpdate({
      type: "config-change",
      timestamp: new Date().toISOString(),
      operatorName: operatorName || "System",
      operatorRole: operatorRole || "admin",
      action: `Created department: ${name.trim()} (${code.toUpperCase()})`
    });

    res.json({ success: true, message: "Department registered successfully" });
  } catch (error) {
    console.error("Register department error:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

app.delete("/api/departments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM departments WHERE name = ?", [id]);
    res.json({ success: true, message: "Department deleted successfully" });
  } catch (err) {
    console.error("Error deleting department:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// WHO'S OUT TODAY
// ===============================
app.get("/api/who-out-today", async (req, res) => {
  const { role, branch, department, date } = req.query;

  let targetDate = date ? date.toString() : null;
  if (!targetDate) {
    const now = new Date();
    const klOffset = 8 * 60; // UTC+8
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const klTime = new Date(utc + (klOffset * 60000));
    const yyyy = klTime.getFullYear();
    const mm = String(klTime.getMonth() + 1).padStart(2, '0');
    const dd = String(klTime.getDate()).padStart(2, '0');
    targetDate = `${yyyy}-${mm}-${dd}`;
  }

  try {
    const filters = [];
    const params = [];

    if (role === "branch_leader" && branch) {
      filters.push("p.branch = ?");
      params.push(branch);
    } else if (role === "head_of_department" && department) {
      filters.push("p.department = ?");
      params.push(department);
    } else if (role === "head_of_department") {
      filters.push("1 = 0");
    } else if (!["hr_admin", "managing_director", "finance_manager"].includes(role) && branch) {
      filters.push("p.branch = ?");
      params.push(branch);
    }

    const whereClause = filters.length ? `AND ${filters.join(" AND ")}` : "";

    const [rows] = await pool.query(`
      SELECT * FROM (
      SELECT
        lr.leave_id,
        lr.user_id,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.days,
        lr.reason,
        p.full_name,
        p.branch
      FROM leave_requests lr
      JOIN profiles p ON p.user_id = lr.user_id
      WHERE lr.status = 'Approved'
        AND ?::date BETWEEN lr.start_date AND lr.end_date
        ${whereClause}
      UNION ALL
      SELECT 
        o.id as leave_id,
        o.user_id,
        'Outstation' as leave_type,
        o.start_date,
        o.end_date,
        o.total_days as days,
        o.destination as reason,
        p.full_name,
        p.branch
      FROM outstation_assignments o
      JOIN profiles p ON p.user_id = o.user_id
      WHERE o.status != 'Cancelled'
        AND ?::date BETWEEN o.start_date AND o.end_date
        ${whereClause}
      ) combined
      ORDER BY end_date ASC
    `, [targetDate, ...params, targetDate, ...params]);

    res.json({ success: true, employees: rows });
  } catch (err) {
    console.error("Who Out Today Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// REPORT GENERATOR API
// ===============================
app.get("/api/reports/generator", async (req, res) => {
  try {
    let { type, month, year, branch, department, requesterRole, requesterBranch, requesterDept, requesterId } = req.query;
    
    // Normalize role string
    if (requesterRole.includes('hr admin') || requesterRole === 'hr_admin' || requesterRole.includes('hr ')) requesterRole = 'hr_admin';
    else if (requesterRole.includes('md') || requesterRole.includes('managing director')) requesterRole = 'managing_director';
    else if (requesterRole.includes('branch leader') || requesterRole === 'branch_leader') requesterRole = 'branch_leader';
    else if (requesterRole.includes('finance manager') || requesterRole.includes('operation manager') || requesterRole.includes('operations manager')) requesterRole = 'operation_manager';
    else if (requesterRole.includes('head of department') || requesterRole.includes('hod') || requesterRole === 'head_of_department') requesterRole = 'head_of_department';
    
    // Enforce role-based scoping
    if (requesterRole === 'employee') {
      // Employees can only export their own records
      // We will add the p.user_id filter to all query filters
    } else if (requesterRole === 'branch_leader') {
      // Branch leaders can only export their branch records
      branch = requesterBranch;
    } else if (requesterRole === 'head_of_department') {
      // HODs can only export their department records
      department = requesterDept;
    }

    let filters = [];
    let params = [];
    
    if (branch && branch !== 'all') {
      filters.push("p.branch = ?");
      params.push(branch);
    }
    
    if (department && department !== 'all') {
      filters.push("p.department = ?");
      params.push(department);
    }
    
    if (month && month !== 'all') {
      filters.push("EXTRACT(MONTH FROM a.clock_in) = ?");
      params.push(month);
    }
    
    if (year && year !== 'all') {
      filters.push("EXTRACT(YEAR FROM a.clock_in) = ?");
      params.push(year);
    }

    if (requesterRole === 'employee' && requesterId) {
      filters.push("p.user_id = ?");
      params.push(requesterId);
    }
    
    let whereClause = filters.length > 0 ? "WHERE " + filters.join(" AND ") : "";
    
    if (type === 'trends' || type === 'stability') {
      // 1. Fetch matching employee profiles based on filters & role scoping
      let profFilters = [];
      let profParams = [];
      
      if (branch && branch !== 'all') {
        profFilters.push("p.branch = ?");
        profParams.push(branch);
      }
      if (department && department !== 'all') {
        profFilters.push("p.department = ?");
        profParams.push(department);
      }
      if (requesterRole === 'employee' && requesterId) {
        profFilters.push("p.user_id = ?");
        profParams.push(requesterId);
      }

      let profWhere = profFilters.length > 0 ? "WHERE " + profFilters.join(" AND ") : "";
      // Fetch profiles with permanent branch only; temp branch resolved per-row below
      const [targetProfiles] = await pool.query(`
        SELECT p.user_id, p.full_name, p.branch AS permanent_branch, p.department
        FROM profiles p
        ${profWhere}
        ORDER BY p.full_name ASC
      `, profParams);

      // Also fetch all temp assignments for these users so we can resolve per-date
      const [tempAssignments] = await pool.query(`
        SELECT user_id, location AS temp_branch, DATE(start_date) AS start_date, COALESCE(DATE(end_date), '2099-12-31') AS end_date
        FROM employee_work_assignment
        WHERE status = 'Active'
      `);

      if (targetProfiles.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const targetUserIds = targetProfiles.map(p => p.user_id);

      // 2. Fetch existing attendances for target employees
      let attFilters = ["a.user_id IN (?)"];
      let attParams = [targetUserIds];

      if (month && month !== 'all') {
        attFilters.push("EXTRACT(MONTH FROM a.clock_in) = ?");
        attParams.push(parseInt(month));
      }
      if (year && year !== 'all') {
        attFilters.push("EXTRACT(YEAR FROM a.clock_in) = ?");
        attParams.push(parseInt(year));
      }

      let attWhere = "WHERE " + attFilters.join(" AND ");
      const [attendanceRows] = await pool.query(`
        SELECT a.user_id, a.clock_in, a.clock_out
        FROM attendances a
        ${attWhere}
        ORDER BY a.clock_in DESC
      `, attParams);

      // Map attendances by user_id_YYYY-MM-DD (use MYT offset UTC+8 to match displayed date)
      const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;
      const attendanceMap = new Map();
      attendanceRows.forEach(a => {
        if (a.clock_in) {
          const d = new Date(new Date(a.clock_in).getTime() + MYT_OFFSET_MS);
          const yyyy = d.getUTCFullYear();
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(d.getUTCDate()).padStart(2, '0');
          const key = `${a.user_id}_${yyyy}-${mm}-${dd}`;
          if (!attendanceMap.has(key)) {
            attendanceMap.set(key, a);
          }
        }
      });

      // Helper: resolve which branch was active for a user on a given ISO date string (YYYY-MM-DD)
      const toISOStr = (d) => {
        if (!d) return '2099-12-31';
        if (typeof d === 'string') return d.slice(0, 10);
        // MySQL Date object
        const dd = new Date(d);
        return dd.toISOString().slice(0, 10);
      };
      const getEffectiveBranch = (userId, isoDate, permanentBranch) => {
        const active = tempAssignments.find(ta =>
          ta.user_id === userId &&
          isoDate >= toISOStr(ta.start_date) &&
          isoDate <= toISOStr(ta.end_date)
        );
        return {
          branch: active ? active.temp_branch : permanentBranch,
          temp_branch: active ? active.temp_branch : null,
          permanent_branch: permanentBranch
        };
      };

      // 3. Determine timeframe dates
      const selectedY = year && year !== 'all' ? parseInt(year) : new Date().getFullYear();
      const selectedM = month && month !== 'all' ? parseInt(month) : (new Date().getMonth() + 1);

      const totalDaysInMonth = new Date(selectedY, selectedM, 0).getDate();
      const now = new Date();
      const isCurrentMonth = now.getFullYear() === selectedY && (now.getMonth() + 1) === selectedM;
      const maxDay = isCurrentMonth ? now.getDate() : totalDaysInMonth;

      // 4. Generate daily records for each profile
      const resultRows = [];

      for (let day = maxDay; day >= 1; day--) {
        const dayStr = String(day).padStart(2, '0');
        const monthStr = String(selectedM).padStart(2, '0');
        const dateFormatted = `${dayStr}/${monthStr}/${selectedY}`;
        const isoDateStr = `${selectedY}-${monthStr}-${dayStr}`;

        const dateObj = new Date(selectedY, selectedM - 1, day);
        const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        for (const prof of targetProfiles) {
          const key = `${prof.user_id}_${isoDateStr}`;
          const att = attendanceMap.get(key);

          // Resolve effective branch for THIS specific date
          const branchInfo = getEffectiveBranch(prof.user_id, isoDateStr, prof.permanent_branch);

          if (att && att.clock_in) {
            // Use MYT-adjusted time for hour/minute check
            const clockInMYT = new Date(new Date(att.clock_in).getTime() + MYT_OFFSET_MS);
            const hours = clockInMYT.getUTCHours();
            const mins = clockInMYT.getUTCMinutes();
            const isLate = hours > 9 || (hours === 9 && mins > 0);
            const status = isLate ? "Present (Late)" : "Present (On Time)";

            let totalHrsText = "--";
            if (att.clock_out) {
              const diffMs = new Date(att.clock_out).getTime() - new Date(att.clock_in).getTime();
              if (diffMs > 0) {
                const h = Math.floor(diffMs / 3600000);
                const m = Math.floor((diffMs % 3600000) / 60000);
                totalHrsText = `${h}h ${m}m`;
              }
            } else {
              totalHrsText = "5h 10m";
            }

            resultRows.push({
              user_id: prof.user_id,
              full_name: prof.full_name,
              permanent_branch: branchInfo.permanent_branch,
              temp_branch: branchInfo.temp_branch,
              branch: branchInfo.branch,
              date: dateFormatted,
              iso_date: isoDateStr,
              clock_in: att.clock_in,
              clock_out: att.clock_out,
              status: status,
              total_hours: totalHrsText
            });
          } else {
            const status = isWeekend ? "Weekend" : "Absent";
            resultRows.push({
              user_id: prof.user_id,
              full_name: prof.full_name,
              permanent_branch: branchInfo.permanent_branch,
              temp_branch: branchInfo.temp_branch,
              branch: branchInfo.branch,
              date: dateFormatted,
              iso_date: isoDateStr,
              clock_in: null,
              clock_out: null,
              status: status,
              total_hours: "--"
            });
          }
        }
      }

      res.json({ success: true, data: resultRows });
    } else if (type === 'outstation') {
      let outFilters = [];
      let outParams = [];
      
      if (branch && branch !== 'all') {
         outFilters.push("p.branch = ?");
         outParams.push(branch);
      }
      if (department && department !== 'all') {
         outFilters.push("p.department = ?");
         outParams.push(department);
      }
      if (month && month !== 'all') {
         outFilters.push("EXTRACT(MONTH FROM o.start_date) = ?");
         outParams.push(month);
      }
      if (year && year !== 'all') {
         outFilters.push("EXTRACT(YEAR FROM o.start_date) = ?");
         outParams.push(year);
      }
      if (requesterRole === 'employee' && requesterId) {
         outFilters.push("p.user_id = ?");
         outParams.push(requesterId);
      }
      
      let outWhere = outFilters.length > 0 ? "WHERE " + outFilters.join(" AND ") : "";
      
      const [rows] = await pool.query(`
        SELECT 
          COALESCE(NULLIF(o.project, '-'), NULLIF(o.purpose, '-'), 'General') as event_name,
          o.destination,
          o.start_date,
          o.end_date,
          o.total_days,
          o.status,
          o.user_id,
          p.full_name,
          p.department,
          p.branch
        FROM outstation_assignments o
        JOIN profiles p ON p.user_id = o.user_id
        ${outWhere}
        ORDER BY o.start_date DESC
      `, outParams);
      
      // Dynamically compute outstation status using helper
      const computedRows = rows.map(r => ({
        ...r,
        status: computeOutstationStatus(r)
      }));

      res.json({ success: true, data: computedRows });
    } else if (type === 'company_leave') {
      let clFilters = [];
      let clParams = [];
      
      if (month && month !== 'all') {
         clFilters.push("EXTRACT(MONTH FROM start_date) = ?");
         clParams.push(month);
      }
      if (year && year !== 'all') {
         clFilters.push("EXTRACT(YEAR FROM start_date) = ?");
         clParams.push(year);
      }
      
      let clWhere = clFilters.length > 0 ? "WHERE " + clFilters.join(" AND ") : "";
      
      const [rows] = await pool.query(`
        SELECT 
          leave_name,
          leave_type,
          start_date,
          end_date,
          applies_to,
          branch_id,
          department_id,
          status
        FROM company_leave_calendar
        ${clWhere}
        ORDER BY start_date DESC
      `, clParams);
      
      res.json({ success: true, data: rows });
    } else {
      let leaveFilters = [];
      let leaveParams = [];
      
      if (branch && branch !== 'all') {
         leaveFilters.push("p.branch = ?");
         leaveParams.push(branch);
      }
      
      if (department && department !== 'all') {
         leaveFilters.push("p.department = ?");
         leaveParams.push(department);
      }
      
      if (month && month !== 'all') {
         leaveFilters.push("EXTRACT(MONTH FROM lr.start_date) = ?");
         leaveParams.push(month);
      }
      
      if (year && year !== 'all') {
         leaveFilters.push("EXTRACT(YEAR FROM lr.start_date) = ?");
         leaveParams.push(year);
      }

      if (requesterRole === 'employee' && requesterId) {
         leaveFilters.push("p.user_id = ?");
         leaveParams.push(requesterId);
      }
      
      let leaveWhereClause = leaveFilters.length > 0 ? "AND " + leaveFilters.join(" AND ") : "";
      
      const [rows] = await pool.query(`
        SELECT 
          p.user_id,
          p.full_name,
          p.branch,
          p.department,
          lr.leave_type,
          lr.start_date,
          lr.end_date,
          lr.days,
          lr.status,
          lr.reason,
          lr.applied_at
        FROM leave_requests lr
        JOIN profiles p ON p.user_id = lr.user_id
        WHERE 1=1 ${leaveWhereClause}
        ORDER BY lr.applied_at DESC
      `, leaveParams);
      
      res.json({ success: true, data: rows });
    }
  } catch (err) {
    console.error("Generator Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// LEAVE UTILIZATION ANALYTICS
// ===============================
app.get("/api/reports/leave-utilization", async (req, res) => {
  try {
    let { role, branch, department } = req.query;
    let filter = "";
    let params = [];

    if (role === 'branch_leader') {
      const safeBranch = (branch && branch !== "All") ? branch : "INVALID_BYPASS";
      branch = safeBranch;
      filter = " AND p.branch = ?";
      params.push(branch);
    } else if (role === 'head_of_department') {
      const safeDept = (department && department !== "All") ? department : "INVALID_BYPASS";
      department = safeDept;
      filter = " AND p.department = ?";
      params.push(department);
    }

    // 1. Department Utilization
    const [deptRows] = await pool.query(`
      SELECT 
        COALESCE(p.department, 'GENERAL') as department, 
        lr.leave_type, 
        SUM(lr.days) as total_days
      FROM leave_requests lr
      JOIN profiles p ON p.user_id = lr.user_id
      WHERE lr.status = 'Approved' ${filter}
      GROUP BY p.department, lr.leave_type
    `, params);

    // 2. Leave Type Distribution
    const [distRows] = await pool.query(`
      SELECT 
        lr.leave_type, 
        SUM(lr.days) as total_days
      FROM leave_requests lr
      JOIN profiles p ON p.user_id = lr.user_id
      WHERE lr.status = 'Approved' ${filter}
      GROUP BY lr.leave_type
    `, params);

    // 3. Leader Leaves (Upcoming / Active HOD/Leader Leaves)
    const [leaderRows] = await pool.query(`
      SELECT 
        lr.leave_id, 
        lr.leave_type, 
        lr.start_date, 
        lr.end_date, 
        lr.days, 
        p.full_name, 
        COALESCE(p.department, 'GENERAL') as department, 
        p.branch, 
        ur.role
      FROM leave_requests lr
      JOIN profiles p ON p.user_id = lr.user_id
      JOIN user_role ur ON ur.user_id = p.user_id
      WHERE lr.status = 'Approved' AND ur.role IN ('head_of_department', 'branch_leader') ${filter}
      ORDER BY lr.start_date DESC 
      LIMIT 10
    `, params);

    res.json({
      success: true,
      departmentUtilization: deptRows,
      leaveTypeDistribution: distRows,
      leaderLeaves: leaderRows
    });
  } catch (err) {
    console.error("Leave Utilization Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// PASSWORD RESET API
// ===============================
app.post("/api/request-password-reset", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: "Email is required" });
  }

  try {
    // Look up user by email in profiles table
    const [rows] = await pool.query("SELECT * FROM profiles WHERE email = ?", [email]);
    if (rows.length === 0) {
      // Don't leak that email doesn't exist for security reasons, just pretend success
      return res.json({ success: true, message: "If your email is registered, you will receive a reset link shortly." });
    }

    const user = rows[0];

    // Check JWT secret
    if (!jwtSecret) {
      return res.status(500).json({ success: false, error: "Server misconfiguration: JWT secret missing" });
    }

    // Generate JWT token valid for 15 minutes
    const token = jwt.sign({ user_id: user.user_id, purpose: "password_reset" }, jwtSecret, { expiresIn: "15m" });

    // Determine Frontend URL
    const frontendUrl = req.headers.origin || process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    // Send email
    const subject = "Rayhar Staff Portal - Password Reset";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #7B0099;">Password Reset Request</h2>
        <p>Hello ${user.full_name},</p>
        <p>We received a request to reset your password for the Rayhar Employee Portal.</p>
        <p>Click the button below to set a new password. This link will expire in 15 minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #7B0099; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you did not request a password reset, please ignore this email or contact HR if you have concerns.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center;">Rayhar Staff Portal</p>
      </div>
    `;

    await sendNotificationEmail(user.email, subject, html);
    
    res.json({ success: true, message: "Reset link sent successfully." });
  } catch (err) {
    console.error("Error requesting password reset:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.post("/api/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ success: false, error: "Token and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
  }

  try {
    // Verify Token
    const decoded = jwt.verify(token, jwtSecret);

    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({ success: false, error: "Invalid token type" });
    }

    const userId = decoded.user_id;

    // Hash new password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query("UPDATE profiles SET password = ? WHERE user_id = ?", [hashedPassword, userId]);

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Error resetting password:", err);
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ success: false, error: "Your reset link has expired. Please request a new one." });
    }
    return res.status(400).json({ success: false, error: "Invalid or expired token" });
  }
});

// ===============================
// PERSONAL NOTES & CALENDAR API
// ===============================

// Get personal notes for a user
app.get("/api/personal-notes", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ success: false, error: "Missing userId" });
    }
    const [rows] = await pool.query(
      "SELECT id, user_id, TO_CHAR(date, 'YYYY-MM-DD') as date, note_text, type, created_at FROM personal_notes WHERE user_id = ? ORDER BY date DESC",
      [userId]
    );
    res.json({ success: true, notes: rows });
  } catch (err) {
    console.error("Error fetching personal notes:", err);
    res.status(500).json({ success: false, error: "Failed to fetch notes" });
  }
});

// Add or update a personal note
app.post("/api/personal-notes", async (req, res) => {
  try {
    const { userId, date, note_text, type } = req.body;
    
    if (!userId || !date || !note_text) {
      return res.status(400).json({ success: false, error: "UserId, Date and note text are required" });
    }
    
    const [result] = await pool.query(
      "INSERT INTO personal_notes (user_id, date, note_text, type) VALUES (?, ?, ?, ?) RETURNING *",
      [userId, date, note_text, type || 'note']
    );
    
    const newNote = result[0] || { id: result.insertId, user_id: userId, date, note_text, type: type || 'note' };
    res.status(201).json({ success: true, note: newNote });
  } catch (err) {
    console.error("Error adding personal note:", err.message, err.stack);
    res.status(500).json({ success: false, error: "Failed to add note: " + err.message });
  }
});

// Delete a personal note
app.delete("/api/personal-notes/:id", async (req, res) => {
  try {
    const userId = req.query.userId;
    const noteId = req.params.id;

    if (!userId) {
      return res.status(400).json({ success: false, error: "Missing userId" });
    }
    
    await pool.query(
      "DELETE FROM personal_notes WHERE id = ? AND user_id = ?",
      [noteId, userId]
    );
    res.json({ success: true, message: "Note deleted successfully" });
  } catch (err) {
    console.error("Error deleting personal note:", err);
    res.status(500).json({ success: false, error: "Failed to delete note" });
  }
});

// Get Malaysian Public Holidays (Static List for 2024-2026)
app.get("/api/holidays", (req, res) => {
  res.json({ success: true, holidays: malaysiaHolidays });
});

// ── COMPANY LEAVE CALENDAR ENDPOINTS ─────────────────────────────────────
app.get("/api/company-leaves", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM company_leave_calendar ORDER BY start_date DESC`
    );
    res.json({ success: true, leaves: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/company-leaves", async (req, res) => {
  const {
    leave_name,
    leave_type,
    start_date,
    end_date,
    applies_to,
    branch_id,
    department_id,
    is_paid,
    attendance_required,
    status,
    remarks,
    created_by
  } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO company_leave_calendar (
        leave_name, leave_type, start_date, end_date, applies_to,
        branch_id, department_id, is_paid, attendance_required, status,
        remarks, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        leave_name, leave_type, start_date, end_date, applies_to,
        branch_id || null, department_id || null, is_paid ?? true, attendance_required ?? false, status || 'Active',
        remarks || '', created_by || 'HR'
      ]
    );
    const newLeaveId = result.insertId;

    // Dynamically generated notification will be served via GET /api/notifications
    // Broadcast SSE so clients pick up the new company leave and refresh their views
    try {
      broadcastPresenceUpdate({ type: 'company_leave', action: 'created', id: newLeaveId });
    } catch (e) {
      console.error('Error broadcasting company_leave create:', e);
    }

    res.json({ success: true, id: newLeaveId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/company-leaves/:id", async (req, res) => {
  const { id } = req.params;
  const {
    leave_name,
    leave_type,
    start_date,
    end_date,
    applies_to,
    branch_id,
    department_id,
    is_paid,
    attendance_required,
    status,
    remarks
  } = req.body;

  try {
    await pool.query(
      `UPDATE company_leave_calendar SET
        leave_name = ?, leave_type = ?, start_date = ?, end_date = ?, applies_to = ?,
        branch_id = ?, department_id = ?, is_paid = ?, attendance_required = ?, status = ?,
        remarks = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        leave_name, leave_type, start_date, end_date, applies_to,
        branch_id || null, department_id || null, is_paid ?? true, attendance_required ?? false, status || 'Active',
        remarks || '', id
      ]
    );
    // Notify clients via SSE so they can refresh presence/history
    try {
      broadcastPresenceUpdate({ type: 'company_leave', action: 'updated', id });
    } catch (e) {
      console.error('Error broadcasting company_leave update:', e);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/company-leaves/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM company_leave_calendar WHERE id = ?`, [id]);
    try {
      broadcastPresenceUpdate({ type: 'company_leave', action: 'deleted', id });
    } catch (e) {
      console.error('Error broadcasting company_leave delete:', e);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// ===============================
// USER IC NUMBER — Auto-populate Leave Form
// ===============================

// GET: Fetch saved Phone number for a user
app.get("/api/user-phone", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: "Missing userId" });
  try {
    await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
    const [rows] = await pool.query("SELECT phone FROM profiles WHERE user_id = ? LIMIT 1", [userId]);
    const phone = rows[0]?.phone || null;
    res.json({ success: true, phone });
  } catch (err) {
    console.error("GET /api/user-phone error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET: Fetch saved IC / Phone number for a user (legacy support)
app.get("/api/user-ic", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: "Missing userId" });
  try {
    await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ic_number VARCHAR(20)`);
    await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
    const [rows] = await pool.query("SELECT ic_number, phone FROM profiles WHERE user_id = ? LIMIT 1", [userId]);
    const icNumber = rows[0]?.ic_number || null;
    const phone = rows[0]?.phone || null;
    res.json({ success: true, icNumber, phone });
  } catch (err) {
    console.error("GET /api/user-ic error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// OUTSTATION MANAGEMENT API
// =================================================================

// Auto-create outstation table on startup
pool.query(`
  CREATE TABLE IF NOT EXISTS outstation_assignments (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    full_name VARCHAR(200),
    branch VARCHAR(100),
    department VARCHAR(100),
    position VARCHAR(100),
    destination VARCHAR(300) NOT NULL,
    client_company VARCHAR(200),
    purpose TEXT,
    project VARCHAR(200),
    meeting_title VARCHAR(300),
    start_date DATE NOT NULL,
    start_time TIME,
    end_date DATE NOT NULL,
    end_time TIME,
    total_days NUMERIC(5,1),
    status VARCHAR(50) DEFAULT 'Upcoming',
    assigned_by VARCHAR(100),
    assigned_by_name VARCHAR(200),
    assigned_by_role VARCHAR(50),
    assigned_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )
`).then(() => console.log('✅ outstation_assignments table ready')).catch(e => console.error('❌ outstation table error:', e));

// Helper: compute live status based on dates
function computeOutstationStatus(row) {
  if (row.status === 'Cancelled') return 'Cancelled';
  if (row.status === 'Completed') return 'Completed';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(row.start_date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(row.end_date);
  end.setHours(0, 0, 0, 0);
  if (today < start) return 'Upcoming';
  if (today > end) return 'Completed';
  return 'Active';
}

// GET /api/outstation — list assignments (role-scoped)
app.get('/api/outstation', async (req, res) => {
  try {
    const { role, branch, department, user_id } = req.query;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (role === 'branch_leader' && branch) {
      params.push(branch);
      whereClause += ` AND oa.branch = $${params.length}`;
    } else if (role === 'head_of_department' && department) {
      params.push(department);
      whereClause += ` AND oa.department = $${params.length}`;
    } else if (role === 'employee' && user_id) {
      params.push(user_id);
      whereClause += ` AND oa.user_id = $${params.length}`;
    }
    // hr_admin, managing_director, finance_manager → see all (no extra filter)

    const [rawRows] = await pool.query(
      `SELECT oa.*, p.full_name 
       FROM outstation_assignments oa 
       LEFT JOIN profiles p ON oa.user_id = p.user_id 
       ${whereClause} 
       ORDER BY oa.start_date DESC, oa.created_at DESC`,
      params
    );
    const rows = rawRows.map(r => ({ ...r, status: computeOutstationStatus(r) }));
    res.json({ success: true, assignments: rows });
  } catch (err) {
    console.error('GET /api/outstation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/outstation/stats — KPI stats for dashboard
app.get('/api/outstation/stats', async (req, res) => {
  try {
    const { role, branch, department } = req.query;
    let scopeWhere = '1=1';
    const params = [];

    if (role === 'branch_leader' && branch) {
      params.push(branch);
      scopeWhere = `branch = $${params.length}`;
    } else if (role === 'head_of_department' && department) {
      params.push(department);
      scopeWhere = `department = $${params.length}`;
    }

    const today = new Date().toISOString().split('T')[0];

    const [allRows] = await pool.query(
      `SELECT * FROM outstation_assignments WHERE ${scopeWhere}`, params
    );

    let active = 0, upcoming = 0, completed = 0, cancelled = 0, todayDepartures = 0, todayReturns = 0;

    for (const r of allRows) {
      const computed = computeOutstationStatus(r);
      if (computed === 'Active') active++;
      else if (computed === 'Upcoming') upcoming++;
      else if (computed === 'Completed') completed++;
      else if (computed === 'Cancelled') cancelled++;

      if (computed !== 'Cancelled') {
        // match how db returns date strings or objects
        const startStr = new Date(r.start_date).toISOString().split('T')[0];
        const endStr = new Date(r.end_date).toISOString().split('T')[0];
        if (startStr === today) todayDepartures++;
        if (endStr === today) todayReturns++;
      }
    }

    res.json({
      success: true,
      stats: {
        active,
        upcoming,
        completed,
        cancelled,
        todayDepartures,
        todayReturns
      }
    });
  } catch (err) {
    console.error('GET /api/outstation/stats error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/outstation/active-today — employees currently on outstation today
app.get('/api/outstation/active-today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await pool.query(
      `SELECT user_id, full_name, branch, department, destination, start_date, end_date 
       FROM outstation_assignments 
       WHERE status != 'Cancelled' AND start_date <= $1 AND end_date >= $1
       ORDER BY full_name`,
      [today]
    );
    res.json({ success: true, employees: rows });
  } catch (err) {
    console.error('GET /api/outstation/active-today error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/outstation — create assignment(s) — supports multiple user_ids
app.post('/api/outstation', async (req, res) => {
  try {
    const {
      user_ids, // array of { user_id, full_name, branch, department, position }
      destination, client_company, purpose, project, meeting_title,
      start_date, start_time, end_date, end_time, total_days,
      assigned_by, assigned_by_name, assigned_by_role
    } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one employee must be selected' });
    }
    if (!destination || !start_date || !end_date) {
      return res.status(400).json({ success: false, error: 'Destination, start date, and end date are required' });
    }

    const formatApproverRole = (r) => {
      if (!r) return "";
      const map = {
        'managing_director': 'Managing Director',
        'hr_admin': 'HR',
        'head_of_department': 'Head of Department',
        'branch_leader': 'Branch Leader',
        'operation_manager': 'Operation Manager',
        'finance_manager': 'Operation Manager'
      };
      return map[r.toLowerCase()] || r;
    };

    const inserted = [];
    for (const emp of user_ids) {
      const [insertResult] = await pool.query(
        `INSERT INTO outstation_assignments 
         (user_id, full_name, branch, department, position, destination, client_company, purpose, project, meeting_title, start_date, start_time, end_date, end_time, total_days, assigned_by, assigned_by_name, assigned_by_role)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         RETURNING *`,
        [emp.user_id, emp.full_name, emp.branch, emp.department, emp.position,
         destination, client_company || null, purpose || null, project || null, meeting_title || null,
         start_date, start_time || null, end_date, end_time || null, total_days || null,
         assigned_by, assigned_by_name, assigned_by_role]
      );
      const returnedRow = Array.isArray(insertResult) ? insertResult[0] : insertResult;
      inserted.push(returnedRow);

      // Insert in-app notification for the employee
      try {
        const formattedRole = formatApproverRole(assigned_by_role);
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
          [
            emp.user_id,
            '🔔 **UPCOMING OUTSTATION ASSIGNMENT**',
            `${formattedRole} created an upcoming outstation assignment for you: ${purpose} at ${destination} from ${start_date} - ${end_date}.`,
            'outstation'
          ]
        );
      } catch (notifErr) {
        console.error('Error inserting outstation notification:', notifErr);
      }
    }

    // Broadcast SSE so clients refresh outstation and notification data
    try {
      const ids = inserted.map(r => r.id || r.assignment_id).filter(Boolean);
      broadcastPresenceUpdate({ type: 'refresh', action: 'outstation_created', ids, count: inserted.length });
    } catch (e) {
      console.error('Error broadcasting outstation create:', e);
    }
    res.json({ success: true, assignments: inserted, message: `${inserted.length} outstation assignment(s) created` });
  } catch (err) {
    console.error('POST /api/outstation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/outstation/:id — edit assignment
app.put('/api/outstation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      destination, client_company, purpose, project, meeting_title,
      start_date, start_time, end_date, end_time, total_days, status
    } = req.body;

    const [rows] = await pool.query(
      `UPDATE outstation_assignments 
       SET destination=$1, client_company=$2, purpose=$3, project=$4, meeting_title=$5,
           start_date=$6, start_time=$7, end_date=$8, end_time=$9, total_days=$10,
           status=COALESCE($11, status), updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [destination, client_company || null, purpose || null, project || null, meeting_title || null,
       start_date, start_time || null, end_date, end_time || null, total_days || null,
       status || null, id]
    );

    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Assignment not found' });
    try {
      broadcastPresenceUpdate({ type: 'outstation', action: 'updated', id: rows[0].id || rows[0].assignment_id });
    } catch (e) { console.error('Error broadcasting outstation update:', e); }
    res.json({ success: true, assignment: rows[0] });
  } catch (err) {
    console.error('PUT /api/outstation/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/outstation/:id/cancel — cancel assignment
app.put('/api/outstation/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `UPDATE outstation_assignments SET status='Cancelled', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Assignment not found' });
    try { broadcastPresenceUpdate({ type: 'outstation', action: 'cancelled', id: rows[0].id || rows[0].assignment_id }); } catch (e) { console.error('Error broadcasting outstation cancel:', e); }
    res.json({ success: true, assignment: rows[0] });
  } catch (err) {
    console.error('PUT /api/outstation/:id/cancel error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/outstation/:id — delete assignment
app.delete('/api/outstation/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Retrieve the assignment
    const [assignments] = await pool.query('SELECT * FROM outstation_assignments WHERE id = $1', [id]);
    if (assignments.length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    const assignment = assignments[0];

    // 2. Verify creator matches authenticated user
    req.user = req.user || {};
    req.user.userId = req.user.userId || req.query.userId || req.body.userId || req.headers['x-user-id'];

    if (assignment.assigned_by !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Only the user who created this outstation assignment can delete it."
      });
    }

    const formatApproverRole = (r) => {
      if (!r) return "";
      const map = {
        'managing_director': 'Managing Director',
        'hr_admin': 'HR',
        'head_of_department': 'Head of Department',
        'branch_leader': 'Branch Leader',
        'operation_manager': 'Operation Manager',
        'finance_manager': 'Operation Manager'
      };
      return map[r.toLowerCase()] || r;
    };

    const approverRole = formatApproverRole(assignment.assigned_by_role);
    const formattedStartDate = new Date(assignment.start_date).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
    
    // 3. Notify the affected employee
    const notificationMsg = `Your outstation assignment scheduled for ${formattedStartDate} has been cancelled by ${approverRole} ${assignment.assigned_by_name}.`;
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [assignment.user_id, 'Outstation Assignment Cancelled', notificationMsg, 'outstation']
    );

    // 4. Record the deletion in the activity log
    const auditActor = assignment.assigned_by_name || approverRole;
    const auditContext = `Event: ${assignment.purpose} — ${assignment.destination} • ${formattedStartDate} • ${assignment.total_days} Days`;
    await pool.query(
      `INSERT INTO activity_logs (user_id, actor, action, target, context, type) VALUES ($1, $2, $3, $4, $5, $6)`,
      [assignment.user_id, auditActor, 'cancelled an outstation assignment for', assignment.full_name, auditContext, 'outstation']
    );

    // 5. Update the status to 'Cancelled' instead of deleting
    await pool.query('UPDATE outstation_assignments SET status=$1 WHERE id=$2', ['Cancelled', id]);

    try { 
      broadcastPresenceUpdate({ type: 'refresh', action: 'outstation_deleted', id }); 
    } catch (e) { 
      console.error('Error broadcasting outstation delete:', e); 
    }

    res.json({ success: true, message: 'Assignment deleted' });
  } catch (err) {
    console.error('DELETE /api/outstation/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// END OUTSTATION MANAGEMENT API
// =================================================================

// =================================================================
// WORKFORCE CALENDAR API
// =================================================================

// SSE clients for workforce calendar real-time updates
let workforceCalendarClients = [];

function broadcastWorkforceCalendarUpdate(payload = { type: 'refresh' }) {
  console.log(`📡 Broadcasting workforce-calendar update to ${workforceCalendarClients.length} clients...`);
  workforceCalendarClients.forEach((client) => {
    try { client.write(`data: ${JSON.stringify(payload)}\n\n`); } catch (e) { /* swallow */ }