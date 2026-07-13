const fs = require('fs');

const file = "src/pages/master/LeaveEntitlementManagement.tsx";
let code = fs.readFileSync(file, 'utf8');

const targetStr = `/* ==========================================================
   PLACEHOLDER FORMS
   ========================================================== */
function SpecialLeaveCreditsForm({ employees, onCancel }: any) {`;

const newCode = `/* ==========================================================
   5. SPECIAL LEAVE CREDITS FORM
   ========================================================== */
function SpecialLeaveCreditsForm({ employees, onCancel }: any) {
  const { toast } = useToast();
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [leaveCategory, setLeaveCategory] = useState("Compassionate Leave");
  const [adjDays, setAdjDays] = useState(1);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [reasonDetails, setReasonDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = () => {
    if (!selectedEmp) return;
    setIsSubmitting(true);
    
    // Mock save
    setTimeout(() => {
      // Append to history logs
      const newLog = {
        date: new Date().toISOString().split('T')[0],
        action: \`Grant \${leaveCategory}\`,
        performedBy: "HR Admin (Auto)",
        reference: \`SPL-\${Date.now().toString().slice(-6)}\`,
        before: 0,
        after: adjDays,
        type: "Special Credit",
        leave: leaveCategory,
        employee: selectedEmp.full_name,
      };

      const saved = localStorage.getItem("leave_balance_history_logs");
      const currentLogs = saved ? JSON.parse(saved) : [];
      localStorage.setItem("leave_balance_history_logs", JSON.stringify([newLog, ...currentLogs]));

      toast({
        title: "Special Leave Granted",
        description: \`Allocated \${adjDays} days of \${leaveCategory} to \${selectedEmp.full_name}.\`,
      });
      setIsSubmitting(false);
      onCancel();
    }, 600);
  };

  return (
    <Card className="border-border/60 bg-white dark:bg-card shadow-lg max-w-2xl mx-auto rounded-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 bg-rose-50/50 dark:bg-rose-950/20">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-rose-500/10 hover:text-rose-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
          <Gift className="w-5 h-5 text-rose-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Special Leave Credits</CardTitle>
          <CardDescription className="text-xs">Issue special-purpose leave credits.</CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center">Employee <span className="text-red-500 ml-1">*</span></Label>
            <EmployeeSearchSelector employees={employees} selectedEmployee={selectedEmp} onSelect={setSelectedEmp} placeholder="Search employee..." />
          </div>
          {selectedEmp && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 border border-border/50 rounded-md p-2 bg-muted/10">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Employee ID</Label>
                <div className="text-xs font-bold">{selectedEmp.user_id}</div>
              </div>
              <div className="space-y-1.5 border border-border/50 rounded-md p-2 bg-muted/10 md:col-span-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Department</Label>
                <div className="text-xs font-bold">{selectedEmp.department || "IT Department"}</div>
              </div>
            </div>
          )}
        </div>

        {selectedEmp && (
          <>
            <div className="border-t border-border/50" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center">Leave Category <span className="text-red-500 ml-1">*</span></Label>
                <Select value={leaveCategory} onValueChange={setLeaveCategory}>
                  <SelectTrigger className="bg-white dark:bg-card h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Compassionate Leave">Compassionate Leave</SelectItem>
                    <SelectItem value="Marriage Leave">Marriage Leave</SelectItem>
                    <SelectItem value="Paternity Leave">Paternity Leave</SelectItem>
                    <SelectItem value="Exam Leave">Exam Leave</SelectItem>
                    <SelectItem value="Birthday Leave">Birthday Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center">Credit Amount <span className="text-red-500 ml-1">*</span></Label>
                <div className="relative">
                  <Input type="number" value={adjDays} onChange={(e) => setAdjDays(Number(e.target.value))} className="bg-white dark:bg-card h-9 text-xs pr-12 font-bold" min={1} />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium">Days</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center">Effective Date <span className="text-red-500 ml-1">*</span></Label>
                <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="bg-white dark:bg-card h-9 text-xs" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-bold">Reason Details & Comments</Label>
                <Textarea rows={3} placeholder="Optional details..." value={reasonDetails} onChange={(e) => setReasonDetails(e.target.value)} className="bg-white dark:bg-card text-xs resize-none" />
              </div>
            </div>
            
            <div className="border-t border-border/50" />
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={onCancel} className="text-xs uppercase font-black tracking-wider w-32">Cancel</Button>
              <Button size="sm" disabled={isSubmitting} onClick={handleSave} className="bg-rose-600 hover:bg-rose-700 text-white text-xs uppercase font-black tracking-wider min-w-[150px]">
                {isSubmitting ? "Processing..." : "Grant Special Leave"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ==========================================================
   6. MATERNITY LEAVE FORM
   ========================================================== */
function MaternityLeaveForm({ employees, onCancel }: any) {
  const { toast } = useToast();
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [edd, setEdd] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalDays, setTotalDays] = useState(98);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto calculate End Date based on Start Date + 98 days
  useEffect(() => {
    if (startDate) {
      const start = new Date(startDate);
      start.setDate(start.getDate() + totalDays - 1);
      setEndDate(start.toISOString().split("T")[0]);
    }
  }, [startDate, totalDays]);

  const handleSave = () => {
    if (!selectedEmp) return;
    setIsSubmitting(true);
    
    // Mock save
    setTimeout(() => {
      const newLog = {
        date: new Date().toISOString().split('T')[0],
        action: \`Maternity Allocation\`,
        performedBy: "HR Admin (Auto)",
        reference: \`MAT-\${Date.now().toString().slice(-6)}\`,
        before: 0,
        after: totalDays,
        type: "Statutory Leave",
        leave: "Maternity Leave",
        employee: selectedEmp.full_name,
      };

      const saved = localStorage.getItem("leave_balance_history_logs");
      const currentLogs = saved ? JSON.parse(saved) : [];
      localStorage.setItem("leave_balance_history_logs", JSON.stringify([newLog, ...currentLogs]));

      toast({
        title: "Maternity Leave Granted",
        description: \`Allocated \${totalDays} days of Maternity Leave to \${selectedEmp.full_name}.\`,
      });
      setIsSubmitting(false);
      onCancel();
    }, 600);
  };

  return (
    <Card className="border-border/60 bg-white dark:bg-card shadow-lg max-w-2xl mx-auto rounded-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 bg-pink-50/50 dark:bg-pink-950/20">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-pink-500/10 hover:text-pink-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-pink-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Maternity Leave Allocation</CardTitle>
          <CardDescription className="text-xs">Manage statutory maternity leave (typically 98 days).</CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center">Female Employee <span className="text-red-500 ml-1">*</span></Label>
            <EmployeeSearchSelector employees={employees} selectedEmployee={selectedEmp} onSelect={setSelectedEmp} placeholder="Search female employee..." />
          </div>
          {selectedEmp && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 border border-border/50 rounded-md p-2 bg-muted/10">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Employee ID</Label>
                <div className="text-xs font-bold">{selectedEmp.user_id}</div>
              </div>
              <div className="space-y-1.5 border border-border/50 rounded-md p-2 bg-muted/10 md:col-span-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Department</Label>
                <div className="text-xs font-bold">{selectedEmp.department || "IT Department"}</div>
              </div>
            </div>
          )}
        </div>

        {selectedEmp && (
          <>
            <div className="border-t border-border/50" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Expected Delivery Date (EDD)</Label>
                <Input type="date" value={edd} onChange={(e) => setEdd(e.target.value)} className="bg-white dark:bg-card h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Total Entitlement (Days) <span className="text-red-500 ml-1">*</span></Label>
                <Input type="number" value={totalDays} onChange={(e) => setTotalDays(Number(e.target.value))} className="bg-white dark:bg-card h-9 text-xs font-bold" min={1} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Leave Start Date <span className="text-red-500 ml-1">*</span></Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white dark:bg-card h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Leave End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-muted/50 h-9 text-xs font-bold text-pink-600" readOnly />
              </div>
            </div>
            
            <div className="space-y-2 mt-2">
              <Label className="text-xs font-bold flex items-center">Medical Certificate / Proof <span className="text-red-500 ml-1">*</span></Label>
              <div className="border-2 border-dashed border-border/60 rounded-lg p-4 flex flex-col items-center justify-center bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer">
                <div className="text-xs font-bold text-pink-600 mb-1">Upload Medical Document</div>
                <div className="text-[10px] text-muted-foreground">PDF, JPG, PNG up to 5MB</div>
              </div>
            </div>

            <div className="border-t border-border/50" />
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={onCancel} className="text-xs uppercase font-black tracking-wider w-32">Cancel</Button>
              <Button size="sm" disabled={isSubmitting || !startDate} onClick={handleSave} className="bg-pink-600 hover:bg-pink-700 text-white text-xs uppercase font-black tracking-wider min-w-[150px]">
                {isSubmitting ? "Processing..." : "Allocate Maternity Leave"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ==========================================================
   7. LEAVE BALANCE HISTORY FORM
   ========================================================== */
function LeaveBalanceHistoryForm({ onCancel }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("leave_balance_history_logs");
    if (saved) {
      setLogs(JSON.parse(saved));
    }
  }, []);

  const filteredLogs = logs.filter(log => 
    !search || 
    log.employee.toLowerCase().includes(search.toLowerCase()) || 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.leave.toLowerCase().includes(search.toLowerCase()) ||
    log.reference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="border-border/60 bg-white dark:bg-card shadow-lg max-w-5xl mx-auto rounded-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 bg-slate-50 dark:bg-slate-900/50">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-slate-500/10 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-slate-500/10 flex items-center justify-center">
          <History className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Leave Balance History</CardTitle>
          <CardDescription className="text-xs">Audit log of all entitlement allocations and adjustments.</CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="p-4 border-b border-border/50 bg-muted/10">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employee, action, or ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-white dark:bg-card h-9 text-xs"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto max-h-[500px]">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-md">
              <TableRow>
                <TableHead className="text-xs font-bold">Date</TableHead>
                <TableHead className="text-xs font-bold">Employee</TableHead>
                <TableHead className="text-xs font-bold">Action / Reference</TableHead>
                <TableHead className="text-xs font-bold">Leave Type</TableHead>
                <TableHead className="text-right text-xs font-bold">Change</TableHead>
                <TableHead className="text-right text-xs font-bold">New Balance</TableHead>
                <TableHead className="text-xs font-bold pl-6">Performed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                    No history records found. Ensure you allocate or adjust leave first.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log, idx) => {
                  const isPositive = log.after > log.before;
                  const diff = Math.abs(log.after - log.before);
                  return (
                    <TableRow key={idx} className="hover:bg-muted/30">
                      <TableCell className="text-xs whitespace-nowrap">{log.date}</TableCell>
                      <TableCell className="text-xs font-bold">{log.employee}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-bold text-foreground">{log.action}</div>
                        <div className="text-[10px] text-muted-foreground">{log.reference}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-[10px] font-medium bg-muted text-muted-foreground">
                          {log.leave}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold">
                        <span className={isPositive ? "text-emerald-600" : "text-rose-600"}>
                          {isPositive ? '+' : '-'}{diff}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-black">{log.after} Days</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground pl-6 whitespace-nowrap">{log.performedBy}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
`;

const startIndex = code.indexOf(targetStr);
if (startIndex !== -1) {
  const endIndex = code.lastIndexOf('}'); // To replace till end of file
  const newFullCode = code.slice(0, startIndex) + newCode;
  fs.writeFileSync(file, newFullCode, 'utf8');
  console.log('Successfully replaced placeholders.');
} else {
  console.log('Target string not found!');
}
