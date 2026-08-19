import re

with open('src/pages/Employees.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add state
if 'const [statusConfirmEmp, setStatusConfirmEmp] = useState<any>(null);' not in content:
    content = re.sub(
        r'(const \[deleteConfirmEmp, setDeleteConfirmEmp\] = useState<any>\(null\);)',
        r'\1\n  const [statusConfirmEmp, setStatusConfirmEmp] = useState<any>(null);',
        content
    )

# Replace handleToggleStatus
old_toggle = """  const handleToggleStatus = async (e: React.MouseEvent, emp: any) => {
    e.stopPropagation();
    const currentStatus = emp.status || "Active";
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    
    const confirmMessage = currentStatus === "Active" 
      ? `Are you sure you want to mark ${emp.name} as Inactive?`
      : `Are you sure you want to reactivate ${emp.name}?`;
      
    if (!window.confirm(confirmMessage)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: emp.id || emp.user_id,
          status: nextStatus,
          changer_role: role
        })
      });

      if (!response.ok) throw new Error("Failed to update status");

      toast({
        title: "Success",
        description: `Staff record has been marked as ${nextStatus}.`,
      });

      await fetchEmployees();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update employee status. Please try again.",
        variant: "destructive",
      });
    }
  };"""

new_toggle = """  const handleToggleStatus = (e: React.MouseEvent, emp: any) => {
    e.stopPropagation();
    setStatusConfirmEmp(emp);
  };

  const confirmToggleStatus = async () => {
    if (!statusConfirmEmp) return;
    try {
      const currentStatus = statusConfirmEmp.status || "Active";
      const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
      
      const response = await fetch(`${API_BASE_URL}/api/employees/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: statusConfirmEmp.id || statusConfirmEmp.user_id,
          status: nextStatus,
          changer_role: role
        })
      });

      if (!response.ok) throw new Error("Failed to update status");

      toast({
        title: "Success",
        description: `Staff record has been marked as ${nextStatus}.`,
      });

      await fetchEmployees();
      setStatusConfirmEmp(null);
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update employee status. Please try again.",
        variant: "destructive",
      });
    }
  };"""

if 'confirmToggleStatus = async' not in content:
    content = content.replace(old_toggle, new_toggle)
    # Just in case there are whitespace differences, let's use a regex fallback
    if 'confirmToggleStatus = async' not in content:
        content = re.sub(
            r'const handleToggleStatus = async.*?};',
            new_toggle,
            content,
            flags=re.DOTALL
        )


dialog_jsx = """      {/* Status Confirmation Modal */}
      <Dialog open={!!statusConfirmEmp} onOpenChange={(open) => !open && setStatusConfirmEmp(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className={`text-xl font-black ${statusConfirmEmp?.status === "Active" ? "text-amber-600" : "text-emerald-600"}`}>
              {statusConfirmEmp?.status === "Active" ? "Inactive Employee?" : "Reactivate Employee?"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {statusConfirmEmp?.status === "Active" 
                ? <>Are you sure you want to mark <strong>{statusConfirmEmp?.name}</strong> as Inactive?</>
                : <>Are you sure you want to reactivate <strong>{statusConfirmEmp?.name}</strong>?</>}
            </p>
            <div className={`border rounded-lg p-3 ${statusConfirmEmp?.status === "Active" ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"}`}>
              <p className={`text-xs font-medium leading-relaxed ${statusConfirmEmp?.status === "Active" ? "text-amber-600" : "text-emerald-600"}`}>
                {statusConfirmEmp?.status === "Active" 
                  ? "This action is temporary and can be reversed later. The employee's records will be retained." 
                  : "This action will restore the employee's active status and grant them system access."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusConfirmEmp(null)}>
              Cancel
            </Button>
            <Button 
              variant={statusConfirmEmp?.status === "Active" ? "destructive" : "default"} 
              onClick={confirmToggleStatus} 
              className={statusConfirmEmp?.status === "Active" ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
            >
              {statusConfirmEmp?.status === "Active" ? "Inactive" : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
"""

if 'Status Confirmation Modal' not in content:
    content = content.replace('{/* Delete Confirmation Modal */}', dialog_jsx + '\n      {/* Delete Confirmation Modal */}')

with open('src/pages/Employees.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
