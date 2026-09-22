const fs = require('fs');

const files = [
  'src/pages/LeaveFormView.tsx',
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  
  c = c.replace(/className="pt-4 border-t border-border\/50 space-y-4 print:space-y-3 print:pt-5 print:mt-5"/g, 
                'className="pt-4 border-t border-border/50 print:border-none space-y-4 print:space-y-3 print:pt-5 print:mt-5"');
                
  c = c.replace(/className="space-y-4 print:space-y-3 pt-4 print:pt-5 print:mt-5 border-t border-border\/50"/g, 
                'className="space-y-4 print:space-y-3 pt-4 print:pt-5 print:mt-5 border-t border-border/50 print:border-none"');

  fs.writeFileSync(f, c);
});
