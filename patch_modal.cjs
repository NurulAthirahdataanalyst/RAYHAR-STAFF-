const fs = require('fs');

let content = fs.readFileSync('src/pages/Employees.tsx', 'utf8');

const startTag = '{/* Employee Details Modal */}';
const endTag = '      {/* LEAVE FORMS DIALOG */}';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find tags");
  process.exit(1);
}

const newModal = `{/* Employee Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl w-full overflow-y-auto max-h-[90vh] p-0 gap-0 bg-slate-50/50">
          <DialogHeader className="p-6 pb-4 border-b bg-white sticky top-0 z-10 shadow-sm">
            <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">Staff Profile & Analytics</DialogTitle>
          </DialogHeader>
          
          <div className="p-6">
            {selectedEmployee ? (
              <TooltipProvider>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: Bio & Info (4 cols) */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col items-center text-center">
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#7B0099] to-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-md shadow-[#7B0099]/20 mb-5 border-4 border-white">
                        {selectedEmployee.name.charAt(0)}
                      </div>
                      <h2 className="text-xl font-black text-slate-900 leading-tight mb-1">{selectedEmployee.name}</h2>
                      <p className="text-sm font-semibold text-slate-500 mb-4">{selectedEmployee.email}</p>
                      
                      <Badge variant="secondary" className="text-[11px] uppercase font-bold tracking-wider px-4 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200">
                        {selectedEmployee.position?.replace(/_/g, ' ')}
                      </Badge>
                      
                      <div className="mt-8 w-full flex flex-col gap-3">
                        <div className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">User ID</span>
                          <span className="text-sm font-black text-slate-700">{selectedEmployee.user_id}</span>
                        </div>
                        <div className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Branch</span>
                          <span className="text-sm font-black text-slate-700">{selectedEmployee.branch}</span>
                        </div>
                        <div className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Department</span>
                          <span className="text-sm font-black text-slate-700 truncate max-w-[120px]">{selectedEmployee.department}</span>
                        </div>
                        <div className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                          <Badge className={\`text-white font-black text-[10px] uppercase tracking-wider \${selectedEmployee.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}\`}>
                            {selectedEmployee.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Columns: Advanced Analytics (8 cols) */}
                  <div className="lg:col-span-8 space-y-8">
                    {loadingAnalytics ? (
                      <div className="flex flex-col items-center justify-center py-32 text-slate-400 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#7B0099]" />
                        <p className="text-sm font-bold tracking-wide">Loading enterprise analytics...</p>
                      </div>
                    ) : analytics ? (
                      <>
                        {/* Attendance Performance Section */}
                        <section>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                                <TrendingUp className="h-4 w-4" />
                              </div>
                              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Attendance Performance</h3>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Monthly Rate Card */}
                            <Card className="shadow-sm border-slate-200/60 hover:shadow-md transition-shadow duration-200">
                              <CardContent className="p-5">
                                <div className="flex justify-between items-center mb-6">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Monthly Rate</p>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[9px] font-bold cursor-help hover:bg-slate-200 transition-colors">?</div>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-[250px] p-3 text-xs leading-relaxed">
                                        <p className="font-bold mb-1 text-slate-800">Formula:</p>
                                        <p className="text-slate-600">(Present Days / Expected Working Days) × 100</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <Badge variant="secondary" className={\`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 border \${
                                    analytics.attendance.monthly.rate >= 95 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 
                                    analytics.attendance.monthly.rate >= 85 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 
                                    analytics.attendance.monthly.rate >= 70 ? 'text-amber-700 bg-amber-50 border-amber-200' : 
                                    'text-slate-600 bg-slate-100 border-slate-200'
                                  }\`}>
                                    {analytics.attendance.monthly.rate >= 95 ? 'Excellent' : analytics.attendance.monthly.rate >= 85 ? 'Good' : analytics.attendance.monthly.rate >= 70 ? 'Warning' : 'Review'}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-baseline gap-1 mb-6">
                                  <span className={\`text-4xl font-black tracking-tighter \${
                                    analytics.attendance.monthly.rate >= 85 ? 'text-emerald-600' : 
                                    analytics.attendance.monthly.rate >= 70 ? 'text-amber-500' : 
                                    analytics.attendance.monthly.rate === 0 ? 'text-slate-300' : 'text-slate-700'
                                  }\`}>
                                    {analytics.attendance.monthly.rate}
                                  </span>
                                  <span className="text-lg font-bold text-slate-400">%</span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-3 text-center">
                                    <p className="text-xl font-black text-emerald-600 leading-none mb-1">{analytics.attendance.monthly.present}</p>
                                    <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-wider">Present</p>
                                  </div>
                                  <div className="bg-amber-50/50 border border-amber-100/50 rounded-xl p-3 text-center">
                                    <p className="text-xl font-black text-amber-600 leading-none mb-1">{analytics.attendance.monthly.late}</p>
                                    <p className="text-[9px] font-bold text-amber-600/70 uppercase tracking-wider">Late</p>
                                  </div>
                                  <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 text-center">
                                    <p className="text-xl font-black text-slate-600 leading-none mb-1">{analytics.attendance.monthly.absent}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Absent</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Yearly Rate Card */}
                            <Card className="shadow-sm border-slate-200/60 hover:shadow-md transition-shadow duration-200">
                              <CardContent className="p-5">
                                <div className="flex justify-between items-center mb-6">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Yearly Rate</p>
                                  </div>
                                  <Badge variant="secondary" className={\`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 border \${
                                    analytics.attendance.yearly.rate >= 95 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 
                                    analytics.attendance.yearly.rate >= 85 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 
                                    analytics.attendance.yearly.rate >= 70 ? 'text-amber-700 bg-amber-50 border-amber-200' : 
                                    'text-slate-600 bg-slate-100 border-slate-200'
                                  }\`}>
                                    {analytics.attendance.yearly.rate >= 95 ? 'Excellent' : analytics.attendance.yearly.rate >= 85 ? 'Good' : analytics.attendance.yearly.rate >= 70 ? 'Warning' : 'Review'}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-baseline gap-1 mb-6">
                                  <span className={\`text-4xl font-black tracking-tighter \${
                                    analytics.attendance.yearly.rate >= 85 ? 'text-emerald-600' : 
                                    analytics.attendance.yearly.rate >= 70 ? 'text-amber-500' : 
                                    analytics.attendance.yearly.rate === 0 ? 'text-slate-300' : 'text-slate-700'
                                  }\`}>
                                    {analytics.attendance.yearly.rate}
                                  </span>
                                  <span className="text-lg font-bold text-slate-400">%</span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-3 text-center">
                                    <p className="text-xl font-black text-emerald-600 leading-none mb-1">{analytics.attendance.yearly.present}</p>
                                    <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-wider">Present</p>
                                  </div>
                                  <div className="bg-amber-50/50 border border-amber-100/50 rounded-xl p-3 text-center">
                                    <p className="text-xl font-black text-amber-600 leading-none mb-1">{analytics.attendance.yearly.late}</p>
                                    <p className="text-[9px] font-bold text-amber-600/70 uppercase tracking-wider">Late</p>
                                  </div>
                                  <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 text-center">
                                    <p className="text-xl font-black text-slate-600 leading-none mb-1">{analytics.attendance.yearly.absent}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Absent</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </section>

                        {/* Leave Utilization Section */}
                        <section>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
                                <Briefcase className="h-4 w-4" />
                              </div>
                              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Leave Utilization</h3>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                            <div className="rounded-2xl border border-slate-200/60 p-5 bg-white shadow-sm flex flex-col justify-between">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Total Entitled</p>
                              <p className="text-3xl font-black text-slate-800 tracking-tighter">{analytics.leave.entitlement}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/60 p-5 bg-white shadow-sm flex flex-col justify-between">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Approved Taken</p>
                              <p className="text-3xl font-black text-slate-800 tracking-tighter">{analytics.leave.used}</p>
                            </div>
                            <div className="rounded-2xl border-2 border-emerald-500/20 p-5 bg-emerald-50/30 shadow-sm flex flex-col justify-between">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">Remaining Balance</p>
                              <p className="text-3xl font-black text-emerald-600 tracking-tighter">{analytics.leave.remaining}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/60 p-5 bg-white shadow-sm flex flex-col justify-between">
                              <Tooltip>
                                <TooltipTrigger className="text-left w-full h-full flex flex-col justify-between">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center justify-between w-full">
                                    Utilization
                                    <span className="w-3 h-3 rounded-full bg-slate-100 flex items-center justify-center text-[7px] text-slate-400">?</span>
                                  </p>
                                  <p className={\`text-3xl font-black tracking-tighter \${analytics.leave.utilizationRate >= 90 ? 'text-amber-500' : 'text-slate-800'}\`}>
                                    {analytics.leave.utilizationRate}%
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Formula: (Approved Leave / Total Entitled) × 100</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button 
                              className="group flex flex-col items-start p-4 rounded-2xl bg-amber-50/50 border border-amber-200/50 hover:bg-amber-50 hover:border-amber-300 transition-all duration-200"
                              onClick={() => setViewLeaveStatus("Pending")}
                            >
                              <div className="flex justify-between items-center w-full mb-3">
                                <div className="p-2 bg-amber-100 rounded-lg text-amber-600 group-hover:scale-110 transition-transform">
                                  <Clock className="w-4 h-4" />
                                </div>
                                <span className="text-xl font-black text-amber-600">{analytics.leave.pending}</span>
                              </div>
                              <span className="text-[10px] font-bold text-amber-700/80 uppercase tracking-widest">Pending Requests</span>
                            </button>
                            
                            <button 
                              className="group flex flex-col items-start p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/50 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200"
                              onClick={() => setViewLeaveStatus("Approved")}
                            >
                              <div className="flex justify-between items-center w-full mb-3">
                                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform">
                                  <Briefcase className="w-4 h-4" />
                                </div>
                                <span className="text-xl font-black text-emerald-600">{analytics.leave.approved}</span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-widest">Approved Leave</span>
                            </button>

                            <button 
                              className="group flex flex-col items-start p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all duration-200 opacity-90 hover:opacity-100"
                              onClick={() => setViewLeaveStatus("Rejected")}
                            >
                              <div className="flex justify-between items-center w-full mb-3">
                                <div className="p-2 bg-slate-200 rounded-lg text-slate-600 group-hover:scale-110 transition-transform">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <span className="text-xl font-black text-slate-700">{analytics.leave.rejected}</span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Rejected Requests</span>
                            </button>
                          </div>
                        </section>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-32 text-slate-400 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
                        <Users className="w-12 h-12 opacity-20 mb-4" />
                        <p className="text-sm font-bold">Analytics unavailable.</p>
                      </div>
                    )}
                  </div>
                </div>
              </TooltipProvider>
            ) : (
              <div className="py-20 text-center text-slate-500">
                <p>Loading profile details...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
`;

let result = content.substring(0, startIndex) + newModal + content.substring(endIndex);
fs.writeFileSync('src/pages/Employees.tsx', result, 'utf8');
console.log("Updated Employees.tsx");
