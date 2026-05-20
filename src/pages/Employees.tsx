import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Loader2, 
  CalendarCheck, 
  TrendingUp, 
  Clock, 
  FileText, 
  Users,
  X,
  PhoneCall
} from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { parseCutiGantiRows, getCleanReason } from "@/lib/leaveStorage";
import { API_BASE_URL } from "../config/api";

export default function Employees() {
  const { role, userBranch, userDepartment } = useRole();
  const [search, setSearch] = useState("");
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewLeaveStatus, setViewLeaveStatus] = useState<"Approved" | "Pending" | "Rejected" | null>(null);
  const [employeeLeaves, setEmployeeLeaves] = useState<any[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const { toast } = useToast();

  // Add User State
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupBranch, setSignupBranch] = useState("HQ");
  const [signupDepartment, setSignupDepartment] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState("employee");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [role, userBranch, userDepartment]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        role,
        branch: userBranch || "",
        department: userDepartment || "",
      });

      const response = await fetch(`${API_BASE_URL}/api/employees?${params}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch employees");
      }

      const formattedData = data.employees.map((employee: any) => ({
        ...employee,
        id: employee.user_id,
        name: employee.full_name || "New User",
        email: employee.email || "Account Active",
        position: employee.role === "hr_admin" ? "HR Admin" : employee.role ? employee.role.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : "Employee",
        branch: employee.branch || "HQ",
        department: employee.department || "General",
        status: employee.status || "Active",
      }));

      setDbEmployees(formattedData);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLeaves = async () => {
      if (!viewLeaveStatus || !selectedEmployee) {
        setEmployeeLeaves([]);
        return;
      }

      setLoadingLeaves(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/leave-requests?userId=${selectedEmployee.user_id}`);
        const data = await response.json();
        if (data.success) {
          setEmployeeLeaves(data.leaveRequests || []);
        } else {
          setEmployeeLeaves([]);
        }
      } catch (err) {
        console.error("Error fetching leaves", err);
        setEmployeeLeaves([]);
      } finally {
        setLoadingLeaves(false);
      }
    };
    fetchLeaves();
  }, [viewLeaveStatus, selectedEmployee]);

  const filtered = dbEmployees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.position.toLowerCase().includes(search.toLowerCase())
  );

  const handleEmployeeClick = (emp: any) => {
    setSelectedEmployee(emp);
    setIsModalOpen(true);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          full_name: signupName, 
          email: signupEmail, 
          password: signupPassword,
          branch: signupBranch,
          department: signupBranch === "HQ" ? signupDepartment : null,
          role: signupRole,
          status: 'Active'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({ title: "User Created!", description: `Successfully created user ${data.user.full_name}` });
        setIsAddModalOpen(false);
        // Reset form
        setSignupName("");
        setSignupEmail("");
        setSignupPassword("");
        setSignupBranch("HQ");
        setSignupDepartment("");
        setSignupRole("employee");
        fetchEmployees(); // Refresh list
      } else {
        toast({ title: "Signup failed", description: data.error || "Could not create user", variant: "destructive" });
      }
    } catch (err) {
      console.error("Signup connection error:", err);
      toast({ title: "Connection Error", description: "Could not connect to the server.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-responsive-xl font-bold font-heading text-foreground">Staff Directory</h1>
          <p className="text-responsive-sm text-muted-foreground mt-1">
            {role === "hr_admin" ? "Manage employees across all branches" : `View employees in ${userBranch}`}
          </p>
        </div>
        
        {role === "hr_admin" && (
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#7B0099] hover:bg-[#5e0080] text-white font-bold gap-2 whitespace-nowrap touch-target self-start sm:self-auto"
          >
            <Users className="w-4 h-4" />
            Add Staff
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-card/50 backdrop-blur-sm p-3 rounded-2xl border border-border/50">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 sm:h-10 border-border/60 bg-background/50 focus:ring-[#7B0099]/20"
          />
        </div>
        
        <Badge variant="outline" className="px-3 py-1.5 text-xs font-bold whitespace-nowrap bg-muted/30 border-border/60 h-10 sm:h-auto justify-center">
          Total <span className="ml-2 inline-flex items-center justify-center bg-[#7B0099] text-white rounded-full px-2 py-0.5 text-[10px] min-w-[20px]">{filtered.length}</span>
        </Badge>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-card/60 backdrop-blur-md">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#7B0099]" />
              <p className="text-xs font-bold text-muted-foreground animate-pulse uppercase tracking-widest">Loading Personnel...</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 text-foreground border-b border-border">
                      <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em]">Staff Member</th>
                      <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em]">Position</th>
                      <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em]">Branch</th>
                      <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filtered.length > 0 ? (
                      filtered.map((emp) => (
                        <tr 
                          key={emp.id} 
                          className="hover:bg-[#7B0099]/5 transition-colors cursor-pointer group"
                          onClick={() => handleEmployeeClick(emp)}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-[#7B0099]/10 flex items-center justify-center text-xs font-black text-[#7B0099] group-hover:scale-110 transition-transform">
                                {emp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-foreground group-hover:text-[#7B0099] transition-colors">{emp.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate font-medium">{emp.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-xs font-bold text-muted-foreground capitalize">{emp.position.replace('_', ' ')}</span>
                          </td>
                          <td className="py-4 px-6 text-xs font-bold text-muted-foreground">{emp.branch}</td>
                          <td className="py-4 px-6">
                            <Badge variant={emp.status === "Active" ? "default" : "secondary"} className={`text-[10px] font-black px-3 ${emp.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                              {emp.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-muted-foreground italic font-medium">No employees found matching your search.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border/50">
                {filtered.length > 0 ? (
                  filtered.map((emp) => (
                    <div 
                      key={emp.id} 
                      className="p-4 active:bg-[#7B0099]/5 transition-colors flex items-center gap-4 cursor-pointer"
                      onClick={() => handleEmployeeClick(emp)}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#7B0099]/10 flex items-center justify-center text-sm font-black text-[#7B0099] shrink-0">
                        {emp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-black text-sm text-foreground truncate">{emp.name}</p>
                          <Badge className={`text-[9px] font-black h-5 shrink-0 ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                            {emp.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <span className="truncate max-w-[100px]">{emp.position.replace('_', ' ')}</span>
                          <span className="opacity-30">•</span>
                          <span>{emp.branch}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-muted-foreground italic font-medium p-6">No employees found.</div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Employee Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl w-full overflow-y-auto max-h-[90vh]">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-black text-slate-800">Staff Profile</DialogTitle>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            {selectedEmployee ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Bio */}
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-2xl bg-[#7B0099] flex items-center justify-center text-white text-4xl font-black shadow-xl mb-4">
                      {selectedEmployee.name.charAt(0)}
                    </div>
                    <h2 className="text-xl font-black text-slate-800 leading-tight">{selectedEmployee.name}</h2>
                    <p className="text-sm font-bold text-[#7B0099] mt-1">{selectedEmployee.email}</p>
                    <Badge variant="secondary" className="mt-4 text-[10px] uppercase font-black px-3 py-1">{selectedEmployee.position}</Badge>
                    
                    <div className="mt-6 pt-6 border-t border-slate-200 w-full space-y-3">
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
                        <Badge className="bg-emerald-500 text-white font-black text-[9px] h-5">{selectedEmployee.status}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Stats */}
                  <div className="space-y-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Performance & Leave</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-100 p-4 bg-white hover:border-[#7B0099]/30 transition-colors">
                        <CalendarCheck className="mb-2 h-4 w-4 text-[#7B0099]" />
                        <p className="text-2xl font-black text-slate-800">{selectedEmployee.annual_leave_balance}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Annual Left</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 p-4 bg-white hover:border-emerald-500/30 transition-colors">
                        <TrendingUp className="mb-2 h-4 w-4 text-emerald-500" />
                        <p className="text-2xl font-black text-slate-800">{selectedEmployee.attendance_rate || 0}%</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendance</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 p-4 bg-white hover:border-amber-500/30 transition-colors">
                        <Clock className="mb-2 h-4 w-4 text-amber-500" />
                        <p className="text-2xl font-black text-slate-800">{selectedEmployee.pending_leaves}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 p-4 bg-white hover:border-purple-500/30 transition-colors">
                        <FileText className="mb-2 h-4 w-4 text-purple-500" />
                        <p className="text-2xl font-black text-slate-800">{selectedEmployee.mc_leaves || 0}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total MC</p>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Quick Links</p>
                      <div className="grid grid-cols-1 gap-2">
                        <button 
                          className="flex items-center justify-between w-full rounded-xl bg-emerald-50 px-4 py-3 hover:bg-emerald-100 transition-all border border-emerald-100" 
                          onClick={() => setViewLeaveStatus("Approved")}
                        >
                          <span className="text-xs font-bold text-emerald-700">Approved Leaves</span>
                          <Badge className="bg-emerald-500 text-white font-black h-5 text-[10px]">{selectedEmployee.approved_leaves}</Badge>
                        </button>
                        <button 
                          className="flex items-center justify-between w-full rounded-xl bg-amber-50 px-4 py-3 hover:bg-amber-100 transition-all border border-amber-100" 
                          onClick={() => setViewLeaveStatus("Pending")}
                        >
                          <span className="text-xs font-bold text-amber-700">Pending Approvals</span>
                          <Badge className="bg-amber-500 text-white font-black h-5 text-[10px]">{selectedEmployee.pending_leaves}</Badge>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Users className="w-12 h-12 opacity-20 mb-4" />
                <p className="text-sm font-bold">Select a staff member to view statistics.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* LEAVE FORMS DIALOG */}
      <Dialog open={!!viewLeaveStatus} onOpenChange={(open) => !open && setViewLeaveStatus(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {viewLeaveStatus} Leaves - {selectedEmployee?.name}
            </DialogTitle>
            <DialogDescription>
              Review the submitted leave forms with this status.
            </DialogDescription>
          </DialogHeader>

          {loadingLeaves ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              {employeeLeaves.filter(req => {
                const status = (req.status || "").toLowerCase().trim();
                const viewStatus = (viewLeaveStatus || "").toLowerCase().trim();
                if (viewStatus === "pending") return status.includes("pending");
                return status === viewStatus;
              }).length === 0 ? (
                <p className="text-sm text-center text-muted-foreground p-4 italic">No {viewLeaveStatus?.toLowerCase()} leave records found for this staff member.</p>
              ) : (
                employeeLeaves
                  .filter(req => {
                    const status = (req.status || "").toLowerCase().trim();
                    const viewStatus = (viewLeaveStatus || "").toLowerCase().trim();
                    if (viewStatus === "pending") return status.includes("pending");
                    return status === viewStatus;
                  })
                  .map(req => {
                    const fromStr = new Date(req.start_date).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const toStr = new Date(req.end_date).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    return (
                      <div key={req.leave_id} className="rounded-lg border p-6 space-y-6 bg-white shadow-sm mb-6">
                        <div className="text-center border-b-2 border-slate-900 pb-4">
                          <h2 className="text-2xl font-black tracking-tight text-slate-900">RAYHAR GROUP</h2>
                          <p className="text-sm font-bold tracking-widest uppercase">Permohonan Cuti Kakitangan</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Nama Penuh</span>
                            <p className="font-semibold border-b pb-1 border-slate-100">{selectedEmployee?.name}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Cawangan</span>
                            <p className="font-semibold border-b pb-1 border-slate-100">{selectedEmployee?.branch || "HQ"}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Jenis Cuti</span>
                            <p className="font-semibold border-b pb-1 border-slate-100">{req.leave_type}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Status</span>
                            <p className={`font-bold border-b pb-1 border-slate-100 uppercase ${req.status === "Rejected" ? "text-red-600" : "text-primary"}`}>
                              {req.status}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm border rounded-xl p-4 bg-muted/20">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Tarikh Mula</p>
                            <p className="font-bold text-base">{fromStr}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Tarikh Akhir</p>
                            <p className="font-bold text-base">{toStr}</p>
                          </div>
                          <div className="text-center bg-white rounded-lg border flex flex-col justify-center py-1">
                            <p className="text-[10px] uppercase font-bold text-primary">Bilangan Hari</p>
                            <p className="font-black text-lg text-primary">{req.days} Hari</p>
                          </div>
                        </div>

                        <div className="text-sm">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Tujuan / Sebab Cuti</p>
                          <p className="rounded-lg border p-3 italic text-slate-700 bg-slate-50/50">
                            "{getCleanReason(req.reason) || "-"}"
                          </p>
                        </div>

                         {/* Conditional Fields: Cuti Ganti */}
                        {(req.leave_type === "Replacement Leave" || req.leave_type === "Cuti Ganti") && (() => {
                          const rows = parseCutiGantiRows(
                            req.reason,
                            req.cuti_ganti_tarikh,
                            req.cuti_ganti_hari,
                            req.cuti_ganti_jam
                          );
                          return (
                            <div className="space-y-3">
                              <p className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Butiran Cuti Ganti</p>
                              <div className="border border-blue-100 rounded-xl overflow-hidden bg-blue-50/30">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="bg-blue-100/50 text-blue-700 font-bold uppercase border-b border-blue-100">
                                      <th className="py-2.5 px-4 text-[10px]">Tarikh Cuti</th>
                                      <th className="py-2.5 px-4 text-[10px]">Tarikh/Hari Cuti Ganti</th>
                                      <th className="py-2.5 px-4 text-right text-[10px]">Jam Bekerja</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-blue-100 font-medium text-slate-800">
                                    {rows.map((row, idx) => (
                                      <tr key={idx}>
                                        <td className="py-2 px-4">{row.tarikh || "-"}</td>
                                        <td className="py-2 px-4">{row.hari || "-"}</td>
                                        <td className="py-2 px-4 text-right">{row.jam || 0} Jam</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Conditional Fields: Cuti Tanpa Gaji */}
                        {(req.leave_type === "Unpaid Leave" || req.leave_type === "Cuti Tanpa Gaji") && (
                          <div className="grid grid-cols-2 gap-4 text-sm border rounded-xl p-4 bg-rose-50/50 border-rose-100">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-rose-600">No. Tel H/P</p>
                              <p className="font-bold text-base text-slate-900">{req.cuti_tanpa_gaji_phone || "-"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-rose-600">Tandatangan Pengesahan</p>
                              <p className="font-bold text-base text-slate-900">
                                {req.cuti_tanpa_gaji_signature ? "✓ Disahkan" : "Tiada Pengesahan"}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Conditional Fields: Cuti Sakit (MC) */}
                        {(req.leave_type === "Sick Leave" || req.leave_type === "Cuti Sakit") && req.mc_file_url && (
                          <div className="text-sm p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
                            <p className="text-[10px] uppercase font-bold text-purple-600 mb-2">Lampiran MC</p>
                            <a href={`${API_BASE_URL}${req.mc_file_url}`} target="_blank" rel="noopener noreferrer" className="text-purple-700 underline font-semibold flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              View MC Attachment
                            </a>
                          </div>
                        )}

                        {/* Maklumat Waris Section */}
                        <div className="space-y-3 pt-2 border-t">
                          <div className="flex items-center gap-2 border-b pb-2 pt-2">
                            <PhoneCall className="w-4 h-4 text-red-600" />
                            <h3 className="text-sm font-black uppercase tracking-tight">Maklumat Waris (Kecemasan)</h3>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">Nama Waris</label>
                              <p className="text-sm font-semibold text-slate-900 border-b border-dotted pb-1">
                                {req.waris_nama || "-"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">Hubungan</label>
                              <p className="text-sm font-semibold text-slate-900 border-b border-dotted pb-1">
                                {req.waris_hubungan || "-"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">No. Telefon</label>
                              <p className="text-sm font-bold text-primary border-b border-dotted pb-1">
                                {req.waris_phone || "-"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">Alamat Waris</label>
                              <p className="text-xs leading-relaxed text-slate-700 border-b border-dotted pb-1">
                                {req.waris_alamat || "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add User Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Staff</DialogTitle>
            <DialogDescription>
              Create a new user account for an employee. They will be assigned to the selected branch.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSignup} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Full Name</Label>
              <Input id="signup-name" type="text" placeholder="e.g. Ahmad Albab" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" type="email" placeholder="ahmad@rayhar.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-branch">Branch</Label>
              <Select value={signupBranch} onValueChange={setSignupBranch}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HQ">Rayhar HQ</SelectItem>
                  <SelectItem value="KMM">Kemaman</SelectItem>
                  <SelectItem value="TGG">Kuala Terengganu</SelectItem>
                  <SelectItem value="CNH">Cheneh</SelectItem>
                  <SelectItem value="KBG">Kuala Berang</SelectItem>
                  <SelectItem value="DGN">Dungun</SelectItem>
                  <SelectItem value="JTH">Jertih</SelectItem>
                  <SelectItem value="KBR">Kota Baru</SelectItem>
                  <SelectItem value="RMP">Rompin</SelectItem>
                  <SelectItem value="MZM">Muadzam Shah</SelectItem>
                  <SelectItem value="SHA">Shah Alam</SelectItem>
                  <SelectItem value="BBB">Bandar Baru Bangi</SelectItem>
                  <SelectItem value="KUL">Kuala Lumpur</SelectItem>
                  <SelectItem value="IPH">Ipoh</SelectItem>
                  <SelectItem value="MJG">Manjung</SelectItem>
                  <SelectItem value="MLK">Melaka</SelectItem>
                  <SelectItem value="KKS">Kuala Kangsar</SelectItem>
                  <SelectItem value="TWU">Tawau</SelectItem>
                  <SelectItem value="SNS">Seremban</SelectItem>
                  <SelectItem value="AOR">Alor Setar</SelectItem>
                  <SelectItem value="BTM">Bertam</SelectItem>
                  <SelectItem value="BTP">Batu Pahat</SelectItem>
                  <SelectItem value="JB">Johor Bharu</SelectItem>                        
                </SelectContent>
              </Select>
            </div>

            {signupBranch === "HQ" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="signup-department">Department</Label>
                <Select value={signupDepartment} onValueChange={setSignupDepartment} required>
                  <SelectTrigger className="rounded-md">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="HAJI/UMRAH (BHU)">HAJI/UMRAH (BHU)</SelectItem>
                    <SelectItem value="MARKETING & MEDIA">MARKETING & MEDIA</SelectItem>
                    <SelectItem value="OTB & DESIGN">OTB & DESIGN</SelectItem>
                    <SelectItem value="RESERVATION & VISA">RESERVATION & VISA</SelectItem>
                    <SelectItem value="ACCOUNT DEPARTMENT">ACCOUNT DEPARTMENT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="signup-role">Role</Label>
              <Select value={signupRole} onValueChange={setSignupRole}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Staff (Employee)</SelectItem>
                  <SelectItem value="branch_leader">Branch Leader</SelectItem>
                  <SelectItem value="head_of_department">Head of Department (HOD)</SelectItem>
                  <SelectItem value="finance_manager">Finance Manager</SelectItem>
                  <SelectItem value="managing_director">Managing Director (MD)</SelectItem>
                  <SelectItem value="hr_admin">HR Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input id="signup-password" type="password" placeholder="Min. 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#1dc8cc] hover:bg-[#15a3a6] text-white" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
