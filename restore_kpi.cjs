const fs = require('fs');
let content = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

content = content.replace(
  'grid-cols-2 sm:grid-cols-3 gap-3',
  'grid-cols-1 sm:grid-cols-2 gap-4'
);

content = content.replaceAll('className="p-3 sm:p-4 flex items-center gap-3 h-full w-full"', 'className="p-5 flex items-center gap-4 h-full w-full"');
content = content.replaceAll('w-8 h-8 sm:w-10 sm:h-10 rounded-lg', 'w-10 h-10 rounded-lg');
content = content.replaceAll('w-4 h-4 sm:w-5 sm:h-5', 'w-5 h-5');
content = content.replaceAll('text-[9px] sm:text-[10px] font-bold', 'text-[10px] font-bold');
content = content.replaceAll('text-lg sm:text-xl font-bold text-slate-800 leading-tight mt-0.5', 'text-xl font-bold text-slate-800 leading-tight mt-1');

// Let's also fix the Haji Umrah issue in the department chart data
const oldChartLogic = "const departmentChartData = (data.departmentMetrics || []).filter((d: any) => d.name && d.name.toLowerCase() !== 'unassigned');";
const newChartLogic = `const departmentChartData = (data.departmentMetrics || [])
    .filter((d: any) => d.name && d.name.toLowerCase() !== 'unassigned')
    .map((d: any) => ({
      ...d,
      name: (d.name.toLowerCase().includes('haji') && d.name.toLowerCase().includes('umrah')) ? 'HAJI UMRAH (BHU)' : d.name
    }));`;

content = content.replace(oldChartLogic, newChartLogic);

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', content, 'utf8');
console.log('WorkforceInsights.tsx updated');
