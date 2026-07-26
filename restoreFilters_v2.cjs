const fs = require('fs');
const path = require('path');

const targetFiles = [
  "src/pages/Attendance.tsx",
  "src/pages/LeaveAnalytics.tsx"
];

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
  
  const filtersHtml = `\n      <div className="mb-4">\n        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">\n          ${remainingControls}\n        </div>\n      </div>\n`;
  
  let newContent = currentContent;
  
  if (file === "src/pages/Attendance.tsx") {
    newContent = currentContent.replace(/<div className="relative z-10 w-full max-w-7xl mx-auto pb-8">\s*<Card/, `<div className="relative z-10 w-full max-w-7xl mx-auto pb-8">${filtersHtml}\n\n        <Card`);
  } else if (file === "src/pages/LeaveAnalytics.tsx") {
    newContent = currentContent.replace(/<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-4">/, `${filtersHtml}\n      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-4">`);
  }
  
  if (newContent !== currentContent) {
    fs.writeFileSync(currentPath, newContent);
    filesChanged++;
    console.log(`Restored filters for ${file}`);
  }
});

console.log(`Updated ${filesChanged} files`);
