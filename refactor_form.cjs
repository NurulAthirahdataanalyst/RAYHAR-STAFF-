const fs = require('fs');
let code = fs.readFileSync('c:/Users/HP/ATTENDANCE_SYSTEM/src/pages/master/LeaveEntitlementManagement.tsx', 'utf8');

const oldFormStart = "function ManualLeaveAdjustmentForm({";
const newForm = `function ManualLeaveAdjustmentForm({
  employees,
  selectedEmp,
  setSelectedEmp,
  onCancel,
  onRefresh
}: any) {
  const { toast } = useToast();
  const [leaveType, setLeaveType] = useState("Annual & Emergency Leave");
  const [adjDays, setAdjDays] = useState(1);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const entitlement = selectedEmp?.annual_leave_entitlement || 14;
  const adjustment = selectedEmp?.total_adjustment || 0;
  const available = selectedEmp?.annual_leave_balance || 0;
  const used = entitlement + adjustment - available;

  const handleSave = async () => {
    if (!selectedEmp) return;
    setIsSubmitting(true);
    
    try {
      const res = await fetch(\`\${API_BASE_URL}/api/profiles/\${selectedEmp.user_id}/leave-adjustments\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType: leaveType,
          adjustmentDays: adjDays,
          reason: reason,
          approvedBy: "HR Admin"
        }),
      });

      if (!res.ok) throw new Error("Failed to apply adjustment");

      toast({
        title: "Adjustment Applied Successfully",
        description: \`Added \${adjDays} days for \${selectedEmp.full_name}\`,
      });
      onRefresh?.();
      onCancel();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to apply adjustment",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border/60 bg-card/75 shadow-lg max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 mb-4 bg-muted/20">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-amber-500/10 hover:text-amber-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Manage Leave Adjustment</CardTitle>
          <CardDescription className="text-xs">Adjust employee's leave balance.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Employee</h4>
          <div className="space-y-4">
            <EmployeeSearchSelector
              employees={employees}
              selectedEmployee={selectedEmp}
              onSelect={setSelectedEmp}
              placeholder="Search staff to adjust..."
            />
            {selectedEmp && (
              <div className="bg-muted/20 p-4 rounded-lg border border-border/50 text-sm">
                <div className="mb-2 border-b pb-2">
                  <span className="font-bold text-foreground">{selectedEmp.full_name}</span>
                </div>
                <div className="space-y-2">
                  <h5 className="font-bold text-xs uppercase text-muted-foreground">Annual Leave</h5>
                  <div className="flex justify-between"><span>Current Entitlement</span><span className="font-bold">{entitlement} days</span></div>
                  <div className="flex justify-between"><span>Used</span><span className="font-bold">{used} days</span></div>
                  <div className="flex justify-between"><span>Adjustment</span><span className="font-bold">{adjustment > 0 ? '+' : ''}{adjustment} days</span></div>
                  <div className="border-t pt-2 flex justify-between font-black text-amber-700 dark:text-amber-400">
                    <span>Available</span><span>{available} days</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedEmp && (
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Add Adjustment</h4>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Days</Label>
              <Input type="number" value={adjDays} onChange={(e) => setAdjDays(Number(e.target.value))} className="bg-white dark:bg-card h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Reason</Label>
              <Input
                placeholder="e.g. Performance Reward"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-white dark:bg-card text-xs h-9"
              />
            </div>
          </div>
        </div>
        )}

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" size="sm" onClick={onCancel} className="text-xs uppercase font-black tracking-wider">Cancel</Button>
          <Button size="sm" disabled={!selectedEmp || isSubmitting} onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white text-xs uppercase font-black tracking-wider">
            {isSubmitting ? "Saving..." : "Save Adjustment"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}`;

let newCode = code.substring(0, code.indexOf(oldFormStart)) + newForm;

fs.writeFileSync('c:/Users/HP/ATTENDANCE_SYSTEM/src/pages/master/LeaveEntitlementManagement.tsx', newCode);
console.log('Replaced form');
