const fs = require('fs');
let content = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

const oldDonutData = `  const donutData = [
    { name: 'On Time', value: onTimeCount },
    { name: 'Late', value: data.teamAvailability.late },
    { name: 'On Leave', value: data.teamAvailability.onLeave },
    { name: 'Absent', value: data.teamAvailability.absent },
  ];`;

const newDonutData = `  const donutData = [
    { name: 'On Time', value: onTimeCount },
    { name: 'Late', value: data.teamAvailability.late },
    { name: 'On Leave', value: data.teamAvailability.onLeave },
    { name: 'Absent', value: data.teamAvailability.absent },
    { name: 'Comp Leave', value: data.teamAvailability.companyLeave || 0 },
    { name: 'Outstation', value: data.topKpi?.outstationToday || 0 },
  ];`;

content = content.replace(oldDonutData, newDonutData);

const oldGrid = `className="grid grid-cols-4 gap-2 w-full mt-auto mb-4"`;
const newGrid = `className="grid grid-cols-3 gap-2 w-full mt-auto mb-4"`;

content = content.replace(oldGrid, newGrid);

const oldTotalTeam = `const totalTeam = availableToday + data.teamAvailability.onLeave + data.teamAvailability.absent;`;
const newTotalTeam = `const totalTeam = availableToday + data.teamAvailability.onLeave + data.teamAvailability.absent + (data.teamAvailability.companyLeave || 0) + (data.topKpi?.outstationToday || 0);`;

content = content.replace(oldTotalTeam, newTotalTeam);

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', content, 'utf8');
console.log('WorkforceInsights.tsx updated with 6-item donutData and 3-col grid');
