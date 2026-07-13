const fs = require('fs');

let code = fs.readFileSync('c:/Users/HP/ATTENDANCE_SYSTEM/backend/server.js', 'utf8');

// 1. Add fields to /api/employees SELECT
code = code.replace(
  `      SELECT
        p.user_id,
        p.full_name,
        p.email,
        p.branch,
        p.department,
        p.status,
        COALESCE(ur.role, 'employee') AS role,`,
  `      SELECT
        p.user_id,
        p.full_name,
        p.email,
        p.branch,
        p.department,
        p.status,
        p.annual_leave_entitlement,
        p.medical_leave_entitlement,
        COALESCE(adj.total_adjustment, 0) as total_adjustment,
        COALESCE(ur.role, 'employee') AS role,`
);

// 2. Add fields to /api/leave-entitlements SELECT
code = code.replace(
  `      SELECT
        p.user_id,
        p.full_name AS employee,
        p.branch,
        p.department,
        COALESCE(lr.annual_days_used, 0) AS annual_days_used,`,
  `      SELECT
        p.user_id,
        p.full_name AS employee,
        p.branch,
        p.department,
        p.annual_leave_entitlement,
        p.medical_leave_entitlement,
        COALESCE(adj.total_adjustment, 0) as total_adjustment,
        COALESCE(lr.annual_days_used, 0) AS annual_days_used,`
);

fs.writeFileSync('c:/Users/HP/ATTENDANCE_SYSTEM/backend/server.js', code);
console.log('Employees API updated');
