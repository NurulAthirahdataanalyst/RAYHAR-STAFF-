const fs = require('fs');

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
  
  c = c.replace(/print:space-y-2 print:pt-2/g, 'print:space-y-6 print:pt-6 print:mt-4');
  
  fs.writeFileSync(f, c);
});
