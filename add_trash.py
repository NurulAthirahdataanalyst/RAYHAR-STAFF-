import re

with open('src/pages/Employees.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import Trash2
if 'Trash2' not in content:
    content = content.replace('MapPin', 'MapPin,\n    Trash2')

# 2. Add state
if 'const [deleteConfirmEmp, setDeleteConfirmEmp] = useState<any>(null);' not in content:
    content = re.sub(
        r'(const \[viewLeaveStatus, setViewLeaveStatus\] = useState<string \| null>\(null\);)',
        r'\1\n  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState<any>(null);',
        content
    )

# 3. Add handleDelete function
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
    content = content.replace('const handleToggleStatus', delete_fn + '\n  const handleToggleStatus')

# 4. Desktop status
old_desktop_status = """<Badge variant={emp.status === "Active" ? "default" : "secondary"} className={`text-[10px] font-black px-3 ${emp.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                                  {emp.status}
                                </Badge>"""
new_desktop_status = """<Badge className={`text-[10px] font-black px-3 ${emp.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600' : emp.status === 'Inactive' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-rose-500 hover:bg-rose-600'}`}>
                                  {emp.status === 'Deleted' ? 'Deleted Staff' : `${emp.status} Staff`}
                                </Badge>"""
content = content.replace(old_desktop_status, new_desktop_status)

# Desktop action buttons - insert trash button after the re-activate button
old_desktop_action = """</Button>
                                )}
                              </div>"""
new_desktop_action = """</Button>
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
# Need to be careful. There are multiple action buttons in Employees.tsx. One for desktop, one for mobile.
# Actually I can just write a quick script to find the correct insertion points.

with open('src/pages/Employees.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
