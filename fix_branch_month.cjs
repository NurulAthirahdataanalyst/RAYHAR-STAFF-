const fs = require('fs');
let c = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

const target = 
  '<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Branch Workforce Distribution</CardTitle>\n            <div className="text-xs text-foreground mt-0.5 italic">View workforce distribution across all company branches and regions.</div>';

const replacement = 
  '<div className="flex flex-col">\n              <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Branch Workforce Distribution</CardTitle>\n              <div className="text-xs text-foreground mt-0.5 italic">View workforce distribution across all company branches and regions.</div>\n            </div>';

if (c.includes(target)) {
  c = c.replace(target, replacement);
  fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', c, 'utf8');
  console.log('Fixed Branch Workforce Distribution layout (Month View)');
} else {
  console.log('Target not found.');
}
