const fs = require('fs');

let content = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

// 1. Grid layout change
content = content.replace(
  'grid-cols-1 sm:grid-cols-2 gap-4',
  'grid-cols-2 sm:grid-cols-3 gap-3'
);

// 2. Add the two new KPI cards after KPI 4
const kpi4 = `            {/* KPI 4: On Leave Today */}
            <Card className={\`rounded-lg shadow-sm border-slate-200 bg-white flex \${cardHoverEffect}\`}>
              <CardContent className="p-5 flex items-center gap-4 h-full w-full">
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">On Leave Today</p>
                  <h3 className="text-xl font-bold text-slate-800 leading-tight mt-1">{data.topKpi.onLeaveToday}</h3>
                </div>
              </CardContent>
            </Card>`;

const newKpis = `            {/* KPI 4: On Leave Today */}
            <Card className={\`rounded-lg shadow-sm border-slate-200 bg-white flex \${cardHoverEffect}\`}>
              <CardContent className="p-3 sm:p-4 flex items-center gap-3 h-full w-full">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">On Leave</p>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight mt-0.5">{data.topKpi.onLeaveToday}</h3>
                </div>
              </CardContent>
            </Card>

            {/* KPI 5: Company Leave */}
            <Card className={\`rounded-lg shadow-sm border-slate-200 bg-white flex \${cardHoverEffect}\`}>
              <CardContent className="p-3 sm:p-4 flex items-center gap-3 h-full w-full">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Co. Leave</p>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight mt-0.5">{data.topKpi.companyLeaveToday || 0}</h3>
                </div>
              </CardContent>
            </Card>

            {/* KPI 6: Outstation */}
            <Card className={\`rounded-lg shadow-sm border-slate-200 bg-white flex opacity-80 \${cardHoverEffect}\`}>
              <CardContent className="p-3 sm:p-4 flex items-center gap-3 h-full w-full">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstation</p>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight mt-0.5">{data.topKpi.outstationToday || 0}</h3>
                </div>
              </CardContent>
            </Card>`;

content = content.replace(kpi4, newKpis);

// Make the existing 3 KPIs compact to fit 6
content = content.replace(
  'className="p-5 flex items-center gap-4 h-full w-full"',
  'className="p-3 sm:p-4 flex items-center gap-3 h-full w-full"'
);
content = content.replace(
  'className="p-5 flex items-center gap-4 h-full w-full"',
  'className="p-3 sm:p-4 flex items-center gap-3 h-full w-full"'
);
content = content.replace(
  'className="p-5 flex items-center gap-4 h-full w-full"',
  'className="p-3 sm:p-4 flex items-center gap-3 h-full w-full"'
);

// Reduce icon and text sizes in the original 3 KPIs
content = content.replaceAll('w-10 h-10 rounded-lg', 'w-8 h-8 sm:w-10 sm:h-10 rounded-lg');
content = content.replaceAll('w-5 h-5 text-blue-600', 'w-4 h-4 sm:w-5 sm:h-5 text-blue-600');
content = content.replaceAll('w-5 h-5 text-emerald-600', 'w-4 h-4 sm:w-5 sm:h-5 text-emerald-600');
content = content.replaceAll('w-5 h-5 text-indigo-600', 'w-4 h-4 sm:w-5 sm:h-5 text-indigo-600');
content = content.replaceAll('text-[10px] font-bold text-slate-400 uppercase', 'text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase');
content = content.replaceAll('text-xl font-bold text-slate-800 leading-tight mt-1', 'text-lg sm:text-xl font-bold text-slate-800 leading-tight mt-0.5');


// 3. Update the names in the lists
// Find {emp.full_name} and replace with {emp.full_name.toUpperCase()}
content = content.replaceAll('{emp.full_name}', '{emp.full_name.toUpperCase()}');

// Find the department text in Clock-In/Out, Late, Absent panels
// <p className="text-[10px] text-slate-400 font-medium">{emp.department !== '—' ? emp.department : emp.branch}</p>
const deptText = `<p className="text-[10px] text-slate-400 font-medium">{emp.department !== '—' ? emp.department : emp.branch}</p>`;
const newDeptText = `<p className="text-[10px] text-slate-400 font-medium">{(() => {
                        const d = emp.department && emp.department !== '—' ? emp.department : '';
                        const b = emp.branch && emp.branch !== '—' ? emp.branch : '';
                        if (d && b) return \`\${d} (\${b})\`;
                        if (d || b) return d || b;
                        return '—';
                      })()}</p>`;

content = content.replaceAll(deptText, newDeptText);

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', content, 'utf8');
console.log('WorkforceInsights.tsx updated successfully');
