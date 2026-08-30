const fs = require('fs');
let code = fs.readFileSync('src/pages/LeaveAnalytics.tsx', 'utf8');

// 1. Fix the map type
code = code.replace(
  /branch: string; quota: number; }>/g,
  'branch: string; quota: number; rawRole: string; }>'
);

// 2. Fix the emp.user_id mapping inside allEmployees.forEach
code = code.replace(
  /quota: entitlements\[emp\.user_id\] \|\| QUOTA_PER_EMPLOYEE\r?\n\s*\};\r?\n\s*\r?\n?\s*\}\);/g,
  `quota: entitlements[emp.user_id] || QUOTA_PER_EMPLOYEE,
        rawRole: emp.role || "employee"
      };
    });`
);
// Another variant just in case:
code = code.replace(
  /quota: entitlements\[emp\.user_id\] \|\| QUOTA_PER_EMPLOYEE\r?\n\s*\};\r?\n\s*\}\);/g,
  `quota: entitlements[emp.user_id] || QUOTA_PER_EMPLOYEE,
        rawRole: emp.role || "employee"
      };
    });`
);

// 3. Fix the r.user_id mapping inside records.forEach
code = code.replace(
  /quota: QUOTA_PER_EMPLOYEE\r?\n\s*\};\r?\n\s*\}/g,
  `quota: QUOTA_PER_EMPLOYEE,
          rawRole: "employee"
        };
      }`
);

// 4. Update the role rendering in attentionEmployees
code = code.replace(
  /role: s\.department === \"General\" \? \"Employee\" : \"Executive\",/g,
  'role: (s.rawRole === "head_of_department" || s.rawRole === "hod") ? `Head Of Department (${s.department})` : s.rawRole === "branch_leader" ? "Branch Leader" : "Employee",'
);

fs.writeFileSync('src/pages/LeaveAnalytics.tsx', code);
console.log("Updated LeaveAnalytics.tsx");
