import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, UserPlus, Settings2, Loader2, Plus, AlertCircle, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config/api";

interface Branch {
  code: string;
  name: string;
}

interface Department {
  name: string;
  employee_count: number;
}

export default function SettingsPage() {
  const { role } = useRole();
  
  // States
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [deptStats, setDeptStats] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Branch Form State
  const [branchCode, setBranchCode] = useState("");
  const [branchNameInput, setBranchNameInput] = useState("");
  const [submittingBranch, setSubmittingBranch] = useState(false);

  // Add Staff Form State
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffBranch, setStaffBranch] = useState("");
  const [staffDept, setStaffDept] = useState("");
  const [staffRole, setStaffRole] = useState("employee");
  const [staffStatus, setStaffStatus] = useState("Active");
  const [submittingStaff, setSubmittingStaff] = useState(false);

  // System Configurations Toggles
  const [isAlertsEnabled, setIsAlertsEnabled] = useState(true);
  const [isSchedulingEnabled, setIsSchedulingEnabled] = useState(false);
  const [workStartTime, setWorkStartTime] = useState("09:00 AM");

  // Fetch Init Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Branches
        const branchRes = await fetch(`${API_BASE_URL}/api/branches`);
        const branchData = await branchRes.json();
        if (branchData.success) setBranches(branchData.branches);

        // 2. Fetch Departments
        const deptRes = await fetch(`${API_BASE_URL}/api/master/department`);
        const deptData = await deptRes.json();
        if (deptData.success) {
          setDepartments(deptData.departments.map((d: any) => d.name));
          setDeptStats(deptData.departments);
        }
      } catch (err) {
        console.error("Settings initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  // Add Branch Submit
  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchCode || !branchNameInput) {
      toast.error("Branch Code and Name are required");
      return;
    }
    setSubmittingBranch(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: branchCode.trim().toUpperCase(),
          name: branchNameInput.trim()
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Branch ${branchNameInput} registered successfully!`);
        setBranchCode("");
        setBranchNameInput("");
        
        // Refresh branches list
        const branchRes = await fetch(`${API_BASE_URL}/api/branches`);
        const branchData = await branchRes.json();
        if (branchData.success) setBranches(branchData.branches);
      } else {
        toast.error(data.error || "Failed to register branch");
      }
    } catch (err) {
      toast.error("Network connection error");
    } finally {
      setSubmittingBranch(false);
    }
  };

  // Onboard Staff Submit
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffEmail || !staffPassword || !staffBranch) {
      toast.error("Name, Email, Password, and Branch are required");
      return;
    }
    setSubmittingStaff(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: staffEmail.trim(),
          password: staffPassword,
          fullName: staffName.trim(),
          branch: staffBranch,
          department: staffDept || "Unassigned",
          role: staffRole,
          status: staffStatus
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Staff account for ${staffName} created successfully!`);
        setStaffName("");
        setStaffEmail("");
        setStaffPassword("");
        setStaffBranch("");
        setStaffDept("");
        setStaffRole("employee");
        setStaffStatus("Active");
      } else {
        toast.error(data.error || "Failed to onboard staff");
      }
    } catch (err) {
      toast.error("Error connecting to server");
    } finally {
      setSubmittingStaff(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-[#7B0099] w-10 h-10 opacity-60" />
        <p className="text-muted-foreground animate-pulse text-xs font-black uppercase tracking-widest">
          Syncing Portal Configs...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Portal Configuration</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold opacity-70 mt-1">Configure global branches, staff roles, and check-in parameters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
        {/* Form: Register New Branch */}
        <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#7B0099]/10 rounded-xl text-[#7B0099]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight">Register New Branch</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">Insert a new regional branch office into the database</p>
            </div>
          </div>

          <form onSubmit={handleAddBranch} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-1">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Branch Code</label>
                <input
                  type="text"
                  placeholder="e.g. KMM"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-black uppercase placeholder:normal-case outline-none"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kemaman Branch Office"
                  value={branchNameInput}
                  onChange={(e) => setBranchNameInput(e.target.value)}
                  className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-bold placeholder:normal-case outline-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submittingBranch}
              className="w-full py-5 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/90 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#7B0099]/15 transition-all"
            >
              {submittingBranch ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Branch to System
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Form: Onboard New Staff */}
        <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#7B0099]/10 rounded-xl text-[#7B0099]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight">Onboard New Staff</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">Add a new employee and configure system authorization role</p>
            </div>
          </div>

          <form onSubmit={handleAddStaff} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter employee's full name"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-bold outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. staff@gmail.com"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-bold outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Password</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-bold outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Office Branch</label>
                <Select value={staffBranch} onValueChange={setStaffBranch}>
                  <SelectTrigger className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-border bg-background/30">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {branches.map(b => (
                      <SelectItem key={b.code} value={b.code} className="text-[10px] font-black uppercase tracking-widest">{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Department</label>
                <Select value={staffDept} onValueChange={setStaffDept}>
                  <SelectTrigger className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-border bg-background/30">
                    <SelectValue placeholder="Select Dept" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {departments.map(d => (
                      <SelectItem key={d} value={d} className="text-[10px] font-black uppercase tracking-widest">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">System Authorization Role</label>
                <Select value={staffRole} onValueChange={setStaffRole}>
                  <SelectTrigger className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-border bg-background/30">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="employee" className="text-[10px] font-black uppercase tracking-widest">Employee (Staff)</SelectItem>
                    <SelectItem value="finance_manager" className="text-[10px] font-black uppercase tracking-widest">Finance Manager</SelectItem>
                    <SelectItem value="managing_director" className="text-[10px] font-black uppercase tracking-widest">Managing Director</SelectItem>
                    <SelectItem value="head_of_department" className="text-[10px] font-black uppercase tracking-widest">Head of Department (HOD)</SelectItem>
                    <SelectItem value="branch_leader" className="text-[10px] font-black uppercase tracking-widest">Branch Leader</SelectItem>
                    <SelectItem value="hr_admin" className="text-[10px] font-black uppercase tracking-widest">HR Administrator</SelectItem>
                    <SelectItem value="branch_officer" className="text-[10px] font-black uppercase tracking-widest">Branch Officer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Employment Status</label>
                <Select value={staffStatus} onValueChange={setStaffStatus}>
                  <SelectTrigger className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-border bg-background/30">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Active" className="text-[10px] font-black uppercase tracking-widest">Active Personnel</SelectItem>
                    <SelectItem value="Inactive" className="text-[10px] font-black uppercase tracking-widest">Suspended / Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submittingStaff}
              className="w-full py-5 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/90 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#7B0099]/15 transition-all mt-2"
            >
              {submittingStaff ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Staff Account
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Configurations panel */}
        <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#7B0099]/10 rounded-xl text-[#7B0099]">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight">System Configurations</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">Manage alerts, currencies, and shift check-in windows</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/30 rounded-2xl">
              <div>
                <span className="text-[10px] font-black text-foreground uppercase tracking-wider">Real-time Notification Alerts</span>
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Receive immediate SSE socket alerts</p>
              </div>
              <button 
                onClick={() => {
                  setIsAlertsEnabled(!isAlertsEnabled);
                  toast.success(`SSE Socket Alerts ${!isAlertsEnabled ? 'enabled' : 'disabled'}`);
                }}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-all ${isAlertsEnabled ? 'bg-[#7B0099]' : 'bg-muted-foreground/30'}`}
              >
                <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-all ${isAlertsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/30 rounded-2xl">
              <div>
                <span className="text-[10px] font-black text-foreground uppercase tracking-wider">Automated Report Scheduling</span>
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Generate and email weekly performance audits</p>
              </div>
              <button 
                onClick={() => {
                  setIsSchedulingEnabled(!isSchedulingEnabled);
                  toast.success(`Weekly Schedule ${!isSchedulingEnabled ? 'enabled' : 'disabled'}`);
                }}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-all ${isSchedulingEnabled ? 'bg-[#7B0099]' : 'bg-muted-foreground/30'}`}
              >
                <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-all ${isSchedulingEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/30 rounded-2xl">
              <div>
                <span className="text-[10px] font-black text-foreground uppercase tracking-wider">Late Arrivals Window</span>
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Define shift late threshold time</p>
              </div>
              <Select value={workStartTime} onValueChange={(val) => {
                setWorkStartTime(val);
                toast.success(`Late threshold updated to ${val}`);
              }}>
                <SelectTrigger className="w-[120px] h-9 text-[10px] font-black rounded-xl border-border bg-background/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="08:00 AM" className="text-[10px] font-black uppercase tracking-widest">08:00 AM</SelectItem>
                  <SelectItem value="08:30 AM" className="text-[10px] font-black uppercase tracking-widest">08:30 AM</SelectItem>
                  <SelectItem value="09:00 AM" className="text-[10px] font-black uppercase tracking-widest">09:00 AM</SelectItem>
                  <SelectItem value="09:30 AM" className="text-[10px] font-black uppercase tracking-widest">09:30 AM</SelectItem>
                  <SelectItem value="10:00 AM" className="text-[10px] font-black uppercase tracking-widest">10:00 AM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* HQ Department Structure Visuals */}
        <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#7B0099]/10 rounded-xl text-[#7B0099]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight">HQ Department Structure</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">Visual representation of core departments and active employee capacity</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {deptStats.map((dept) => (
              <div key={dept.name} className="flex flex-col justify-between p-3.5 bg-muted/20 border border-border/30 hover:border-[#7B0099]/30 rounded-2xl shadow-inner select-none transition-all">
                <span className="text-[10px] font-black text-foreground truncate uppercase tracking-wider">{dept.name}</span>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-xl font-black text-[#7B0099]">{dept.employee_count}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Staff</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
