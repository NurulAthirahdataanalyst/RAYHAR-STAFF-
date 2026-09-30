const fs = require('fs');
let c = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

// =============================================
// STEP 1: Convert ALL existing day-view subtitles from plain to italic
// className="text-xs text-foreground mt-0.5"  →  add italic
// =============================================
c = c.replace(/className="text-xs text-foreground mt-0\.5"/g, 'className="text-xs text-foreground mt-0.5 italic"');
c = c.replace(/className="text-xs text-foreground mt-0\.5 mb-2"/g, 'className="text-xs text-foreground mt-0.5 mb-2 italic"');
// Also the page-level subtitle (text-sm)
c = c.replace(/<div className="text-sm text-foreground">Gain actionable insights into workforce performance and attendance behavior.<\/div>/, '<div className="text-sm text-foreground italic">Gain actionable insights into workforce performance and attendance behavior.</div>');

// =============================================
// STEP 2: Add subtitles to MONTH VIEW card titles
// =============================================

// Helper: replace a CardTitle or h3 with a subtitle injected right after the closing tag
// Pattern: inject after </CardTitle> or </h3> when the title text matches

// 1. Attendance Trend
c = c.replace(
  /<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Attendance Trend<\/CardTitle>/,
  `<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Attendance Trend</CardTitle>\n                <div className="text-xs text-foreground mt-0.5 italic">Track workforce attendance patterns and daily attendance performance over time.</div>`
);

// 2. Leave Utilization Trend vs. Previous Month
c = c.replace(
  /<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Utilization Trend vs\. Previous Month<\/CardTitle>/,
  `<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Utilization Trend vs. Previous Month</CardTitle>\n                 <div className="text-xs text-foreground mt-0.5 italic">Analyze leave usage trends and compare monthly leave patterns.</div>`
);

// 3. Monthly Comparison
c = c.replace(
  /<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Monthly Comparison<\/CardTitle>/,
  `<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Monthly Comparison</CardTitle>\n                 <div className="text-xs text-foreground mt-0.5 italic">Compare key workforce metrics against previous month performance.</div>`
);

// 4. Missing Punches — CardTitle version (line ~2617)
c = c.replace(
  /<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Missing Punches<\/CardTitle>/,
  `<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Missing Punches</CardTitle>\n                 <div className="text-xs text-foreground mt-0.5 italic">Monitor incomplete attendance records and repeated clock-in/out issues.</div>`
);

// 5. Department Workforce Distribution — h3 tag
c = c.replace(
  /<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Department Workforce Distribution<\/h3>/,
  `<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Department Workforce Distribution</h3>\n                  <div className="text-xs text-foreground mt-0.5 italic">View employee distribution across departments and operational teams.</div>`
);

// 6. Leave Distribution — h3 tag
c = c.replace(
  /<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Distribution<\/h3>/,
  `<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Leave Distribution</h3>\n                  <div className="text-xs text-foreground mt-0.5 italic">View employee leave usage breakdown by leave category.</div>`
);

// 7. Travel & Outstation Summary — CardTitle (the month-view one)
// It has 'Travel & Outstation Summary' text
c = c.replace(
  /<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Travel &amp; Outstation Summary<\/CardTitle>/,
  `<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Travel &amp; Outstation Summary</CardTitle>\n                <div className="text-xs text-foreground mt-0.5 italic">Track employee movement, travel status, and outstation activities.</div>`
);
// Also handle unescaped & version
c = c.replace(
  /<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Travel & Outstation Summary<\/CardTitle>/,
  `<CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Travel & Outstation Summary</CardTitle>\n                <div className="text-xs text-foreground mt-0.5 italic">Track employee movement, travel status, and outstation activities.</div>`
);

// 8. Workforce Movement — h3 tag
c = c.replace(
  /<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Workforce Movement<\/h3>/,
  `<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Workforce Movement</h3>\n                  <div className="text-xs text-foreground mt-0.5 italic">Monitor employee transfers, assignments, and workforce changes.</div>`
);

// =============================================
// STEP 3: Branch Workforce Distribution (month view) — h3 tag, different from day view which was CardTitle
// This targets the month-view h3 specifically
// =============================================
// The month view has an h3 for Branch Workforce Distribution
c = c.replace(
  /<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Branch Workforce Distribution<\/h3>/g,
  `<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Branch Workforce Distribution</h3>\n                  <div className="text-xs text-foreground mt-0.5 italic">Analyze workforce allocation across all branch locations.</div>`
);

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', c, 'utf8');
console.log('Done! All subtitles added and made italic.');
