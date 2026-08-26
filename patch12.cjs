const fs = require('fs');
let code = fs.readFileSync('src/components/leave/ApprovalStatusTracker.tsx', 'utf-8');

// 1. We already added `variant?: 'staggered' | 'linear';`
// 2. Fix the signature to extract variant and define isStaggered
code = code.replace(
  /export function ApprovalStatusTracker\(\{ status, approverRole, approvalHistory = \[\], branch = \"\" \}: ApprovalStatusTrackerProps\) \{/,
  'export function ApprovalStatusTracker({ status, approverRole, approvalHistory = [], branch = "", variant = "linear" }: ApprovalStatusTrackerProps) {\n  const isStaggered = variant === "staggered";'
);

// wait, the error is Cannot find name 'isStaggered' because we already injected `isStaggered` inside the template literals but never defined it because the replace failed!
// Let me verify if it was fixed.
fs.writeFileSync('src/components/leave/ApprovalStatusTracker.tsx', code);
console.log("Signature fixed!");
