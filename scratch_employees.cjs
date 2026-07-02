const fs = require('fs');

let content = fs.readFileSync('src/pages/Employees.tsx', 'utf8');

// 1. Add Tooltip, Progress, Briefcase to imports
if (!content.includes('Tooltip,')) {
  content = content.replace(
    'import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";',
    `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";\nimport { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";\nimport { Progress } from "@/components/ui/progress";`
  );
}
if (!content.includes('Briefcase')) {
  content = content.replace(
    '  Users,',
    '  Users,\n  Briefcase,'
  );
}

// 2. Add analytics state and fetch
if (!content.includes('const [analytics, setAnalytics]')) {
  const stateInjection = `
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const fetchAnalytics = async (userId: string) => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch(\`\${API_BASE_URL}/api/employees/\${userId}/analytics\`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingAnalytics(false);
  };

  useEffect(() => {
    if (selectedEmployee && isModalOpen) {
      fetchAnalytics(selectedEmployee.user_id);
    } else {
      setAnalytics(null);
    }
  }, [selectedEmployee, isModalOpen]);
`;
  content = content.replace('const [isModalOpen, setIsModalOpen] = useState(false);', 'const [isModalOpen, setIsModalOpen] = useState(false);' + stateInjection);
}

// 3. Replace the Modal body
const oldModalRegex = /<Dialog open=\{isModalOpen\} onOpenChange=\{setIsModalOpen\}>[\s\S]*?<\/Dialog>/;

