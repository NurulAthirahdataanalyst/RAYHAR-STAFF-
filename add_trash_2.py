import re

with open('src/pages/Employees.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
if 'Trash2' not in content:
    content = content.replace('MapPin,', 'MapPin,\n  Trash2,')

# 2. State
if 'deleteConfirmEmp' not in content:
    content = re.sub(r'(const \[viewLeaveStatus, setViewLeaveStatus\] = useState<string \| null>\(null\);)', r'\1\n  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState<any>(null);', content)

# 3. Handler
delete_fn = """
  const handleDeleteEmployee = async () => {
    if (!deleteConfirmEmp) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: deleteConfirmEmp.id || deleteConfirmEmp.user_id,
          status: "Deleted"
        })
      });

      if (!response.ok) throw new Error("Failed to delete employee");

      toast({
        title: "Success",
        description: "Staff record has been permanently deleted.",
      });

      await fetchEmployees();
      setDeleteConfirmEmp(null);
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast({
        title: "Error",
        description: "Failed to delete employee. Please try again.",
        variant: "destructive",
      });
    }
  };
"""
if 'handleDeleteEmployee' not in content:
    content = content.replace('const handleToggleStatus =', delete_fn + '\n  const handleToggleStatus =')

# 4. Desktop status replacement
desktop_badge_regex = r'<Badge variant=\{emp\.status === "Active" \? "default" : "secondary"\} className=\{`text-\[10px\] font-black px-3 \$\{emp\.status === \'Active\' \? \'bg-emerald-500 hover:bg-emerald-600\' : \'\'\}`\}>\s*\{emp\.status\}\s*</Badge>'
new_desktop_badge = """<Badge className={`text-[10px] font-black px-3 ${emp.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : emp.status === 'Inactive' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-rose-500 hover:bg-rose-600 text-white'}`}>
                                  {emp.status === 'Deleted' ? 'Deleted Staff' : `${emp.status} Staff`}
                                </Badge>"""
content = re.sub(desktop_badge_regex, new_desktop_badge, content, count=1)

# 5. Mobile status replacement
mobile_badge_regex = r'<Badge className=\{`text-\[9px\] font-black h-5 shrink-0 \$\{emp\.status === \'Active\' \? \'bg-emerald-500\' : \'bg-muted text-muted-foreground\'\}`\}>\s*\{emp\.status\}\s*</Badge>'
new_mobile_badge = """<Badge className={`text-[9px] font-black h-5 shrink-0 ${emp.status === 'Active' ? 'bg-emerald-500 text-white' : emp.status === 'Inactive' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {emp.status === 'Deleted' ? 'Deleted Staff' : `${emp.status} Staff`}
                              </Badge>"""
content = re.sub(mobile_badge_regex, new_mobile_badge, content, count=1)

# 6. Trash buttons
trash_btn = """</Button>
                                )}
                                {role === "hr_admin" && emp.status !== "Deleted" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmEmp(emp); }}
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>"""
# find the action div ends: `</Button>\n                                )}\n                              </div>`
content = re.sub(r'</Button>\s*?\)}\s*?</div>', trash_btn, content)

# 7. Add Dialog
dialog_jsx = """
      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirmEmp} onOpenChange={(open) => !open && setDeleteConfirmEmp(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-rose-600">Delete Employee?</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Are you sure you want to permanently delete <strong>{deleteConfirmEmp?.name}</strong> from <strong>{deleteConfirmEmp?.branch}</strong>?
            </p>
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg p-3">
              <p className="text-xs text-rose-600 font-medium leading-relaxed">
                ⚠️ This action is permanent and cannot be undone or recovered. All employee records associated with this account will be deleted.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmEmp(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEmployee} className="bg-rose-600 hover:bg-rose-700">
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
"""
if 'Delete Confirmation Modal' not in content:
    content = content.replace('{/* Add User Modal */}', dialog_jsx + '\n      {/* Add User Modal */}')

with open('src/pages/Employees.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
