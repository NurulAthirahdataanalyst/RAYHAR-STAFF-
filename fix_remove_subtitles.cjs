const fs = require('fs');
let c = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

// Remove ALL occurrences of the 3 subtitles
c = c.replace(/<div className="text-xs text-foreground mt-0\.5 italic">Live updates of employee clock-in and clock-out activities\.<\/div>/g, '');
c = c.replace(/<div className="text-xs text-foreground mt-0\.5 italic">Employees who reported late for the current workday\.<\/div>/g, '');
c = c.replace(/<div className="text-xs text-foreground mt-0\.5 italic">Current employees who are absent, on leave, or assigned outstation\.<\/div>/g, '');

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', c, 'utf8');
console.log('Done! Subtitles removed from Clock-In/Out, Late, and Absent/Leave/Outstation.');
