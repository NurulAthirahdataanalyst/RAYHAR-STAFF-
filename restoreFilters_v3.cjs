const fs = require('fs');
const path = require('path');

const targetFiles = [
  "src/pages/Attendance.tsx",
  "src/pages/Calendar.tsx",
  "src/pages/LeaveAnalytics.tsx",
  "src/pages/LeaveFormView.tsx",
  "src/pages/LeaveOverview.tsx",
  "src/pages/TeamAttendance.tsx",
  "src/pages/hr-analytics/AttendanceDashboard.tsx",
  "src/pages/hr-analytics/WorkforceInsights.tsx",
  "src/pages/outstation/OutstationReports.tsx",
  "src/pages/reports/AttendanceReports.tsx",
  "src/pages/reports/DepartmentReports.tsx",
  "src/pages/reports/LeaveReports.tsx"
];

const injectPoints = {
  "src/pages/Attendance.tsx": [/<div className="relative z-10 w-full max-w-7xl mx-auto pb-8">\s*<Card/, (f, m) => `<div className="relative z-10 w-full max-w-7xl mx-auto pb-8">${f}\n\n        <Card`],
  "src/pages/Calendar.tsx": [/<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">/, (f, m) => `${f}\n\n      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">`],
  "src/pages/LeaveAnalytics.tsx": [/<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-4">/, (f, m) => `${f}\n      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-4">`],
  "src/pages/LeaveFormView.tsx": [/<div className="grid grid-cols-1 md:grid-cols-3 gap-6">/, (f, m) => `${f}\n      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">`],
  "src/pages/LeaveOverview.tsx": [/<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">/, (f, m) => `${f}\n      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">`],
  "src/pages/TeamAttendance.tsx": [/<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">/, (f, m) => `${f}\n      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">`],
  "src/pages/hr-analytics/AttendanceDashboard.tsx": [/<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">/, (f, m) => `${f}\n      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">`],
  "src/pages/hr-analytics/WorkforceInsights.tsx": [/<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">/, (f, m) => `${f}\n      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">`],
  "src/pages/outstation/OutstationReports.tsx": [/<div className="grid grid-cols-2 md:grid-cols-5 gap-4">/, (f, m) => `${f}\n      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">`],
  "src/pages/reports/AttendanceReports.tsx": [/<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">/, (f, m) => `${f}\n      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">`],
  "src/pages/reports/DepartmentReports.tsx": [/<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">/, (f, m) => `${f}\n      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">`],
  "src/pages/reports/LeaveReports.tsx": [/<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">/, (f, m) => `${f}\n      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">`]
};

let filesChanged = 0;

targetFiles.forEach(file => {
  const oldPath = path.join('_temp_old_pages', file);
  const currentPath = file;
  
  if (!fs.existsSync(oldPath) || !fs.existsSync(currentPath)) {
    console.log(`Skipping ${file} - not found`);
    return;
  }
  
  const oldContent = fs.readFileSync(oldPath, 'utf8');
  let currentContent = fs.readFileSync(currentPath, 'utf8');
  
  const paMatch = oldContent.match(/<PageActions>([\s\S]*?)<\/PageActions>/);
  if (!paMatch) return;
  
  let innerContent = paMatch[1];
  
  const primaryButtonRegex = /<Button[^>]*>[\s\S]*?(?:New Assignment|Apply for Leave|Apply Leave|Add Leave|Create|New Request|Add Holiday|Create Account)[\s\S]*?<\/Button>/g;
  let remainingControls = innerContent;
  let match;
  while ((match = primaryButtonRegex.exec(innerContent)) !== null) {
    remainingControls = remainingControls.replace(match[0], '');
  }
  const primaryLinkRegex = /<Link[^>]*>\s*<Button[^>]*>[\s\S]*?(?:New Assignment|Apply for Leave|Apply Leave|Add Leave|Create|New Request|Add Holiday|Create Account)[\s\S]*?<\/Button>\s*<\/Link>/g;
  while ((match = primaryLinkRegex.exec(remainingControls)) !== null) {
    remainingControls = remainingControls.replace(match[0], '');
  }
  
  const innerDivMatch = remainingControls.match(/^\s*<div className="flex[^>]*>([\s\S]*?)<\/div>\s*$/);
  if (innerDivMatch) {
    remainingControls = innerDivMatch[1];
  }
  
  remainingControls = remainingControls.trim();
  
  if (remainingControls.length < 10) return;
  
  const filtersHtml = `\n      <div className="mb-4">\n        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">\n          ${remainingControls}\n        </div>\n      </div>\n`;
  
  let newContent = currentContent;
  
  // Find where export default function starts
  const mainFuncIdx = currentContent.indexOf('export default function');
  if (mainFuncIdx !== -1) {
    const mainFuncContent = currentContent.substring(mainFuncIdx);
    const returnIdx = mainFuncContent.indexOf('return (');
    if (returnIdx !== -1) {
      const beforeReturn = currentContent.substring(0, mainFuncIdx + returnIdx);
      let afterReturn = mainFuncContent.substring(returnIdx);
      
      const [regex, replacer] = injectPoints[file] || [];
      if (regex) {
        afterReturn = afterReturn.replace(regex, (m) => replacer(filtersHtml, m));
        newContent = beforeReturn + afterReturn;
      }
    }
  }
  
  if (newContent !== currentContent) {
    fs.writeFileSync(currentPath, newContent);
    filesChanged++;
    console.log(`Restored filters for ${file}`);
  } else {
    console.log(`Failed to inject into ${file}`);
  }
});

console.log(`Updated ${filesChanged} files`);
