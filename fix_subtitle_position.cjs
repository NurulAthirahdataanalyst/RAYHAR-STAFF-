const fs = require('fs');
let c = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

// =============================================
// FIX 1: Remove Employee Distribution subtitle (line 762 area)
// =============================================
c = c.replace(
  `<div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">Employee Distribution</span>
                  <div className="text-xs text-foreground mt-0.5 italic">Overview of employee allocation across headquarters and branch locations.</div>
                </div>`,
  `<div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">Employee Distribution</span>
                </div>`
);

// =============================================
// FIX 2: Temporary Branch Assignment — move subtitle below title (not inline)
// Currently: flex items-center justify-between -> subtitle in middle
// Want: title on top, subtitle below it, link on the right of the title row
// =============================================
c = c.replace(
  `<div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Temporary Branch Assignment</CardTitle>
                <div className="text-xs text-foreground mt-0.5 italic">Monitor active, upcoming, and completed temporary branch assignments.</div>
                <Link to="/branches/temporary-assignments" className="text-[11px] font-bold text-[#942392] hover:text-[#7a1d78] transition-colors flex items-center group/link">
                  View All Assignments
                  <ChevronRight className="w-3 h-3 ml-0.5 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </div>`,
  `<div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Temporary Branch Assignment</CardTitle>
                  <div className="text-xs text-foreground mt-0.5 italic">Monitor active, upcoming, and completed temporary branch assignments.</div>
                </div>
                <Link to="/branches/temporary-assignments" className="text-[11px] font-bold text-[#942392] hover:text-[#7a1d78] transition-colors flex items-center group/link shrink-0">
                  View All Assignments
                  <ChevronRight className="w-3 h-3 ml-0.5 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </div>`
);

// =============================================
// FIX 3: All generic patterns — inline subtitle after CardTitle within flex row
// Pattern A: flex items-center justify-between wrapping CardTitle + subtitle div
// These are the ones where subtitle appears on same line as title in a flex-row
// We need to wrap title+subtitle in their own flex-col div
// =============================================

// Pattern: CardTitle immediately followed by subtitle div, both inside a "flex items-center" wrapper
// We'll do targeted replacements for each card

// Branch Workforce Distribution (day view — CardTitle + subtitle inline)
c = c.replace(
  `<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Branch Workforce Distribution</CardTitle>
                  <div className="text-xs text-foreground mt-0.5 italic">View workforce distribution across all company branches and regions.</div>`,
  `<div className="flex flex-col">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Branch Workforce Distribution</CardTitle>
                  <div className="text-xs text-foreground mt-0.5 italic">View workforce distribution across all company branches and regions.</div>
                </div>`
);

// Leave Monitoring card
c = c.replace(
  `<CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Leave Monitoring</CardTitle>
              <div className="text-xs text-foreground mt-0.5 italic">Track leave requests, approvals, and employee leave status.</div>`,
  `<div className="flex flex-col">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Leave Monitoring</CardTitle>
              <div className="text-xs text-foreground mt-0.5 italic">Track leave requests, approvals, and employee leave status.</div>
            </div>`
);

// Clock-In/Out
c = c.replace(
  `<CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Clock-In/Out</CardTitle>
                <div className="text-xs text-foreground mt-0.5 italic">Live updates of employee clock-in and clock-out activities.</div>`,
  `<div className="flex flex-col">
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Clock-In/Out</CardTitle>
                <div className="text-xs text-foreground mt-0.5 italic">Live updates of employee clock-in and clock-out activities.</div>
              </div>`
);

// Top Performer (day view)
c = c.replace(
  `<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Top Performer</CardTitle>
                    <div className="text-xs text-foreground mt-0.5 italic">Recognize employees with outstanding attendance performance.</div>`,
  `<div className="flex flex-col">
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Top Performer</CardTitle>
                    <div className="text-xs text-foreground mt-0.5 italic">Recognize employees with outstanding attendance performance.</div>
                  </div>`
);

// Team Availability (CardDescription is already below since it's inside CardHeader flex-col, but let's handle inline subtitle)
// The Team Availability subtitle is CardDescription — already on new line, skip.

// Pending Approvals
c = c.replace(
  `<CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Pending Approvals</CardTitle>
                <div className="text-xs text-foreground mt-0.5 italic">Requests awaiting review and approval from authorized personnel.</div>`,
  `<div className="flex flex-col">
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Pending Approvals</CardTitle>
                <div className="text-xs text-foreground mt-0.5 italic">Requests awaiting review and approval from authorized personnel.</div>
              </div>`
);

// Active Outstation
c = c.replace(
  `<CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Active Outstation</CardTitle>
                    <div className="text-xs text-foreground mt-0.5 italic">Employees currently assigned to outstation duties.</div>`,
  `<div className="flex flex-col">
                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Active Outstation</CardTitle>
                    <div className="text-xs text-foreground mt-0.5 italic">Employees currently assigned to outstation duties.</div>
                  </div>`
);

