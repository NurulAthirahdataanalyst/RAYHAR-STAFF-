const fs = require('fs');

const files = [
  'src/components/leave/LeaveDetailsModal.tsx',
  'src/pages/LeaveFormView.tsx',
  'src/pages/TeamLeaveRequests.tsx',
  'src/pages/Employees.tsx',
  'src/pages/Branches.tsx',
  'src/components/shared/StaffProfileDialog.tsx',
  'src/components/leave/ApprovalHistoryTimeline.tsx'
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  
  // Make all labels uniformly print:text-[12px]
  c = c.replace(/print:text-\[10px\]/g, 'print:text-[12px]');
  c = c.replace(/print:text-\[11px\]/g, 'print:text-[12px]');
  
  // Also make values uniform at print:text-[13px] or 12px if we want exact same.
  // The user says "is it all in page have same size?"
  // I will make values print:text-[13px] and labels print:text-[12px].
  // 1px difference is negligible, but preserves a tiny bit of hierarchy.
  // But wait, the date "2026-09-26" is "text-xs sm:text-sm". I should add print:text-[13px] to it.
  
  c = c.replace(/text-xs sm:text-sm/g, 'text-xs sm:text-sm print:text-[13px]');
  
  fs.writeFileSync(f, c);
});
