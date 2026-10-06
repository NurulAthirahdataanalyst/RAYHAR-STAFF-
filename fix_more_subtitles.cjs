const fs = require('fs');
let c = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

// Fix Active Outstation day view layout
c = c.replace(
  '<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">\n                  <div className="flex items-center gap-2">\n                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Active Outstation</h3>\n                    <div className="text-xs text-foreground mt-0.5 italic">Employees currently assigned to outstation duties.</div>',
  '<div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">\n                  <div className="flex flex-col">\n                    <div className="flex items-center gap-2">\n                      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Active Outstation</h3>'
);

// We need to move the subtitle after the LIVE tag, so we actually just need to rewrite the inner part.
// Let's do it cleanly using a regex that captures the LIVE tag part.
