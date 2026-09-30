const fs = require('fs');
let c = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

c = c.replace(
  'const completed = currentOutstation.completedEvents ?? currentOutstation.completedTrips ?? 0;',
  'const completed = currentOutstation.completed ?? currentOutstation.completedEvents ?? currentOutstation.completedTrips ?? 0;'
);
c = c.replace(
  'const upcoming = currentOutstation.upcomingEvents ?? currentOutstation.upcomingTrips ?? 0;',
  'const upcoming = currentOutstation.upcoming ?? currentOutstation.upcomingEvents ?? currentOutstation.upcomingTrips ?? 0;'
);
c = c.replace(
  'const cancelled = currentOutstation.cancelledEvents ?? currentOutstation.cancelledTrips ?? 0;',
  'const cancelled = currentOutstation.cancelled ?? currentOutstation.cancelledEvents ?? currentOutstation.cancelledTrips ?? 0;'
);

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', c, 'utf8');
console.log('Fixed Outstation summary variables!');
