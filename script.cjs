const fs = require('fs');
let c = fs.readFileSync('src/pages/LeaveAnalytics.tsx', 'utf8');

// 1. Add dynamic title variables at the top of the render (before return)
const varInjection = \
  const formatMonthYear = (date) => {
    if (!date) return "";
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };
  const dynamicMonthLabel = formatMonthYear(selectedMonthYear);
  const trendTitle = viewType === "year" 
    ? \\\Leave Trend Over Time (\)\\\
    : \\\Leave Trend Over Time (\)\\\;
  const trendSubtitle = viewType === "year"
    ? \\\Track monthly leave request trends throughout \.\\\
    : \\\Track leave request trends throughout \.\\\;
  const seasonalityTitle = viewType === "year" 
    ? \\\Leave Seasonality (\)\\\
    : \\\Leave Seasonality (\)\\\;
  const seasonalitySubtitle = viewType === "year"
    ? \\\Analyze monthly leave seasonality and approval patterns throughout \.\\\
    : \\\Analyze leave status distribution during \.\\\;
\;

c = c.replace(
  'return (\\n    <div className="space-y-4">',
  varInjection + '\\n  return (\\n    <div className="space-y-4">'
);

// 2. Replace Leave Trend Over Time
c = c.replace(
  /<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Trend Over Time \(\{[^}]+\}\)<\/h3>\s*<\/div>/g,
  \<div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{trendTitle}</h3>
              <div className="text-xs text-foreground mt-0.5 italic">{trendSubtitle}</div>
            </div>\
);

// 3. Replace Leave Seasonality (by Month)
c = c.replace(
  /<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Seasonality \(by Month\)<\/h3>\s*<\/div>/g,
  \<div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{seasonalityTitle}</h3>
              <div className="text-xs text-foreground mt-0.5 italic">{seasonalitySubtitle}</div>
            </div>\
);

// 4. Replace Leave Type Breakdown
c = c.replace(
  /<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Type Breakdown<\/h3>\s*<\/div>/g,
  \<div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Type Breakdown</h3>
              <div className="text-xs text-foreground mt-0.5 italic">View leave requests distribution by leave category and usage pattern.</div>
            </div>\
);

// 5. Replace Top Growing Type
c = c.replace(
  /<p className="text-\[10px\] text-foreground dark:text-foreground uppercase tracking-wide font-semibold">Top Growing Type<\/p>\s*<p className="text-sm font-bold text-emerald-600">\{typeDistribution\[0\]\?\.name \|\| "N\/A"\}<\/p>\s*<\/div>/g,
  \<div className="flex flex-col">
              <p className="text-[10px] text-foreground dark:text-foreground uppercase tracking-wide font-semibold">Top Growing Type</p>
              <div className="text-[10px] text-foreground mt-0.5 mb-1 italic">Identify leave categories with the highest increase compared to previous month.</div>
              <p className="text-sm font-bold text-emerald-600">{typeDistribution[0]?.name || "N/A"}</p>
            </div>\
);

// 6. Replace Leave Request By Branch
c = c.replace(
  /<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Request By Branch<\/h3>\s*<p className="text-\[11px\] text-slate-500 dark:text-slate-400 mt-0\.5">Total Application<\/p>/g,
  \<div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Request By Branch</h3>
              <div className="text-xs text-foreground mt-0.5 italic">Compare leave application volume across different branch locations.</div>
            </div>\
);

// 7. Replace Leave Balance Risk
c = c.replace(
  /<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Balance Risk<\/h3>\s*<\/div>/g,
  \<div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Balance Risk</h3>
              <div className="text-xs text-foreground mt-0.5 italic">Monitor employee leave balance levels and identify potential risks.</div>
            </div>\
);

// 8. Replace Upcoming Approved Leave (Forecast)
c = c.replace(
  /<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Upcoming Approved Leave <span className="text-\[9px\] font-normal text-foreground">\(Forecast\)<\/span><\/h3>\s*<\/div>/g,
  \<div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Upcoming Approved Leave <span className="text-[9px] font-normal text-foreground">(Forecast)</span></h3>
              <div className="text-xs text-foreground mt-0.5 italic">Preview upcoming employee leave schedules and workforce availability.</div>
            </div>\
);

// 9. Replace Action Center
c = c.replace(
  /<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Action Center<\/h3>\s*<\/div>/g,
  \<div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Action Center</h3>
              <div className="text-xs text-foreground mt-0.5 italic">Manage pending tasks and important leave-related actions.</div>
            </div>\
);

// 10. Replace HR Insights
c = c.replace(
  /<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-3 flex items-center gap-2">\s*<Sparkles className="w-4 h-4 text-purple-500" \/>\s*HR Insights\s*<\/h3>/g,
  \<div className="flex flex-col mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                HR Insights
              </h3>
              <div className="text-xs text-foreground mt-0.5 italic">Discover key leave patterns and workforce availability insights.</div>
            </div>\
);

fs.writeFileSync('src/pages/LeaveAnalytics.tsx', c, 'utf8');
console.log('Done mapping subtitles!');
