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
  
  // 1. Target Labels (Titles): typically have text-[9px] or text-[10px] base and uppercase font-black
  // We want them to be print:text-[13px]
  c = c.replace(/text-\[9px\] print:text-\[12px\]/g, 'text-[9px] print:text-[13px]');
  c = c.replace(/text-\[8px\] print:text-\[12px\]/g, 'text-[8px] print:text-[13px]');
  c = c.replace(/text-\[10px\] print:text-\[12px\]/g, 'text-[10px] print:text-[13px]');
  
  // 2. Target Values (Data): typically have text-xs print:text-[13px]
  // We want them to be print:text-[11px]
  c = c.replace(/text-xs print:text-\[13px\]/g, 'text-xs print:text-[11px]');
  c = c.replace(/text-xs sm:text-sm print:text-\[13px\]/g, 'text-xs sm:text-sm print:text-[11px]');
  
  // 3. Status text specifically (if it has text-[#942392] or text-rose-600 font-black)
  c = c.replace(/<p className="font-black uppercase \$\{selectedRequest\.status/g, '<p className="font-black uppercase print:text-[11px] ${selectedRequest.status');
  c = c.replace(/<p className="font-black uppercase \$\{selectedForm\.status/g, '<p className="font-black uppercase print:text-[11px] ${selectedForm.status');

  fs.writeFileSync(f, c);
});
