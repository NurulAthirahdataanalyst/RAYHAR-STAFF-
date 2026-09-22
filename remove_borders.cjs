const fs = require('fs');

// 1. Remove vertical line in ApprovalHistoryTimeline
let f1 = 'src/components/leave/ApprovalHistoryTimeline.tsx';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(/before:absolute before:left-\[11px\] before:top-3 before:bottom-3 before:w-\[2px\] before:bg-gray-200 dark:before:bg-slate-700/g, 
                'before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-[2px] before:bg-gray-200 dark:before:bg-slate-700 print:before:hidden');
fs.writeFileSync(f1, c1);

// 2. Remove border-t in LeaveFormView (and others if needed, but I'll do all of them)
const files = [
  'src/components/leave/LeaveDetailsModal.tsx',
  'src/pages/LeaveFormView.tsx',
  'src/pages/TeamLeaveRequests.tsx',
  'src/pages/Employees.tsx',
  'src/pages/Branches.tsx',
  'src/components/shared/StaffProfileDialog.tsx',
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  
  c = c.replace(/className="pt-4 border-t border-border\/50 space-y-4 print:space-y-3 print:pt-5 print:mt-5"/g, 
                'className="pt-4 border-t border-border/50 print:border-none space-y-4 print:space-y-3 print:pt-5 print:mt-5"');
                
  c = c.replace(/className="space-y-4 print:space-y-3 pt-4 print:pt-5 print:mt-5 border-t border-border\/50"/g, 
                'className="space-y-4 print:space-y-3 pt-4 print:pt-5 print:mt-5 border-t border-border/50 print:border-none"');

  fs.writeFileSync(f, c);
});
