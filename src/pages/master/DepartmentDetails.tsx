import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCog, ArrowLeft, Building2, ShieldAlert, CheckCircle2, AlertCircle, UserCheck, History } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config/api";
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

const getInitials = (name: string) => {
  if (!name) return "??";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatAssignmentPeriod = (startStr: string, endStr: string | null) => {
  if (!startStr) return "N/A";
  try {
    const parseDateStr = (str: string) => {
      const parts = str.split('T')[0].split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1;
        const d = parseInt(parts[2]);
        return new Date(y, m, d);
      }
      return new Date(str);
    };
    const sDate = parseDateStr(startStr);
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEPT", "OCT", "NOV", "DEC"];
    const startFormatted = `${sDate.getDate()} ${months[sDate.getMonth()]} ${sDate.getFullYear()}`;
    if (!endStr) return `${startFormatted} - ONGOING`;
    const eDate = parseDateStr(endStr);
    const endFormatted = `${eDate.getDate()} ${months[eDate.getMonth()]} ${eDate.getFullYear()}`;
    return `${startFormatted} - ${endFormatted}`;
  } catch (e) {
    return `${startStr} - ${endStr || "ONGOING"}`;
  }
};

export default function DepartmentDetails() {
  const { deptName } = useParams<{ deptName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [tempAssignments, setTempAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedNewHod, setSelectedNewHod] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);

  const fetchDepartmentData = async () => {
    try {
      const [empRes, assignRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/employees?branch=HQ&status=Active`),
        fetch(`${API_BASE_URL}/api/work-assignments-all`)
      ]);
      const empData = await empRes.json();
      const assignData = await assignRes.json();

      if (empData.success) {
        // Filter by the specific department
        const deptStaff = empData.employees.filter((e: any) => {
          if (!e.department || !deptName) return false;
          const normEmpDept = e.department.toLowerCase().replace(/\bdepartment\b/g, '').trim();
          const normDeptName = deptName.toLowerCase().replace(/\bdepartment\b/g, '').trim();
          return normEmpDept === normDeptName || e.department === deptName;
        });
        setEmployees(deptStaff);
      }

      if (assignData.success && assignData.assignments) {
        const todayStr = new Date().toISOString().split('T')[0];
        const mapped = assignData.assignments.map((a: any) => {
          let computed = a.status;
          if (computed === 'Active') {
            const start = a.start_date.split('T')[0];
            const end = a.end_date ? a.end_date.split('T')[0] : '2099-12-31';
            if (todayStr < start) computed = 'Upcoming';
            else if (todayStr > end) computed = 'Completed';
            else computed = 'Active';
          }
          return { ...a, computedStatus: computed };
        });
        setTempAssignments(mapped);
      }
    } catch (error) {
      console.error("Error fetching department data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentData();

    const handleFocus = () => fetchDepartmentData();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleFocus);
    };
  }, [deptName]);

  const currentHod = employees.find(e => e.role === "head_of_department" && e.status === "Active");
  const activeStaff = employees.filter(e => e.status === "Active");
  
  // Potential new HODs are active staff in the same department who aren't currently the HOD
  const candidateHods = activeStaff.filter(e => e.role !== "head_of_department");

  const isDeptMatch = (assignedDept: string | undefined | null) => {
    if (!assignedDept || !deptName) return false;
    const norm1 = assignedDept.toLowerCase().replace(/\bdepartment\b/g, '').trim();
    const norm2 = deptName.toLowerCase().replace(/\bdepartment\b/g, '').trim();
    return norm1 === norm2 || assignedDept === deptName;
  };

  const filteredTempAssignments = tempAssignments.filter(a => 
    isDeptMatch(a.assigned_department) || (a.temp_branch === 'HQ' && isDeptMatch(a.assigned_department))
  );

  const activeTempStaff = filteredTempAssignments.filter(a => a.computedStatus === 'Active');

  const handleHodTransfer = async () => {
    if (!selectedNewHod) {
      toast.error("Please select a new HOD");
      return;
    }

    setIsTransferring(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/departments/hod-transfer`, {
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
        fetchDepartmentData(); // Refresh data
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
            <Building2 className="w-6 h-6 text-primary" />
            {deptName}
          </h1>
          <p className="text-sm text-foreground font-medium">Manage department details and personnel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[25px] border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-3xl font-black">{employees.length}</span>
                <p className="text-xs text-foreground font-medium mt-1">Registered members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[25px] border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">Active Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-3xl font-black">{activeStaff.length}</span>
                <p className="text-xs text-foreground font-medium mt-1">Currently active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[25px] border-primary/30 shadow-md bg-primary/5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-primary/10 rounded-md -mr-16 -mt-16 blur-2xl" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-primary uppercase tracking-wider flex items-center justify-between">
              Head of Department
              <UserCog className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            {currentHod ? (
              <div className="mb-4">
                <span className="text-xl font-black text-foreground">{currentHod.full_name}</span>
                <p className="text-xs font-bold text-foreground mt-1 uppercase tracking-widest">{currentHod.user_id}</p>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-bold">No HOD Assigned</span>
              </div>
            )}

            <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-purple-900/20">
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
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground">Select New HOD</label>
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
                    className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-purple-900/20"
                  >
                    {isTransferring ? "Processing..." : "Confirm Transfer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* 1. Department Personnel */}
      <Card className="rounded-[25px] border-border/50 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="text-lg font-black">Department Personnel</CardTitle>
          <CardDescription>Full list of staff assigned to {deptName}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-foreground uppercase bg-muted/30 font-black tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Employee</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Role</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {employees.map((emp) => (
                  <tr key={emp.user_id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{emp.full_name}</div>
                          <div className="text-xs text-foreground">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
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
                            className="bg-primary h-2 rounded-full" 
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
                    <td colSpan={4} className="px-6 py-8 text-center text-foreground">
                      No staff members found in this department.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 2. Temporary Staff On Duty */}
      <div className="space-y-2">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
          TEMPORARY STAFF ON DUTY
        </h2>
        <Card className="rounded-[25px] border-border/50 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-foreground uppercase bg-purple-50/60 dark:bg-purple-950/20 font-black tracking-wider">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Personnel</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Permanent Branch</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Assignment Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {activeTempStaff.map((staff) => {
                    const initials = getInitials(staff.name);
                    return (
                      <tr key={staff.id} className="hover:bg-purple-50/20 dark:hover:bg-purple-950/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/40 text-[#942392] font-black text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-foreground uppercase text-xs sm:text-sm">
                                {staff.name}
                              </div>
                              <span className="inline-block mt-0.5 bg-purple-100 dark:bg-purple-900/40 text-[#942392] text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
                                TEMP
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                          {staff.primary_branch || 'HQ'}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                          {formatAssignmentPeriod(staff.start_date, staff.end_date)}
                        </td>
                      </tr>
                    );
                  })}
                  {activeTempStaff.length === 0 && !loading && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-xs text-foreground font-medium">
                        No active temporary staff currently assigned on duty to this department.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. History of Temporary Staff */}
      <div className="space-y-2">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
          HISTORY OF TEMPORARY STAFF
        </h2>
        <Card className="rounded-[25px] border-border/50 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-foreground uppercase bg-slate-50 dark:bg-slate-900/50 font-black tracking-wider">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Personnel</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Permanent Branch</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Assignment Period</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredTempAssignments.map((staff) => {
                    const initials = getInitials(staff.name);
                    const isDuty = staff.computedStatus === 'Active';
                    return (
                      <tr key={staff.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-foreground uppercase text-xs sm:text-sm">
                                {staff.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                          {staff.primary_branch || 'HQ'}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                          {formatAssignmentPeriod(staff.start_date, staff.end_date)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isDuty 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                              : staff.computedStatus === 'Upcoming'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              : staff.computedStatus === 'Cancelled'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {isDuty ? 'ON DUTY' : staff.computedStatus.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTempAssignments.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-xs text-foreground font-medium">
                        No temporary staff assignment history found for this department.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