// Month view cards — Attendance Trend
c = c.replace(
  `<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Attendance Trend</CardTitle>
                <div className="text-xs text-foreground mt-0.5 italic">Track workforce attendance patterns and daily attendance performance over time.</div>`,
  `<div className="flex flex-col">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Attendance Trend</CardTitle>
                <div className="text-xs text-foreground mt-0.5 italic">Track workforce attendance patterns and daily attendance performance over time.</div>
              </div>`
);

// Leave Utilization Trend vs. Previous Month
c = c.replace(
  `<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Utilization Trend vs. Previous Month</CardTitle>
                 <div className="text-xs text-foreground mt-0.5 italic">Analyze leave usage trends and compare monthly leave patterns.</div>`,
  `<div className="flex flex-col">
                 <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Utilization Trend vs. Previous Month</CardTitle>
                 <div className="text-xs text-foreground mt-0.5 italic">Analyze leave usage trends and compare monthly leave patterns.</div>
               </div>`
);

// Monthly Comparison
c = c.replace(
  `<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Monthly Comparison</CardTitle>
                 <div className="text-xs text-foreground mt-0.5 italic">Compare key workforce metrics against previous month performance.</div>`,
  `<div className="flex flex-col">
                 <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Monthly Comparison</CardTitle>
                 <div className="text-xs text-foreground mt-0.5 italic">Compare key workforce metrics against previous month performance.</div>
               </div>`
);

// Missing Punches
c = c.replace(
  `<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Missing Punches</CardTitle>
                 <div className="text-xs text-foreground mt-0.5 italic">Monitor incomplete attendance records and repeated clock-in/out issues.</div>`,
  `<div className="flex flex-col">
                 <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Missing Punches</CardTitle>
                 <div className="text-xs text-foreground mt-0.5 italic">Monitor incomplete attendance records and repeated clock-in/out issues.</div>
               </div>`
);

// Travel & Outstation Summary (month view)
c = c.replace(
  `<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Travel & Outstation Summary</CardTitle>
                <div className="text-xs text-foreground mt-0.5 italic">Track employee movement, travel status, and outstation activities.</div>`,
  `<div className="flex flex-col">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Travel & Outstation Summary</CardTitle>
                <div className="text-xs text-foreground mt-0.5 italic">Track employee movement, travel status, and outstation activities.</div>
              </div>`
);

// h3 tags — Department Workforce Distribution
c = c.replace(
  `<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Department Workforce Distribution</h3>
                  <div className="text-xs text-foreground mt-0.5 italic">View employee distribution across departments and operational teams.</div>`,
  `<div className="flex flex-col">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Department Workforce Distribution</h3>
                  <div className="text-xs text-foreground mt-0.5 italic">View employee distribution across departments and operational teams.</div>
                </div>`
);

// h3 — Branch Workforce Distribution (month view)
c = c.replace(
  `<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Branch Workforce Distribution</h3>
                  <div className="text-xs text-foreground mt-0.5 italic">Analyze workforce allocation across all branch locations.</div>`,
  `<div className="flex flex-col">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Branch Workforce Distribution</h3>
                  <div className="text-xs text-foreground mt-0.5 italic">Analyze workforce allocation across all branch locations.</div>
                </div>`
);

// h3 — Leave Distribution
c = c.replace(
  `<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Distribution</h3>
                  <div className="text-xs text-foreground mt-0.5 italic">View employee leave usage breakdown by leave category.</div>`,
  `<div className="flex flex-col">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Distribution</h3>
                  <div className="text-xs text-foreground mt-0.5 italic">View employee leave usage breakdown by leave category.</div>
                </div>`
);

// h3 — Workforce Movement
c = c.replace(
  `<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Workforce Movement</h3>
                  <div className="text-xs text-foreground mt-0.5 italic">Monitor employee transfers, assignments, and workforce changes.</div>`,
  `<div className="flex flex-col">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Workforce Movement</h3>
                  <div className="text-xs text-foreground mt-0.5 italic">Monitor employee transfers, assignments, and workforce changes.</div>
                </div>`
);

// Employee Performance & Attendance (day view)
c = c.replace(
  `<CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Employee Performance &amp; Attendance</CardTitle>
              <div className="text-xs text-foreground mt-0.5 italic">Monitor attendance trends and identify top and low-performing employees.</div>`,
  `<div className="flex flex-col">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Employee Performance &amp; Attendance</CardTitle>
              <div className="text-xs text-foreground mt-0.5 italic">Monitor attendance trends and identify top and low-performing employees.</div>
            </div>`
);
// Also unescaped version
c = c.replace(
  `<CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Employee Performance & Attendance</CardTitle>
              <div className="text-xs text-foreground mt-0.5 italic">Monitor attendance trends and identify top and low-performing employees.</div>`,
  `<div className="flex flex-col">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Employee Performance & Attendance</CardTitle>
              <div className="text-xs text-foreground mt-0.5 italic">Monitor attendance trends and identify top and low-performing employees.</div>
            </div>`
);

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', c, 'utf8');
console.log('Done! Subtitles moved below titles.');
