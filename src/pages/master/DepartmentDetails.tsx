import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCog, ArrowLeft, Building2, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function DepartmentDetails() {
  const { deptName } = useParams<{ deptName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedNewHod, setSelectedNewHod] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`https://rayhar-staff-production.up.railway.app/api/employees?branch=HQ`);
      const data = await response.json();
      if (data.success) {
        // Filter by the specific department
        const deptStaff = data.employees.filter((e: any) => e.department === deptName);
        setEmployees(deptStaff);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [deptName]);

  const currentHod = employees.find(e => e.role === "head_of_department");
  const activeStaff = employees.filter(e => e.status === "Active");
  
  // Potential new HODs are active staff in the same department who aren't currently the HOD
  const candidateHods = activeStaff.filter(e => e.role !== "head_of_department");

  const handleHodTransfer = async () => {
    if (!selectedNewHod) {
      toast.error("Please select a new HOD");
      return;
    }

    setIsTransferring(true);
    try {
      const response = await fetch(`https://rayhar-staff-production.up.railway.app/api/departments/hod-transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentName: deptName,
          newHodUserId: selectedNewHod,
          changedByUserId: user?.user_id,
          branch: "HQ"
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success("HOD transferred successfully");
        setTransferModalOpen(false);
        setSelectedNewHod("");
        fetchEmployees(); // Refresh data
      } else {
        toast.error(data.error || "Failed to transfer HOD");
      }
    } catch (error) {
      console.error("HOD Transfer Error:", error);
      toast.error("An error occurred during transfer");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/master/department")} className="rounded-xl">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#7B0099]" />
            {deptName}
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Manage department details and personnel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[25px] border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-3xl font-black">{employees.length}</span>
                <p className="text-xs text-muted-foreground font-medium mt-1">Registered members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[25px] border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Active Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-3xl font-black">{activeStaff.length}</span>
                <p className="text-xs text-muted-foreground font-medium mt-1">Currently active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[25px] border-[#7B0099]/30 shadow-md bg-[#7B0099]/5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-[#7B0099]/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#7B0099] uppercase tracking-wider flex items-center justify-between">
              Head of Department
              <UserCog className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            {currentHod ? (
              <div className="mb-4">
                <span className="text-xl font-black text-foreground">{currentHod.full_name}</span>
                <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">{currentHod.user_id}</p>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-bold">No HOD Assigned</span>
              </div>
            )}

            <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full bg-[#7B0099] hover:bg-[#5a0073] text-white rounded-xl shadow-lg shadow-purple-900/20">
                  {currentHod ? "Transfer Role" : "Assign HOD"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-[25px] p-6 border-border/50">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    HOD Transfer Validation
                  </DialogTitle>
                  <DialogDescription className="text-sm pt-3">
                    Assigning a new Head of Department will automatically demote the current HOD ({currentHod?.full_name || 'None'}) to a standard employee role.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select New HOD</label>
                    <Select value={selectedNewHod} onValueChange={setSelectedNewHod}>
                      <SelectTrigger className="w-full h-12 rounded-xl">
                        <SelectValue placeholder="Choose a staff member" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {candidateHods.map(emp => (
                          <SelectItem key={emp.user_id} value={emp.user_id} className="rounded-lg">
                            {emp.full_name} ({emp.user_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTransferModalOpen(false)} className="rounded-xl border-border/50">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleHodTransfer} 
                    disabled={isTransferring || !selectedNewHod}
                    className="rounded-xl bg-[#7B0099] hover:bg-[#5a0073] text-white shadow-lg shadow-purple-900/20"
                  >
                    {isTransferring ? "Processing..." : "Confirm Transfer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[25px] border-border/50 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="text-lg font-black">Department Personnel</CardTitle>
          <CardDescription>Full list of staff assigned to {deptName}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 font-black tracking-wider">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {employees.map((emp) => (
                  <tr key={emp.user_id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#7B0099]/10 text-[#7B0099] flex items-center justify-center font-black text-xs">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{emp.full_name}</div>
                          <div className="text-xs text-muted-foreground">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        emp.role === 'head_of_department' 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {emp.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="font-medium">{emp.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-muted rounded-full h-2 max-w-[100px]">
                          <div 
                            className="bg-[#7B0099] h-2 rounded-full" 
                            style={{ width: `${emp.attendance_rate || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold">{emp.attendance_rate || 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      No staff members found in this department.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
