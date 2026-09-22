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
  
  // Revert headers
  c = c.replace(/text-4xl font-black/g, 'text-2xl print:text-4xl font-black');
  c = c.replace(/text-xs font-black tracking-\[0.3em\]/g, 'text-[10px] print:text-xs font-black tracking-[0.2em] print:tracking-[0.3em]');
  
  // Revert body sizes to use print: prefix
  c = c.replace(/text-\[11px\](?! font-black uppercase)/g, 'text-[9px] print:text-[11px]');
  c = c.replace(/text-\[10px\](?! print:)(?! font-black uppercase)/g, 'text-[8px] print:text-[10px]');
  c = c.replace(/text-\[13px\] font-bold/g, 'text-xs print:text-[13px] font-bold');
  c = c.replace(/text-\[12px\] font-bold/g, 'text-[10px] print:text-[12px] font-bold');
  c = c.replace(/text-\[12px\] font-black/g, 'text-[10px] print:text-[12px] font-black');

  // Timeline specific
  c = c.replace(/text-\[13px\] font-black uppercase/g, 'text-xs print:text-[13px] font-black uppercase');
  c = c.replace(/text-\[11px\] font-black uppercase/g, 'text-[10px] print:text-[11px] font-black uppercase');
  c = c.replace(/className="text-\[13px\]"/g, 'className="text-xs print:text-[13px]"');
  c = c.replace(/text-\[13px\] font-black text-foreground/g, 'text-xs print:text-[13px] font-black text-foreground');

  fs.writeFileSync(f, c);
});