const newModalBody = `<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-5xl w-full overflow-y-auto max-h-[90vh]">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-black text-slate-800">Staff Profile & Analytics</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            {selectedEmployee ? (
              <TooltipProvider>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Bio & Info */}
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center h-fit">
                    <div className="w-24 h-24 rounded-2xl bg-[#7B0099] flex items-center justify-center text-white text-4xl font-black shadow-xl mb-4">
                      {selectedEmployee.name.charAt(0)}
                    </div>
                    <h2 className="text-xl font-black text-slate-800 leading-tight">{selectedEmployee.name}</h2>
                    <p className="text-sm font-bold text-[#7B0099] mt-1">{selectedEmployee.email}</p>
                    <Badge variant="secondary" className="mt-4 text-[10px] uppercase font-black px-3 py-1">{selectedEmployee.position?.replace(/_/g, ' ')}</Badge>
                    
                    <div className="mt-6 pt-6 border-t border-slate-200 w-full space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-widest">User ID</span>
                        <span className="font-black text-slate-700">{selectedEmployee.user_id}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-widest">Branch</span>
                        <span className="font-black text-slate-700">{selectedEmployee.branch}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-widest">Department</span>
                        <span className="font-black text-slate-700">{selectedEmployee.department}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-widest">Status</span>
                        <Badge className={\`text-white font-black text-[9px] h-5 \${selectedEmployee.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}\`}>{selectedEmployee.status}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Right Columns: Advanced Analytics */}
                  <div className="lg:col-span-2 space-y-6">
                    {loadingAnalytics ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400 h-full">
                        <Loader2 className="w-8 h-8 animate-spin mb-4" />
                        <p className="text-sm font-bold">Loading enterprise analytics...</p>
                      </div>
                    ) : analytics ? (
                      <>
                        {/* Attendance Performance */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 px-1">
                            <TrendingUp className="h-4 w-4 text-slate-400" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Attendance Performance</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Monthly Rate */}
                            <Card className="shadow-sm border-slate-100">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Rate</p>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className="flex items-baseline gap-1 cursor-help">
                                          <span className={\`text-2xl font-black \${analytics.attendance.monthly.rate >= 95 ? 'text-emerald-500' : analytics.attendance.monthly.rate >= 85 ? 'text-emerald-500' : analytics.attendance.monthly.rate >= 70 ? 'text-amber-500' : 'text-rose-500'}\`}>
                                            {analytics.attendance.monthly.rate}%
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-[250px] p-3">
                                        <p className="font-bold text-xs mb-1">Calculation Formula:</p>
                                        <p className="text-xs text-muted-foreground">(Present Days / Expected Working Days) × 100</p>
                                        <p className="text-xs text-muted-foreground mt-2 border-t pt-2">Expected Working Days exclude weekends, public holidays, approved personal leave, and company trips.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <Badge variant="outline" className={\`text-[9px] font-black uppercase \${analytics.attendance.monthly.rate >= 95 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : analytics.attendance.monthly.rate >= 85 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : analytics.attendance.monthly.rate >= 70 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-rose-600 bg-rose-50 border-rose-200'}\`}>
                                    {analytics.attendance.monthly.rate >= 95 ? 'Excellent' : analytics.attendance.monthly.rate >= 85 ? 'Good' : analytics.attendance.monthly.rate >= 70 ? 'Needs Attention' : 'Poor'}
                                  </Badge>
                                </div>
                                <Progress value={analytics.attendance.monthly.rate} className="h-2 mb-4" />
                                <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-3">
                                  <div>
                                    <p className="text-lg font-black text-slate-700">{analytics.attendance.monthly.present}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Present</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-black text-slate-700">{analytics.attendance.monthly.late}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Late</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-black text-rose-500">{analytics.attendance.monthly.absent}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Absent</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Yearly Rate */}
                            <Card className="shadow-sm border-slate-100">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Yearly Rate</p>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className="flex items-baseline gap-1 cursor-help">
                                          <span className={\`text-2xl font-black \${analytics.attendance.yearly.rate >= 95 ? 'text-emerald-500' : analytics.attendance.yearly.rate >= 85 ? 'text-emerald-500' : analytics.attendance.yearly.rate >= 70 ? 'text-amber-500' : 'text-rose-500'}\`}>
                                            {analytics.attendance.yearly.rate}%
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-[250px] p-3">
                                        <p className="font-bold text-xs mb-1">Calculation Formula:</p>
                                        <p className="text-xs text-muted-foreground">(Present Days / Expected Working Days) × 100</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <Badge variant="outline" className={\`text-[9px] font-black uppercase \${analytics.attendance.yearly.rate >= 95 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : analytics.attendance.yearly.rate >= 85 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : analytics.attendance.yearly.rate >= 70 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-rose-600 bg-rose-50 border-rose-200'}\`}>
                                    {analytics.attendance.yearly.rate >= 95 ? 'Excellent' : analytics.attendance.yearly.rate >= 85 ? 'Good' : analytics.attendance.yearly.rate >= 70 ? 'Needs Attention' : 'Poor'}
                                  </Badge>
                                </div>
                                <Progress value={analytics.attendance.yearly.rate} className="h-2 mb-4" />
                                <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-3">
                                  <div>
                                    <p className="text-lg font-black text-slate-700">{analytics.attendance.yearly.present}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Present</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-black text-slate-700">{analytics.attendance.yearly.late}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Late</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-black text-rose-500">{analytics.attendance.yearly.absent}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Absent</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>

                        {/* Leave Utilization */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 px-1">
                            <Briefcase className="h-4 w-4 text-slate-400" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Leave Utilization</h3>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-2xl border border-slate-100 p-4 bg-white text-center">
                              <p className="text-2xl font-black text-slate-800">{analytics.leave.entitlement}</p>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Total Entitled</p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 p-4 bg-white text-center">
                              <p className="text-2xl font-black text-slate-800">{analytics.leave.used}</p>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Approved Taken</p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 p-4 bg-white text-center">
                              <p className="text-2xl font-black text-emerald-500">{analytics.leave.remaining}</p>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Remaining Balance</p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 p-4 bg-white text-center relative group">
                              <Tooltip>
                                <TooltipTrigger className="w-full">
                                  <p className={\`text-2xl font-black \${analytics.leave.utilizationRate >= 90 ? 'text-amber-500' : 'text-slate-800'}\`}>{analytics.leave.utilizationRate}%</p>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Utilization</p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Formula: (Approved Leave / Total Entitled) × 100</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            <button 
                              className="flex items-center justify-between w-full rounded-xl bg-amber-50 px-4 py-3 border border-amber-100 hover:bg-amber-100 transition-colors"
                              onClick={() => setViewLeaveStatus("Pending")}
                            >
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Pending Requests</span>
                              </div>
                              <Badge className="bg-amber-500 text-white font-black h-5 text-[10px]">{analytics.leave.pending}</Badge>
                            </button>
                            <button 
                              className="flex items-center justify-between w-full rounded-xl bg-rose-50 px-4 py-3 border border-rose-100 hover:bg-rose-100 transition-colors"
                              onClick={() => setViewLeaveStatus("Rejected")}
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-rose-500" />
                                <span className="text-xs font-bold text-rose-700 uppercase tracking-wide">Rejected Requests</span>
                              </div>
                              <Badge className="bg-rose-500 text-white font-black h-5 text-[10px]">{analytics.leave.rejected}</Badge>
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Users className="w-12 h-12 opacity-20 mb-4" />
                        <p className="text-sm font-bold">Analytics unavailable.</p>
                      </div>
                    )}
                  </div>
                </div>
              </TooltipProvider>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Users className="w-12 h-12 opacity-20 mb-4" />
                <p className="text-sm font-bold">Select a staff member to view statistics.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>`;

content = content.replace(oldModalRegex, newModalBody);
fs.writeFileSync('src/pages/Employees.tsx', content);
