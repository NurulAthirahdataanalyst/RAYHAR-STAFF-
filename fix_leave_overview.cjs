const fs = require('fs');
let code = fs.readFileSync('src/pages/LeaveOverview.tsx', 'utf-8');

// 1. Remove duplicate import
code = code.replace(/import \{ ApprovalStatusTracker \} from "@\/components\/leave\/ApprovalStatusTracker";\r?\nimport \{ Button \}/, "import { Button }");

// 2. Fix approverRole typing
code = code.replace(
  'approverRole={req.approverRole} branch={(req as any).branch || "HQ"} variant="staggered"',
  'approverRole={req.approverRole || ""} branch={(req as any).branch || "HQ"} variant="staggered"'
);

fs.writeFileSync('src/pages/LeaveOverview.tsx', code);
console.log('Fixed LeaveOverview');
