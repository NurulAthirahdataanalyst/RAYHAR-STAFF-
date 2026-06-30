import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Plus, Trash2, Edit2, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface CompanyLeave {
  id: number;
  leave_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  applies_to: string;
  branch_id?: string;
  department_id?: string;
  is_paid: boolean;
  attendance_required: boolean;
  status: string;
  remarks?: string;
  created_by?: string;
}

const CompanyLeaveCalendar = () => {
  const { role } = useRole();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [leaves, setLeaves] = useState<CompanyLeave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Only hr_admin gets CRUD access. Others view only.
  const isHR = role === 'hr_admin';

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<Partial<CompanyLeave>>({
    leave_name: '',
    leave_type: 'Holiday',
    start_date: '',
    end_date: '',
    applies_to: 'all',
    branch_id: '',
    department_id: '',
    is_paid: true,
    attendance_required: false,
    status: 'Active',
    remarks: ''
  });

  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/company-leaves");
      const data = await res.json();
      if (data.success) {
        setLeaves(data.leaves);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch company leaves", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleOpenDialog = (leave?: CompanyLeave) => {
    if (leave) {
      setEditingId(leave.id);
      setFormData({
        ...leave,
        start_date: leave.start_date.split('T')[0],
        end_date: leave.end_date.split('T')[0],
      });
    } else {
      setEditingId(null);
      setFormData({
        leave_name: '',
        leave_type: 'Holiday',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        applies_to: 'all',
        branch_id: '',
        department_id: '',
        is_paid: true,
        attendance_required: false,
        status: 'Active',
        remarks: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.leave_name || !formData.start_date || !formData.end_date) {
      toast({ title: "Error", description: "Name, start date, and end date are required.", variant: "destructive" });
      return;
    }
    try {
      const url = editingId ? `/api/company-leaves/${editingId}` : "/api/company-leaves";
      const method = editingId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, created_by: user?.full_name || 'HR' })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: "Company leave saved successfully." });
        setIsDialogOpen(false);
        fetchLeaves();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this company leave?")) return;
    try {
      const res = await fetch(`/api/company-leaves/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: "Deleted successfully." });
        fetchLeaves();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Company Leave Calendar" 
        description="View and manage organization-wide holidays and special leaves."
      />

      {!isHR && (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-lg flex items-start gap-3 border border-blue-200 dark:border-blue-800">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">
            Only Human Resources and authorized administrators can create or edit company leaves. 
            Company leaves automatically override regular attendance statuses for affected employees.
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Special Leaves &amp; Holidays</CardTitle>
            <CardDescription>All global leave dates that affect attendance calculation.</CardDescription>
          </div>
          {isHR && (
            <Button onClick={() => handleOpenDialog()} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" /> Add Company Leave
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading leaves...</div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg border-gray-200 dark:border-gray-800">
              No company leaves found. {isHR && "Click 'Add Company Leave' to create one."}
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-3">Leave Name</th>
                    <th className="px-4 py-3">Date Range</th>
                    <th className="px-4 py-3">Applies To</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Paid?</th>
                    <th className="px-4 py-3">Status</th>
                    {isHR && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{leave.leave_name}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {new Date(leave.start_date).toLocaleDateString()} 
                          {leave.start_date !== leave.end_date && ` - ${new Date(leave.end_date).toLocaleDateString()}`}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {leave.applies_to === 'all' && <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">All Staff</span>}
                        {leave.applies_to === 'branch' && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs">Branch: {leave.branch_id}</span>}
                        {leave.applies_to === 'department' && <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-1 rounded text-xs">Dept: {leave.department_id}</span>}
                      </td>
                      <td className="px-4 py-3">{leave.leave_type}</td>
                      <td className="px-4 py-3">
                        {leave.is_paid ? (
                          <span className="text-green-600 dark:text-green-400 font-medium">Yes</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-medium">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${leave.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                          {leave.status}
                        </span>
                      </td>
                      {isHR && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(leave)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(leave.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for Add/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Company Leave" : "Add Company Leave"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Leave Name (e.g. Hari Raya, Company Trip)</Label>
              <Input 
                value={formData.leave_name} 
                onChange={(e) => setFormData({ ...formData, leave_name: e.target.value })} 
                placeholder="Holiday Name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={formData.start_date} 
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} 
                />
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  value={formData.end_date} 
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Leave Type</Label>
                <Select value={formData.leave_type} onValueChange={(val) => setFormData({ ...formData, leave_type: val })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Public Holiday">Public Holiday</SelectItem>
                    <SelectItem value="Company Holiday">Company Holiday</SelectItem>
                    <SelectItem value="Emergency Leave">Emergency Leave</SelectItem>
                    <SelectItem value="Special Leave">Special Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Applies To</Label>
                <Select value={formData.applies_to} onValueChange={(val) => setFormData({ ...formData, applies_to: val })}>
                  <SelectTrigger><SelectValue placeholder="Select coverage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    <SelectItem value="branch">Specific Branch</SelectItem>
                    <SelectItem value="department">Specific Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.applies_to === 'branch' && (
              <div className="grid gap-2">
                <Label>Branch ID</Label>
                <Input 
                  value={formData.branch_id || ''} 
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })} 
                  placeholder="e.g. B001"
                />
              </div>
            )}

            {formData.applies_to === 'department' && (
              <div className="grid gap-2">
                <Label>Department Name</Label>
                <Input 
                  value={formData.department_id || ''} 
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })} 
                  placeholder="e.g. IT Department"
                />
              </div>
            )}

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="is_paid" 
                checked={formData.is_paid} 
                onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked === true })} 
              />
              <Label htmlFor="is_paid" className="cursor-pointer">This is a paid leave</Label>
            </div>
            
            <div className="grid gap-2 pt-2">
              <Label>Remarks (Optional)</Label>
              <Input 
                value={formData.remarks || ''} 
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} 
                placeholder="Additional notes"
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">Save Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default CompanyLeaveCalendar;
