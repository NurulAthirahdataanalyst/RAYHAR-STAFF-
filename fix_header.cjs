const fs = require('fs');
let c = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

c = c.replace(/<div className="flex flex-col gap-1 mb-2">\\n          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Workforce Insight<\/h1>\\n          <div className="text-sm text-foreground">Gain actionable insights into workforce performance and attendance behavior.<\/div>\\n        <\/div>\\n\\n        {\/\* Filter Toolbar Line directly under main header \*\/}/g, '<div className="flex flex-col gap-1 mb-2">\n          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Workforce Insight</h1>\n          <div className="text-sm text-foreground">Gain actionable insights into workforce performance and attendance behavior.</div>\n        </div>\n\n        {/* Filter Toolbar Line directly under main header */}');

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', c, 'utf8');
