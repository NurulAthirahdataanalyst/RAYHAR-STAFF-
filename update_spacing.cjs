const fs = require('fs');

const files = [
  'src/components/leave/LeaveDetailsModal.tsx',
  'src/pages/LeaveFormView.tsx',
  'src/pages/TeamLeaveRequests.tsx',
  'src/pages/Employees.tsx',
  'src/pages/Branches.tsx',
  'src/components/shared/StaffProfileDialog.tsx'
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  
  // 1. Grid spacing
  c = c.replace(/grid grid-cols-2 gap-4/g, 'grid grid-cols-2 gap-4 print:gap-y-6 print:gap-x-8');
  
  // 2. Space between label and value
  c = c.replace(/className="space-y-1"/g, 'className="space-y-1 print:space-y-1.5"');
  
  // 3. Padding for underline in the top section
  c = c.replace(/border-b pb-1/g, 'border-b pb-1 print:pb-2');
  
  // 4. Box padding for Maklumat Waris and others
  // We'll be specific to avoid replacing random paddings incorrectly
  c = c.replace(/p-4 sm:p-6/g, 'p-4 sm:p-6 print:p-6');
  c = c.replace(/p-4 bg-muted\/30/g, 'p-4 print:p-5 bg-muted/30');
  c = c.replace(/p-4 bg-muted\/20/g, 'p-4 print:p-5 bg-muted/20');
  
  fs.writeFileSync(f, c);
});
