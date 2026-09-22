const fs = require('fs');

let content = fs.readFileSync('src/components/leave/ApprovalHistoryTimeline.tsx', 'utf8');
content = content.replace(/text-xs font-black uppercase tracking-\[0.2em\]/g, 'text-[13px] font-black uppercase tracking-[0.2em]');
content = content.replace(/text-\[10px\] font-black uppercase/g, 'text-[11px] font-black uppercase');
content = content.replace(/className="text-xs"/g, 'className="text-[13px]"');
content = content.replace(/text-xs font-black text-foreground tracking-tight/g, 'text-[13px] font-black text-foreground tracking-tight');
fs.writeFileSync('src/components/leave/ApprovalHistoryTimeline.tsx', content);

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
  c = c.replace(/text-\[9px\]/g, 'text-[11px]');
  c = c.replace(/text-\[8px\]/g, 'text-[10px]');
  c = c.replace(/text-xs font-bold/g, 'text-[13px] font-bold');
  c = c.replace(/text-\[11px\] font-bold/g, 'text-[13px] font-bold');
  c = c.replace(/text-\[10px\] font-bold/g, 'text-[12px] font-bold');
  c = c.replace(/text-\[10px\] font-black/g, 'text-[12px] font-black');
  fs.writeFileSync(f, c);
});
