const fs = require('fs');

const files = [
  'src/pages/LeaveFormView.tsx',
  'src/components/leave/LeaveDetailsModal.tsx',
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  
  // 1. Put back the horizontal separators for Maklumat Waris and Approval History
  // In LeaveFormView
  c = c.replace(/className="pt-4 border-t border-border\/50 print:border-none space-y-4 print:space-y-3 print:pt-5 print:mt-5"/g, 
                'className="pt-4 border-t border-border/50 space-y-4 print:space-y-3 print:pt-5 print:mt-5"');
                
  c = c.replace(/className="space-y-4 print:space-y-3 pt-4 print:pt-5 print:mt-5 border-t border-border\/50 print:border-none"/g, 
                'className="space-y-4 print:space-y-3 pt-4 print:pt-5 print:mt-5 border-t border-border/50"');

  // In LeaveDetailsModal (it didn't have print:border-none added to these specific lines anyway, but just in case)
  
  // 2. Remove any possible border/outline on the Maklumat Waris grid box
  // LeaveFormView
  c = c.replace(/className="grid grid-cols-2 gap-4 print:gap-y-6 print:gap-x-8 bg-muted\/20 print:bg-transparent print:border-none p-4 print:p-5 print:px-0 rounded-\[20px\]"/g, 
                'className="grid grid-cols-2 gap-4 print:gap-y-6 print:gap-x-8 bg-muted/20 print:bg-transparent print:border-none print:border-0 print:border-transparent print:outline-none print:shadow-none p-4 print:p-5 print:px-0 rounded-[20px]"');
                
  // LeaveDetailsModal
  c = c.replace(/className="grid grid-cols-2 gap-4 print:gap-y-6 print:gap-x-8 bg-muted\/20 print:bg-transparent print:border-none p-4 print:px-0 rounded-\[20px\]"/g, 
                'className="grid grid-cols-2 gap-4 print:gap-y-6 print:gap-x-8 bg-muted/20 print:bg-transparent print:border-none print:border-0 print:border-transparent print:outline-none print:shadow-none p-4 print:px-0 rounded-[20px]"');

  fs.writeFileSync(f, c);
});
