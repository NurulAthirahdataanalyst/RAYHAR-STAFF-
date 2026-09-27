import fs from 'fs';

let content = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

const firstStart = content.indexOf('<TooltipProvider>', content.indexOf('const branchEmployees = liveEmployees'));
const firstEnd = content.indexOf('</TooltipProvider>', firstStart) + '</TooltipProvider>'.length;

const secondStart = content.indexOf('{liveBranchRanking.map((branch: any, idx: number) => {', firstEnd);
const secondEnd = content.indexOf('</TooltipProvider>', secondStart);

let newInner = content.substring(secondStart, secondEnd);

newInner = newInner.replace(
  '{liveBranchRanking.map((branch: any, idx: number) => {',
  '{liveBranchRanking.filter((lb: any) => filteredBranches.some((fb: any) => fb.name === lb.branch)).map((branch: any, idx: number) => {'
);

const newFirstCard = '<TooltipProvider>\n' + newInner + '</TooltipProvider>';

content = content.substring(0, firstStart) + newFirstCard + content.substring(firstEnd);
fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', content);
console.log('Patched successfully!');
