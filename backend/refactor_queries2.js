const fs = require('fs');

let code = fs.readFileSync('c:/Users/HP/ATTENDANCE_SYSTEM/backend/server.js', 'utf8');

// The join string to add
const adjJoin = `
      LEFT JOIN (
        SELECT employee_id, SUM(adjustment_days) as total_adjustment 
        FROM leave_balance_adjustments 
        WHERE leave_type IN ('Annual Leave', 'Annual & Emergency Leave', 'Annual/Emergency Leave', 'Cuti Tahunan') 
        GROUP BY employee_id
      ) adj ON adj.employee_id = p.user_id`;

// 1. /api/presence/live-stats (approx line 1800)
code = code.replace(
  "GREATEST(14 - COALESCE(lr.annual_days_used, 0), 0) AS annual_leave_balance,",
  "GREATEST((COALESCE(p.annual_leave_entitlement, 14) + COALESCE(adj.total_adjustment, 0)) - COALESCE(lr.annual_days_used, 0), 0) AS annual_leave_balance,"
);

code = code.replace(
  "LEFT JOIN user_role ur ON ur.user_id = p.user_id",
  "LEFT JOIN user_role ur ON ur.user_id = p.user_id" + adjJoin
);

// 2. /api/leave-entitlements (approx line 1950)
code = code.replace(
  "GREATEST(14 - COALESCE(lr.annual_days_used, 0), 0) AS balance,",
  "GREATEST((COALESCE(p.annual_leave_entitlement, 14) + COALESCE(adj.total_adjustment, 0)) - COALESCE(lr.annual_days_used, 0), 0) AS balance,"
);

// Note: /api/leave-entitlements doesn't have `LEFT JOIN user_role`, it has `FROM profiles p \n LEFT JOIN (`
code = code.replace(
  "FROM profiles p\n      LEFT JOIN (",
  "FROM profiles p" + adjJoin + "\n      LEFT JOIN ("
);

// 3. /api/dashboard/summary (approx line 2730)
code = code.replace(
  "GREATEST(14 - COALESCE(lr.annual_days_used, 0), 0) AS annual_leave_balance,",
  "GREATEST((COALESCE(p.annual_leave_entitlement, 14) + COALESCE(adj.total_adjustment, 0)) - COALESCE(lr.annual_days_used, 0), 0) AS annual_leave_balance,"
);
// It also has `FROM profiles p \n LEFT JOIN user_role` or similar. Let's see.
code = code.replace(
  "LEFT JOIN (SELECT user_id, status as role",
  adjJoin + "\n      LEFT JOIN (SELECT user_id, status as role"
);


// 4. /api/profiles/:userId/leave-entitlement 
// It has `const leaveBalance = Math.max(14 - quotaLeavesUsed, 0);`
// Actually, this one fetches `p.annual_leave_entitlement` directly?
code = code.replace(
  "const leaveBalance = Math.max(14 - quotaLeavesUsed, 0);",
  "const baseEntitlement = employee.annual_leave_entitlement || 14;\n    const leaveBalance = Math.max((baseEntitlement + (employee.total_adjustment || 0)) - quotaLeavesUsed, 0);"
);

// Update query in /api/profiles/:userId to fetch annual_leave_entitlement and total_adjustment
// We'll replace `SELECT user_id, full_name, email` with `SELECT user_id, full_name, email, annual_leave_entitlement, medical_leave_entitlement`
code = code.replace(
  "SELECT user_id, full_name, email, branch, department, role, status",
  "SELECT p.user_id, p.full_name, p.email, p.branch, p.department, p.role, p.status, p.annual_leave_entitlement, p.medical_leave_entitlement, COALESCE(adj.total_adjustment, 0) as total_adjustment"
);

code = code.replace(
  "FROM profiles WHERE user_id = ?",
  "FROM profiles p" + adjJoin + " WHERE p.user_id = ?"
);


fs.writeFileSync('c:/Users/HP/ATTENDANCE_SYSTEM/backend/server.js', code);
console.log('Refactoring SQL queries complete');
