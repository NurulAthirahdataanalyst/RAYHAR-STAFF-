const fs = require('fs');
const files = ['src/pages/LeaveAnalytics.tsx', 'src/pages/LeaveFormView.tsx', 'src/pages/LeaveOverview.tsx', 'src/pages/hr-analytics/AttendanceDashboard.tsx', 'src/pages/hr-analytics/WorkforceInsights.tsx', 'src/pages/outstation/OutstationReports.tsx', 'src/pages/reports/AttendanceReports.tsx', 'src/pages/reports/DepartmentReports.tsx', 'src/pages/reports/LeaveReports.tsx'];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const mainFuncIdx = content.indexOf('export default function');
  if (mainFuncIdx === -1) return;
  const after = content.substring(mainFuncIdx);
  // Find the VERY FIRST `return (` after the main function starts. But wait, LeaveAnalytics had it inside `if (roleLoading) return (`!
  // So instead, let's look for the first `<div className="space-y-4` or similar, which is the root wrapper!
  const rootWrapper = after.match(/<div[^>]*className=\"[^\"]*(?:space-y-4 animate-in|max-w-7xl mx-auto|relative z-10 w-full)[^\"]*\"[^>]*>/);
  if (rootWrapper) {
    const fromWrapper = after.substring(rootWrapper.index + rootWrapper[0].length);
    const gridMatch = fromWrapper.match(/<div[^>]*className=\"([^\"]*grid[^\"]*)\"/);
    if (gridMatch) {
      console.log(f + ': ' + gridMatch[1]);
    }
  } else {
    // maybe no wrapper? just find grid
    const gridMatch = after.match(/<div[^>]*className=\"([^\"]*grid[^\"]*)\"/);
    if (gridMatch) {
      console.log(f + ': ' + gridMatch[1] + ' (NO WRAPPER FOUND)');
    }
  }
});
