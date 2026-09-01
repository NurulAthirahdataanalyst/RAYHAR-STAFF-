import re

with open(r'c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\Attendance.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

active_assignment_code = """            {/* Active Temporary Assignment Card */}
            <div className="border border-slate-100 dark:border-slate-700 bg-white dark:bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] hover:shadow-lg transition-shadow duration-300 p-5 sm:p-6 flex flex-col relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-foreground uppercase tracking-widest">
                  Active Temporary Assignment
                </h3>
              </div>
              
              {(() => {
                const now = new Date();
                now.setHours(0,0,0,0);
                
                const activeAssignment = tempAssignments.find(a => {
                  if (a.status !== 'Active') return false;
                  const startDate = new Date(a.start_date);
                  const endDate = a.end_date ? new Date(a.end_date) : new Date('2099-12-31');
                  return startDate <= now && endDate >= now;
                });

                const fmtDate = (dStr) => {
                  const d = new Date(dStr);
                  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
                };

                return (
                  <div className="flex flex-col gap-4 mt-2">
                    {activeAssignment ? (
                      <div className="overflow-x-auto rounded-lg border border-border/50">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-muted/50 border-b border-border/50">
                            <tr>
                              <th className="px-3 py-2 font-black uppercase text-[9px] tracking-wider text-muted-foreground">Branch</th>
                              <th className="px-3 py-2 font-black uppercase text-[9px] tracking-wider text-muted-foreground">Position</th>
                              <th className="px-3 py-2 font-black uppercase text-[9px] tracking-wider text-muted-foreground">Start Date</th>
                              <th className="px-3 py-2 font-black uppercase text-[9px] tracking-wider text-muted-foreground">End Date</th>
                              <th className="px-3 py-2 font-black uppercase text-[9px] tracking-wider text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            <tr className="bg-emerald-500/5">
                              <td className="px-3 py-2 font-medium">{activeAssignment.temp_branch || activeAssignment.location || 'N/A'}</td>
                              <td className="px-3 py-2 font-medium">-</td>
                              <td className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">{fmtDate(activeAssignment.start_date)}</td>
                              <td className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">{activeAssignment.end_date ? fmtDate(activeAssignment.end_date) : '-'}</td>
                              <td className="px-3 py-2 font-medium">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>ACTIVE</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-6 px-4 bg-muted/20 rounded-lg border border-border/50">
                        <p className="text-sm font-bold text-foreground mb-1">No Active Temporary Assignment</p>
                        <p className="text-xs text-muted-foreground">This employee currently has no active temporary branch assignment.</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>"""

temporary_history_code = """
      {/* Temporary History Box */}
      <div className="w-full pb-8">
        <Card className="border border-slate-100 dark:border-slate-700 bg-white dark:bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] overflow-hidden backdrop-blur-md">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 bg-muted/20 pb-4">
            <div>
              <CardTitle className="text-lg font-bold">Temporary History</CardTitle>
              <p className="text-xs font-bold text-foreground uppercase tracking-widest mt-1">View your temporary branch assignment history</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {(() => {
                const now = new Date();
                now.setHours(0,0,0,0);
                const processed = tempAssignments.map(a => {
                  const startDate = new Date(a.start_date);
                  const endDate = a.end_date ? new Date(a.end_date) : null;
                  let computed = a.status;
                  if (computed === 'Complete') computed = 'Completed';
                  else if (computed === 'Active') {
                    if (endDate && endDate < now) computed = 'Completed';
                    else if (startDate > now) computed = 'Upcoming';
                    else computed = 'Active';
                  }
                  return { ...a, computedStatus: computed };
                }).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

                const fmtDate = (dStr) => {
                  const d = new Date(dStr);
                  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
                };

                return (
                  <div className="p-4 sm:p-6">
                    {processed.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-border/50">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-muted/50 border-b border-border/50">
                            <tr>
                              <th className="px-4 py-3 font-black uppercase text-[10px] tracking-wider text-muted-foreground">Temporary Branch</th>
                              <th className="px-4 py-3 font-black uppercase text-[10px] tracking-wider text-muted-foreground">Assignment Period</th>
                              <th className="px-4 py-3 font-black uppercase text-[10px] tracking-wider text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {processed.map(a => (
                              <tr key={a.id} className={a.computedStatus === 'Active' ? 'bg-emerald-500/5' : 'hover:bg-muted/10'}>
                                <td className="px-4 py-3 font-medium">{a.temp_branch || a.location || 'N/A'}</td>
                                <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                                  {fmtDate(a.start_date)}{a.end_date ? ' – ' + fmtDate(a.end_date) : ''}
                                </td>
                                <td className="px-4 py-3 font-bold">
                                  {a.computedStatus === 'Active' ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>ACTIVE</span>
                                  ) : a.computedStatus === 'Upcoming' ? (
                                    <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"/>UPCOMING</span>
                                  ) : (
                                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"/>COMPLETED</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                          <History className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold">No temporary assignments found</p>
                      </div>
                    )}
                  </div>
                );
            })()}
          </CardContent>
        </Card>
      </div>
"""

temp_history_regex = r'\{\/\* Temporary History Card \*\/\}.*?(?=\<\/div\>\n\s*\<\/div\>\n\s*\<\/div\>\n\n\s*\{\/\* BOTTOM PANEL)'
outstation_modal_regex = r'\{\/\* Outstation Prompt Modal \*\/\}'

# 1. Replace the inner Temporary History card with the Active one
new_text = re.sub(temp_history_regex, active_assignment_code, text, flags=re.DOTALL)

# 2. Add History Card above the Modal
new_text = new_text.replace('{/* Outstation Prompt Modal */}', temporary_history_code + '\n      {/* Outstation Prompt Modal */}')

# 3. Import History icon from lucide-react if not imported
if 'History' not in new_text.split('lucide-react')[0]:
    new_text = new_text.replace('MapPin,', 'MapPin, History,')

with open(r'c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\Attendance.tsx', 'w', encoding='utf-8') as f:
    f.write(new_text)
