const fs = require('fs');
let c = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

const target = 
  '<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">\n              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Upcoming Outstation</h3>\n              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded text-foreground flex items-center gap-1">';

const replacement = 
  '<div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">\n              <div className="flex flex-col">\n                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Upcoming Outstation</h3>\n                <div className="text-xs text-foreground mt-0.5 italic">View scheduled employee outstation assignments and details.</div>\n              </div>\n              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded text-foreground flex items-center gap-1 shrink-0">';

if (c.includes(target)) {
  c = c.replace(target, replacement);
  fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', c, 'utf8');
  console.log('Fixed Upcoming Outstation!');
} else {
  console.log('Target not found!');
}
