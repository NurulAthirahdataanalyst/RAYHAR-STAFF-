const fs = require('fs');

const files = [
  'src/components/leave/LeaveDetailsModal.tsx',
  'src/pages/LeaveFormView.tsx',
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  
  // For LeaveFormView
  c = c.replace(/className="rounded-\[16px\] border border-border\/40 print:border-none print:bg-transparent p-4 font-bold text-foreground bg-muted\/10 text-sm leading-relaxed whitespace-pre-wrap break-words min-h-\[50px\] max-h-\[100px\] overflow-y-auto print:max-h-none print:overflow-visible print:p-2"/g, 
                'className="rounded-[16px] border border-border/40 print:border-none print:border-0 print:border-transparent print:bg-transparent p-4 font-bold text-foreground bg-muted/10 text-sm leading-relaxed whitespace-pre-wrap break-words min-h-[50px] max-h-[100px] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 print:pt-1"');
                
  // For LeaveDetailsModal
  c = c.replace(/className="rounded-\[16px\] border border-border\/40 p-4 font-bold text-foreground bg-muted\/10 text-sm leading-relaxed whitespace-pre-wrap break-words min-h-\[50px\]"/g, 
                'className="rounded-[16px] border border-border/40 print:border-none print:border-0 print:border-transparent print:bg-transparent p-4 font-bold text-foreground bg-muted/10 text-sm leading-relaxed whitespace-pre-wrap break-words min-h-[50px] print:p-0 print:pt-1"');

  fs.writeFileSync(f, c);
});
