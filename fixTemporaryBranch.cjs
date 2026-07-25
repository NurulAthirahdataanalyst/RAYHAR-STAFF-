const fs = require('fs');

try {
  let fileContent = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');
  
  const startMarker = '{/* Temporary Branch Assignments Summary */}';
  const endMarker = '          {/* HOD & Branch Leader LIVE CARDS (Only show for these roles, under Branch Distribution) */}';
  
  const startIndex = fileContent.indexOf(startMarker);
  const endIndex = fileContent.indexOf(endMarker);
  
  if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find markers!");
    process.exit(1);
  }
  
  const replacement = `{/* Temporary Branch Assignments Summary */}
          <Card className={\`rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-card flex flex-col h-fit \${cardHoverEffect}\`}>
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <CardTitle className="text-[16px] font-semibold text-[#1A1F36] dark:text-gray-100">Temporary Branch Assignment</CardTitle>
                </div>
                <Link to="/branches?tab=temporary" className="text-[11px] font-bold text-[#4f46e5] hover:text-[#4338ca] transition-colors flex items-center group/link">
                  View All Assignments
                  <ChevronRight className="w-3 h-3 ml-0.5 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col">
              {/* Summary Stats */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                {(() => {
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  
                  const active = tempAssignments.filter(a => {
                    const start = new Date(a.start_date); start.setHours(0,0,0,0);
                    const end = new Date(a.end_date); end.setHours(23,59,59,999);
                    return a.status === 'Active' && today >= start && today <= end;
                  }).length;
                  
                  const upcoming = tempAssignments.filter(a => {
                    const start = new Date(a.start_date); start.setHours(0,0,0,0);
                    return a.status === 'Active' && today < start;
                  }).length;
                  
                  const completed = tempAssignments.filter(a => {
                    return a.status === 'Completed' || (a.status === 'Active' && new Date(a.end_date).setHours(23,59,59,999) < today.getTime());
                  }).length;

                  return (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Active</span>
                        </div>
                        <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{active}</span>
                        <span className="text-[11px] text-slate-500 mt-1 font-medium">Currently Active</span>
                      </div>
                      <div className="flex flex-col p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Completed</span>
                        </div>
                        <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{completed}</span>
                        <span className="text-[11px] text-slate-500 mt-1 font-medium">Past Assignments</span>
                      </div>
                      <div className="flex flex-col p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Upcoming</span>
                        </div>
                        <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{upcoming}</span>
                        <span className="text-[11px] text-slate-500 mt-1 font-medium">Starts Soon</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Table */}
              <div className="p-5 flex-1">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Recent Temporary Assignments</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="pb-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                        <th className="pb-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Original Branch</th>
                        <th className="pb-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Assigned Branch</th>
                        <th className="pb-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Duration</th>
                        <th className="pb-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {tempAssignments.slice(0, 3).map((a, i) => {
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const start = new Date(a.start_date); start.setHours(0,0,0,0);
                        const end = new Date(a.end_date); end.setHours(23,59,59,999);
                        
                        let sColor = "bg-gray-100 text-gray-700 border-gray-200";
                        let sDot = "bg-gray-500";
                        let sLabel = a.status;
                        
                        if (a.status === 'Completed' || (a.status === 'Active' && end < today)) {
                          sColor = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
                          sDot = "bg-blue-500";
                          sLabel = "Completed";
                        } else if (a.status === 'Active' && today >= start && today <= end) {
                          sColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
                          sDot = "bg-emerald-500";
                          sLabel = "Active";
                        } else if (a.status === 'Active' && today < start) {
                          sColor = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
                          sDot = "bg-amber-500";
                          sLabel = "Upcoming";
                        }
                        
                        const days = Math.round((new Date(a.end_date).getTime() - new Date(a.start_date).getTime()) / (1000 * 3600 * 24)) + 1;
                        const durationText = sLabel === 'Upcoming' ? \`Starts \${start.toLocaleString('default', { month: 'short' })}\` : (sLabel === 'Completed' ? 'Completed' : \`\${days} Days\`);

                        return (
                          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 pr-4 text-xs font-medium text-slate-900 dark:text-slate-100">{a.employee_name || a.full_name || 'N/A'}</td>
                            <td className="py-3 pr-4 text-xs text-slate-500">{a.original_branch || a.branch || 'N/A'}</td>
                            <td className="py-3 pr-4 text-xs font-medium text-slate-700 dark:text-slate-300">{a.assigned_branch || 'N/A'}</td>
                            <td className="py-3 pr-4 text-xs text-slate-500">{durationText}</td>
                            <td className="py-3">
                              <span className={\`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide \${sColor}\`}>
                                <span className={\`w-1.5 h-1.5 rounded-full \${sDot}\`}></span>
                                {sLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {tempAssignments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                            No temporary assignments found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

`;
  
  const newContent = fileContent.substring(0, startIndex) + replacement + fileContent.substring(endIndex);
  
  fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', newContent);
  console.log("Success!");
} catch (e) {
  console.error(e);
}
