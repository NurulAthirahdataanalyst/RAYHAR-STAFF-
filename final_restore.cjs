const fs = require('fs');

function restoreFilters(file, oldFile, injectionGrid) {
  let content = fs.readFileSync(file, 'utf8');
  const oldContent = fs.readFileSync(oldFile, 'utf8');

  // get the old page actions
  const paMatch = oldContent.match(/<PageActions>([\s\S]*?)<\/PageActions>/);
  if (!paMatch) {
    console.log('No PageActions found in old file: ' + oldFile);
    return;
  }
  
  const filters = `<div className="mb-4">\n${paMatch[1]}\n      </div>\n\n`;
  
  // check if current file has PageActions (e.g. LeaveOverview)
  if (content.includes('<PageActions>')) {
    content = content.replace(/<PageActions>[\s\S]*?<\/PageActions>/, filters.trim());
    fs.writeFileSync(file, content);
    console.log('Restored using existing <PageActions> block for ' + file);
    return;
  }

  // otherwise inject before the grid
  if (content.includes(injectionGrid)) {
    content = content.replace(injectionGrid, filters + '      ' + injectionGrid);
    fs.writeFileSync(file, content);
    console.log('Restored by injecting before grid for ' + file);
  } else {
    console.log('Grid not found in ' + file + ': ' + injectionGrid);
  }
}

const targets = [
  { f: 'src/pages/LeaveOverview.tsx', g: 'grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 max-w-[960px]' },
  { f: 'src/pages/hr-analytics/AttendanceDashboard.tsx', g: '<div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">' },
  { f: 'src/pages/hr-analytics/WorkforceInsights.tsx', g: '<div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">' },
  { f: 'src/pages/outstation/OutstationReports.tsx', g: '<div className="grid grid-cols-2 md:grid-cols-5 gap-4">' },
  { f: 'src/pages/reports/AttendanceReports.tsx', g: '<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">' },
  { f: 'src/pages/reports/DepartmentReports.tsx', g: '<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">' },
  { f: 'src/pages/reports/LeaveReports.tsx', g: '<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">' }
];

targets.forEach(t => {
  restoreFilters(t.f, '_temp_old_pages/' + t.f, t.g);
});
