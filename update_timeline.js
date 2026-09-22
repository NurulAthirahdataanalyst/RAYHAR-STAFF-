const fs = require('fs');

let content = fs.readFileSync('src/components/leave/ApprovalHistoryTimeline.tsx', 'utf8');
content = content.replace(/text-xs font-black uppercase tracking-\[0.2em\]/g, 'text-[13px] font-black uppercase tracking-[0.2em]');
content = content.replace(/text-\[10px\] font-black uppercase/g, 'text-[11px] font-black uppercase');
content = content.replace(/className="text-xs"/g, 'className="text-[13px]"');
content = content.replace(/text-xs font-black text-foreground tracking-tight/g, 'text-[13px] font-black text-foreground tracking-tight');
fs.writeFileSync('src/components/leave/ApprovalHistoryTimeline.tsx', content);
