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
  
  // Fix Maklumat Waris spacing
  c = c.replace(/className="pt-4 border-t border-border\/50 space-y-4 print:space-y-8 print:pt-8 print:mt-6"/g, 
                'className="pt-4 border-t border-border/50 space-y-4 print:space-y-3 print:pt-5 print:mt-5"');
                
  c = c.replace(/className="pt-4 border-t border-border\/50 space-y-4 print:space-y-6 print:pt-6 print:mt-4"/g, 
                'className="pt-4 border-t border-border/50 space-y-4 print:space-y-3 print:pt-5 print:mt-5"');
                
  // Fix Approval History spacing
  c = c.replace(/className="space-y-4 print:space-y-2 pt-4 print:pt-2 border-t border-border\/50"/g, 
                'className="space-y-4 print:space-y-3 pt-4 print:pt-5 print:mt-5 border-t border-border/50"');

  fs.writeFileSync(f, c);
});
