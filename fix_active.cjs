const fs = require('fs');
let c = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

c = c.replace(
  '<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">\n                  <div className="flex items-center gap-2">\n                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Active Outstation</h3>\n                    <div className="text-xs text-foreground mt-0.5 italic">Employees currently assigned to outstation duties.</div>',
  '<div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">\n                  <div className="flex flex-col">\n                    <div className="flex items-center gap-2">\n                      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Active Outstation</h3>'
);

// We need to move the subtitle after the LIVE tag for Active Outstation
c = c.replace(
  ': <span className="text-[8px] text-foreground font-bold uppercase">Connecting.</span>}\n                  </div>',
  ': <span className="text-[8px] text-foreground font-bold uppercase">Connecting.</span>}\n                    </div>\n                    <div className="text-xs text-foreground mt-0.5 italic">Employees currently assigned to outstation duties.</div>\n                  </div>'
);

c = c.replace(
  'Connecting…</span>}\n                  </div>',
  'Connecting…</span>}\n                    </div>\n                    <div className="text-xs text-foreground mt-0.5 italic">Employees currently assigned to outstation duties.</div>\n                  </div>'
);

// Now for Pending Approvals
c = c.replace(
  '<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">\n              <div className="flex items-center gap-2">\n                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Pending Approvals</h3>\n                <div className="text-xs text-foreground mt-0.5 italic">Requests awaiting review and approval from authorized personnel.</div>',
  '<div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">\n              <div className="flex flex-col">\n                <div className="flex items-center gap-2">\n                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Pending Approvals</h3>'
);

c = c.replace(
  '<span className="px-1.5 py-0.5 text-[8px] font-black bg-amber-500 text-white rounded">{pendingApprovalsList.length}</span>\n                )}\n              </div>',
  '<span className="px-1.5 py-0.5 text-[8px] font-black bg-amber-500 text-white rounded">{pendingApprovalsList.length}</span>\n                )}\n                </div>\n                <div className="text-xs text-foreground mt-0.5 italic">Requests awaiting review and approval from authorized personnel.</div>\n              </div>'
);


fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', c, 'utf8');
console.log('Done!');
