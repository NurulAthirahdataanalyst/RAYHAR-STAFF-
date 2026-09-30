const fs = require('fs');
let c = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

// Fix Leave Distribution header — change items-center to items-start on inner flex
c = c.replace(
  '<div className="flex items-center gap-2">\n                  <FileText className="w-4 h-4 text-foreground" />\n                  <div className="flex flex-col">\n                   <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Distribution</h3>\n                   <div className="text-xs text-foreground mt-0.5 italic">View employee leave usage breakdown by leave category.</div>\n                 </div>\n                </div>',
  '<div className="flex items-start gap-2">\n                  <FileText className="w-4 h-4 text-foreground mt-0.5 shrink-0" />\n                  <div className="flex flex-col">\n                   <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Distribution</h3>\n                   <div className="text-xs text-foreground mt-0.5 italic">View employee leave usage breakdown by leave category.</div>\n                 </div>\n                </div>'
);

// Fix Workforce Movement header — same fix
c = c.replace(
  '<div className="flex items-center gap-2">\n                  <Users className="w-4 h-4 text-foreground" />\n                  <div className="flex flex-col">\n                   <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Workforce Movement</h3>\n                   <div className="text-xs text-foreground mt-0.5 italic">Monitor employee transfers, assignments, and workforce changes.</div>\n                 </div>\n                </div>',
  '<div className="flex items-start gap-2">\n                  <Users className="w-4 h-4 text-foreground mt-0.5 shrink-0" />\n                  <div className="flex flex-col">\n                   <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Workforce Movement</h3>\n                   <div className="text-xs text-foreground mt-0.5 italic">Monitor employee transfers, assignments, and workforce changes.</div>\n                 </div>\n                </div>'
);

// Also fix parent div from items-center to items-start for Leave Distribution
c = c.replace(
  '<div className="flex justify-between items-center mb-2 border-b border-slate-100 dark:border-slate-800 pb-3">',
  '<div className="flex justify-between items-start mb-2 border-b border-slate-100 dark:border-slate-800 pb-3">'
);

// Also fix parent for Workforce Movement
c = c.replace(
  '<div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">\n                <div className="flex items-start gap-2">',
  '<div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">\n                <div className="flex items-start gap-2">'
);

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', c, 'utf8');
console.log('Done! Month view headers fixed.');
