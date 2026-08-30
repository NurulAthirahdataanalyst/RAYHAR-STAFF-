const fs = require('fs');
let code = fs.readFileSync('src/pages/LeaveAnalytics.tsx', 'utf8');

code = code.replace(
  /quota: entitlements\[r\.user_id\] \|\| 14\r?\n\s*\};\r?\n\s*\}/g,
  `quota: entitlements[r.user_id] || 14,
            rawRole: r.role || "employee"
          };
        }`
);

fs.writeFileSync('src/pages/LeaveAnalytics.tsx', code);
console.log("Updated LeaveAnalytics.tsx");
