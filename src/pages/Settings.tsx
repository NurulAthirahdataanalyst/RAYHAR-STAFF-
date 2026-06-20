import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, UserPlus, Loader2, Plus, AlertCircle,
  SlidersHorizontal, MapPin, Layers, Info, Cloud, CheckCircle2, History, X, Save, BellRing, Calendar, Clock
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"system" | "staff" | "branch" | "department">("system");
  
  // States
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [deptStats, setDeptStats] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Branch Form State
  const [branchCode, setBranchCode] = useState("");
  const [branchNameInput, setBranchNameInput] = useState("");
  const [branchLocationInput, setBranchLocationInput] = useState("");
  const [submittingBranch, setSubmittingBranch] = useState(false);

  // Add Department Form State
  const [deptCode, setDeptCode] = useState("");
  const [deptNameInput, setDeptNameInput] = useState("");
  const [submittingDept, setSubmittingDept] = useState(false);
  const [deptManager, setDeptManager] = useState("");
  const [isDeptActive, setIsDeptActive] = useState(true);

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
  const [initialSettings, setInitialSettings] = useState({
    alerts: true,
    scheduling: false,
    startTime: "09:00 AM"
  });

  // Real-time deployment operator log
  const [deploymentLog, setDeploymentLog] = useState({
    timestamp: "June 20, 2026 · 09:00 AM",
    operator: "Athirah Rahman (HR Admin)"
  });

  // SSE telemetry event log
  const [sseEvents, setSseEvents] = useState<string[]>([
    "SSE connection active on channel #config-sync",
    "Listening for global configuration broadcast..."
  ]);

  // Sync initial user details to deployment log on load
  useEffect(() => {
    if (user) {
      const name = user.full_name || user.name || "Athirah Rahman";
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setDeploymentLog({
        timestamp: `${dateStr} · ${timeStr}`,
        operator: `${name} (${role === 'hr_admin' ? 'HR Admin' : 'Admin'})`
      });
    }
  }, [user, role]);

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
        const deptRes = await fetch(`${API_BASE_URL}/api/departments`);
        const deptData = await deptRes.json();
        if (deptData.success) {
          setDepartments(deptData.departments.map((d: any) => d.name));
          setDeptStats(deptData.departments);
        }
        
        // 3. Fetch Settings
        const settingsRes = await fetch(`${API_BASE_URL}/api/settings`);
        const settingsData = await settingsRes.json();
        if (settingsData.success && settingsData.settings) {
          const time = settingsData.settings.lateThreshold || "09:00 AM";
          setWorkStartTime(time);
          setInitialSettings({
            alerts: true,
            scheduling: false,
            startTime: time
          });
        }
      } catch (err) {
        console.error("Settings initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  // SSE connection for real-time telemetry
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/api/presence/stream`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const time = new Date().toLocaleTimeString();
        
        if (data.type === "config-change") {
          const roleStr = data.operatorRole === 'hr_admin' ? 'HR Admin' : data.operatorRole || 'Admin';
          const msg = `[SSE] ${time} - ${data.operatorName} (${roleStr}): ${data.action}`;
          setSseEvents(prev => [msg, ...prev].slice(0, 50));
          
          if (data.action.includes("System Configuration updated")) {
            const dateStr = new Date(data.timestamp || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            setDeploymentLog({
              timestamp: `${dateStr} · ${new Date(data.timestamp || new Date()).toLocaleTimeString()}`,
              operator: `${data.operatorName} (${roleStr})`
            });
          }
        } else if (data.type === "clock-in") {
          setSseEvents(prev => [`[SSE] ${time} - User ${data.userId} clocked in`, ...prev].slice(0, 50));
        } else if (data.type === "clock-out") {
          setSseEvents(prev => [`[SSE] ${time} - User ${data.userId} clocked out`, ...prev].slice(0, 50));
        } else if (data.type === "leave-status") {
          setSseEvents(prev => [`[SSE] ${time} - Leave request #${data.leaveId} status updated to ${data.status} for User ${data.userId}`, ...prev].slice(0, 50));
        } else if (data.type === "employee-status-change") {
          setSseEvents(prev => [`[SSE] ${time} - Employee ${data.userId} status changed to ${data.status}`, ...prev].slice(0, 50));
        }
      } catch (e) {
        console.error("Failed to parse SSE event:", e);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
    };
    
    return () => {
      eventSource.close();
    };
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
          name: branchNameInput.trim(),
          location: branchLocationInput.trim(),
          operatorName: user?.full_name || user?.name || "Athirah Rahman",
          operatorRole: role || "hr_admin"
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Branch ${branchNameInput} registered successfully!`);
        setBranchCode("");
        setBranchNameInput("");
        setBranchLocationInput("");
        
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

  // Add Department Submit
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptCode || !deptNameInput) {
      toast.error("Department Code and Name are required");
      return;
    }
    setSubmittingDept(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: deptCode.trim().toUpperCase(),
          name: deptNameInput.trim(),
          operatorName: user?.full_name || user?.name || "Athirah Rahman",
          operatorRole: role || "hr_admin"
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Department ${deptNameInput} registered successfully!`);
        setDeptCode("");
        setDeptNameInput("");
        setDeptManager("");
        setIsDeptActive(true);
        
        // Refresh departments list
        const deptRes = await fetch(`${API_BASE_URL}/api/departments`);
        const deptData = await deptRes.json();
        if (deptData.success) {
          setDepartments(deptData.departments.map((d: any) => d.name));
          setDeptStats(deptData.departments);
        }
      } else {
        toast.error(data.error || "Failed to register department");
      }
    } catch (err) {
      toast.error("Network connection error");
    } finally {
      setSubmittingDept(false);
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
          full_name: staffName.trim(),
          branch: staffBranch,
          department: staffDept || "Unassigned",
          role: staffRole,
          status: staffStatus,
          operatorName: user?.full_name || user?.name || "Athirah Rahman",
          operatorRole: role || "hr_admin"
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

  // Save Settings Changes
  const handleSaveSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lateThreshold: workStartTime,
          operatorName: user?.full_name || user?.name || "Athirah Rahman",
          operatorRole: role || "hr_admin"
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setInitialSettings({
          alerts: isAlertsEnabled,
          scheduling: isSchedulingEnabled,
          startTime: workStartTime
        });
        toast.success("System configurations deployed successfully!");
      } else {
        toast.error("Failed to deploy configuration");
      }
    } catch (err) {
      toast.error("Error connecting to settings API");
    }
  };

  // Discard Settings Changes
  const handleDiscardSettings = () => {
    setIsAlertsEnabled(initialSettings.alerts);
    setIsSchedulingEnabled(initialSettings.scheduling);
    setWorkStartTime(initialSettings.startTime);
    toast.info("Unsaved configurations discarded");
  };

  const hasUnsavedChanges = 
    isAlertsEnabled !== initialSettings.alerts || 
    isSchedulingEnabled !== initialSettings.scheduling || 
    workStartTime !== initialSettings.startTime;

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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Portal Configurations</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold opacity-70 mt-1">
            Configure global branches, staff roles, and check-in parameters
          </p>
        </div>
        <button 
          onClick={() => toast.info("Audit logs are locked. Only system super-admins can view detailed log histories.")}
          className="flex items-center self-start sm:self-auto gap-2 px-4 py-2 bg-[#7B0099]/10 text-[#7B0099] hover:bg-[#7B0099]/15 border border-[#7B0099]/20 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-sm"
        >
          <History className="w-3.5 h-3.5" />
          <span>View Audit Log</span>
        </button>
      </div>

      {/* HORIZONTAL NAVIGATION TABS - PILL REDESIGN */}
      <div className="flex bg-[#7B0099] p-1.5 rounded-2xl md:rounded-full shadow-lg overflow-x-auto gap-2 scrollbar-none items-center">
        {[
          { id: "system", label: "System Configuration", icon: SlidersHorizontal },
          { id: "staff", label: "Personnel Management", icon: UserPlus },
          { id: "branch", label: "Branch Management", icon: MapPin },
          { id: "department", label: "Department Management", icon: Layers }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2.5 px-6 font-black text-[10px] uppercase tracking-widest whitespace-nowrap rounded-full transition-all duration-300 ${
                isActive 
                  ? "bg-white text-[#7B0099] shadow-md scale-100 animate-in zoom-in-95 duration-200" 
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#7B0099]" : "text-white/80"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE TAB CONTENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        
        {/* LEFT/MAIN CONTAINER (SPAN 2 COLS) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TAB 1: SYSTEM CONFIGURATION */}
          {activeTab === "system" && (
            <Card className="border-none shadow-sm bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-[20px] overflow-hidden p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#7B0099]/10 rounded-xl text-[#7B0099]">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight">Core Operations</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">Manage alerts, scheduling triggers, and timing boundaries</p>
                  </div>
                </div>
                {hasUnsavedChanges && (
                  <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-500/20 animate-pulse">
                    Pending Updates
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {/* Switch Item 1 */}
                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#7B0099]/10 flex items-center justify-center text-[#7B0099] shrink-0">
                      <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-foreground uppercase tracking-wider block">Real-time Notification Alerts</span>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 max-w-sm sm:max-w-md normal-case leading-relaxed">
                        Enables WebSocket-driven instantaneous alerts across all admin client instances. Recommended for high-volume environments.
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Latency: &lt; 50ms</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsAlertsEnabled(!isAlertsEnabled);
                      toast.success(`SSE Alerts toggled ${!isAlertsEnabled ? 'ON' : 'OFF'}`);
                    }}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-all shrink-0 ${isAlertsEnabled ? 'bg-[#7B0099]' : 'bg-muted-foreground/30'}`}
                  >
                    <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-all ${isAlertsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Switch Item 2 */}
                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-foreground uppercase tracking-wider block">Automated Report Scheduling</span>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 max-w-sm sm:max-w-md normal-case leading-relaxed">
                        Distribute comprehensive analytics PDF and CSV reports to designated department heads automatically based on defined cycle.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Select 
                      disabled={!isSchedulingEnabled}
                      value="monthly" 
                      onValueChange={(val) => {
                        toast.info(`Report frequency updated to ${val}`);
                      }}
                    >
                      <SelectTrigger className="w-[110px] h-8 text-[10px] font-black rounded-lg border-border bg-background/30">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="daily" className="text-[9px] font-black uppercase">Daily</SelectItem>
                        <SelectItem value="weekly" className="text-[9px] font-black uppercase">Weekly</SelectItem>
                        <SelectItem value="monthly" className="text-[9px] font-black uppercase">Monthly (1st)</SelectItem>
                      </SelectContent>
                    </Select>
                    <button 
                      onClick={() => {
                        setIsSchedulingEnabled(!isSchedulingEnabled);
                        toast.success(`Weekly Report Schedule toggled ${!isSchedulingEnabled ? 'ON' : 'OFF'}`);
                      }}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-all ${isSchedulingEnabled ? 'bg-[#7B0099]' : 'bg-muted-foreground/30'}`}
                    >
                      <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-all ${isSchedulingEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* Input Item 3 */}
                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-foreground uppercase tracking-wider block">Late Arrivals Window</span>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 max-w-sm sm:max-w-md normal-case leading-relaxed">
                        The grace period duration before a transaction or staff check-in is flagged as 'Delayed' in the global monitor.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={workStartTime} onValueChange={(val) => {
                      setWorkStartTime(val);
                      toast.info(`Late threshold time selected: ${val}`);
                    }}>
                      <SelectTrigger className="w-[110px] h-8 text-[10px] font-black rounded-lg border-border bg-background/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="08:00 AM" className="text-[9px] font-black uppercase">08:00 AM</SelectItem>
                        <SelectItem value="08:30 AM" className="text-[9px] font-black uppercase">08:30 AM</SelectItem>
                        <SelectItem value="09:00 AM" className="text-[9px] font-black uppercase">09:00 AM</SelectItem>
                        <SelectItem value="09:30 AM" className="text-[9px] font-black uppercase">09:30 AM</SelectItem>
                        <SelectItem value="10:00 AM" className="text-[9px] font-black uppercase">10:00 AM</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-[10px] font-black text-muted-foreground uppercase">Minutes</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 2: PERSONNEL MANAGEMENT */}
          {activeTab === "staff" && (
            <Card className="border-none shadow-sm bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-[20px] overflow-hidden p-6 space-y-6 animate-in slide-in-from-left duration-300">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
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
                    <Select 
                      value={staffBranch} 
                      onValueChange={(val) => {
                        setStaffBranch(val);
                        if (val !== "HQ") {
                          setStaffDept("");
                        }
                      }}
                    >
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
                  
                  {staffBranch === "HQ" && (
                    <div className="space-y-1.5 animate-in fade-in duration-300">
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
                  )}

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

                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setStaffName("");
                      setStaffEmail("");
                      setStaffPassword("");
                      setStaffBranch("");
                      setStaffDept("");
                      setStaffRole("employee");
                      setStaffStatus("Active");
                      toast.info("Form reset");
                    }}
                    className="h-11 px-6 rounded-xl border border-border bg-background/20 hover:bg-background/40 text-foreground font-black text-[9px] uppercase tracking-wider"
                  >
                    Reset Form
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingStaff}
                    className="h-11 px-8 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/95 font-black text-[9px] uppercase tracking-wider shadow-lg shadow-[#7B0099]/15 transition-all"
                  >
                    {submittingStaff ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Onboard Staff
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 3: BRANCH MANAGEMENT */}
          {activeTab === "branch" && (
            <Card className="border-none shadow-sm bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-[20px] overflow-hidden p-6 space-y-6 animate-in slide-in-from-left duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#7B0099]/10 rounded-xl text-[#7B0099]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight">Branch Registration</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">Insert a new regional branch office into the database</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button 
                    type="button"
                    onClick={() => toast.info("Template downloaded successfully.")}
                    className="px-2.5 py-1.5 border border-border/80 rounded-lg bg-background/25 hover:bg-background/40 text-[8px] font-black uppercase tracking-wider"
                  >
                    Export Template
                  </button>
                  <button 
                    type="button"
                    onClick={() => toast.info("Select a CSV/Excel file to start bulk importing branches.")}
                    className="px-2.5 py-1.5 bg-[#7B0099] text-white rounded-lg hover:bg-[#7B0099]/95 text-[8px] font-black uppercase tracking-wider shadow-sm"
                  >
                    Bulk Import
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddBranch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Branch Code (UID)</label>
                    <input
                      type="text"
                      placeholder="e.g. HUB-SEA-001"
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value)}
                      className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-black uppercase placeholder:normal-case outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Branch Name</label>
                    <input
                      type="text"
                      placeholder="e.g. North Seattle Regional HQ"
                      value={branchNameInput}
                      onChange={(e) => setBranchNameInput(e.target.value)}
                      className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-bold placeholder:normal-case outline-none"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Branch Location / District</label>
                    <input
                      type="text"
                      placeholder="e.g. Alor Setar, Kedah"
                      value={branchLocationInput}
                      onChange={(e) => setBranchLocationInput(e.target.value)}
                      className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-bold placeholder:normal-case uppercase outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Primary Contact Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +60 (555) 000-0000"
                      className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Administrative Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. branch-admin@enterprise.com"
                      className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setBranchCode("");
                      setBranchNameInput("");
                      setBranchLocationInput("");
                    }}
                    className="h-11 px-6 rounded-xl border border-border bg-background/20 hover:bg-background/40 text-foreground font-black text-[9px] uppercase tracking-wider"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingBranch}
                    className="h-11 px-8 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/95 font-black text-[9px] uppercase tracking-wider shadow-lg shadow-[#7B0099]/15 transition-all"
                  >
                    {submittingBranch ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Register Branch
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 4: DEPARTMENT MANAGEMENT */}
          {activeTab === "department" && (
            <Card className="border-none shadow-sm bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-[20px] overflow-hidden p-6 space-y-6 animate-in slide-in-from-left duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#7B0099]/10 rounded-xl text-[#7B0099]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight">Department Registration</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">Initialize a new organizational unit within the enterprise hierarchy</p>
                </div>
              </div>

              <form onSubmit={handleAddDepartment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Department Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Strategic Planning"
                      value={deptNameInput}
                      onChange={(e) => setDeptNameInput(e.target.value)}
                      className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-bold placeholder:normal-case outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Dept Code</label>
                    <input
                      type="text"
                      placeholder="e.g. E.G. STR-PLAN-001"
                      value={deptCode}
                      onChange={(e) => setDeptCode(e.target.value)}
                      className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-black uppercase placeholder:normal-case outline-none"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Department Head / Manager</label>
                    <input
                      type="text"
                      placeholder="Search employee name..."
                      value={deptManager}
                      onChange={(e) => setDeptManager(e.target.value)}
                      className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/30 rounded-2xl h-11 mt-auto">
                    <div>
                      <span className="text-[10px] font-black text-foreground uppercase tracking-wider block">Status: {isDeptActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsDeptActive(!isDeptActive)}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-all ${isDeptActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                    >
                      <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-all ${isDeptActive ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setDeptCode("");
                      setDeptNameInput("");
                      setDeptManager("");
                      setIsDeptActive(true);
                    }}
                    className="h-11 px-6 rounded-xl border border-border bg-background/20 hover:bg-background/40 text-foreground font-black text-[9px] uppercase tracking-wider"
                  >
                    Discard Changes
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingDept}
                    className="h-11 px-8 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/95 font-black text-[9px] uppercase tracking-wider shadow-lg shadow-[#7B0099]/15 transition-all"
                  >
                    {submittingDept ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Department
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>

        {/* RIGHT/SIDEBAR CONTAINER (SPAN 1 COL) */}
        <div className="space-y-6">
          
          {/* SIDEBAR FOR SYSTEM TAB */}
          {activeTab === "system" && (
            <>
              {/* Active Environment */}
              <Card className="border-none shadow-sm bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-[20px] p-6 space-y-5">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Environment</h4>
                <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Cloud className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Production-AZ-East</span>
                  </div>
                  <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 opacity-60" />
                </div>
                
                <div className="p-4 bg-muted/20 border border-border/30 rounded-2xl space-y-1">
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block">Last Configuration Deployment</span>
                  <span className="text-xs font-black text-foreground block">
                    {deploymentLog.timestamp}
                  </span>
                  <span className="text-[9px] font-medium text-muted-foreground block opacity-85">
                    By {deploymentLog.operator}
                  </span>
                </div>
              </Card>

              {/* Real-time SSE Log Stream */}
              <Card className="border-none shadow-sm bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-[20px] p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Live SSE Stream</h4>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-wider">Active</span>
                  </div>
                </div>
                <div className="p-3.5 bg-slate-950 dark:bg-slate-900 border border-border/20 rounded-2xl h-[120px] overflow-y-auto font-mono text-[7px] space-y-2 text-purple-300/80 leading-normal scrollbar-thin">
                  {sseEvents.map((evt, i) => (
                    <div key={i} className="break-all border-b border-white/5 pb-1 last:border-0">
                      {evt}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Action Bar Footer equivalent */}
              {hasUnsavedChanges && (
                <Card className="border-none shadow-sm bg-amber-500/10 border border-amber-500/25 rounded-[20px] p-5 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider leading-normal">
                      You have unsaved changes in portal configurations. Deactivate or save to deploy changes.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleDiscardSettings}
                      className="flex-1 h-9 rounded-xl border border-amber-500/20 hover:bg-amber-500/10 bg-transparent text-amber-700 dark:text-amber-400 font-black text-[8px] uppercase tracking-widest"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Discard
                    </Button>
                    <Button 
                      onClick={handleSaveSettings}
                      className="flex-1 h-9 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/95 font-black text-[8px] uppercase tracking-widest shadow-md"
                    >
                      <Save className="w-3.5 h-3.5 mr-1" />
                      Save Changes
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* SIDEBAR FOR STAFF TAB */}
          {activeTab === "staff" && (
            <>
              {/* Guidelines */}
              <Card className="border-none shadow-sm bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-[20px] p-6 space-y-5">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Onboarding Policy</h4>
                <div className="space-y-3.5">
                  {[
                    "New credentials must be unique enterprise-wide.",
                    "Staff must be assigned to an active branch node.",
                    "System role determines feature access level."
                  ].map((rule, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-normal">{rule}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Department Structure List */}
              <Card className="border-none shadow-sm bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-[20px] p-6 space-y-5">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">HQ Department Structure</h4>
                <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {deptStats.map((dept) => (
                    <div key={dept.name} className="flex items-center justify-between p-3 bg-muted/20 border border-border/30 rounded-xl">
                      <span className="text-[10px] font-black text-foreground uppercase tracking-wider">{dept.name}</span>
                      <span className="text-[9px] font-black bg-[#7B0099]/10 text-[#7B0099] px-2 py-0.5 rounded-full">{dept.employee_count} Staff</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* SIDEBAR FOR BRANCH TAB */}
          {activeTab === "branch" && (
            <>
              {/* Network Density Mock Visualizer */}
              <Card className="border-none shadow-sm bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-[20px] p-6 space-y-4">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Regional Network Density</h4>
                <div className="aspect-video w-full rounded-2xl bg-slate-900 border border-border/30 overflow-hidden relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />
                  <div className="relative flex flex-col items-center gap-1 opacity-80 scale-90">
                    <div className="flex gap-6">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                    </div>
                    <div className="w-16 h-[1px] bg-white/20 my-1 rotate-12" />
                    <div className="flex gap-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                  </div>
                  <span className="absolute bottom-2 right-3 text-[7px] font-black text-white/30 uppercase tracking-widest">Live Map View</span>
                </div>
              </Card>

              {/* Recent Clusters */}
              <Card className="border-none shadow-sm bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-[20px] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Recent Clusters</h4>
                  <button 
                    onClick={() => toast.info("No older branch clusters logged.")}
                    className="text-[8px] font-black text-[#7B0099] hover:underline uppercase tracking-wider"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "Austin Tech Center", code: "TX-ATC-092", status: "Active", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
                    { name: "Miami Logistics", code: "FL-MLO-114", status: "Active", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
                    { name: "Boston R&D Hub", code: "MA-BRD-005", status: "Provisioning", color: "text-amber-600 bg-amber-500/10 border-amber-500/20" }
                  ].map((cluster, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/20 border border-border/30 rounded-xl">
                      <div className="flex flex-col space-y-0.5">
                        <span className="text-[10px] font-black text-foreground uppercase tracking-wider">{cluster.name}</span>
                        <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">{cluster.code}</span>
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${cluster.color}`}>
                        {cluster.status}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Purple Alert Note */}
              <div className="p-5 bg-[#7B0099] border border-[#7B0099]/30 rounded-[20px] text-white space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-200" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-100">Registry Note</span>
                </div>
                <p className="text-[9px] font-semibold tracking-wide text-purple-200 leading-relaxed">
                  New branches are automatically assigned a network gateway. Verification may take up to 24 hours for security clearance.
                </p>
              </div>
            </>
          )}

          {/* SIDEBAR FOR DEPARTMENT TAB */}
          {activeTab === "department" && (
            <>
              {/* Current structure list */}
              <Card className="border-none shadow-sm bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-[20px] p-6 space-y-4">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Current Structure</h4>
                <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                  {deptStats.map((dept, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/20 border border-border/30 rounded-xl">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-foreground uppercase tracking-wider">{dept.name}</span>
                        <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest font-bold">Registered HQ</span>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                        Active
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 bg-[#7B0099]/5 border border-[#7B0099]/20 rounded-xl border-dashed">
                    <span className="text-[10px] font-black text-[#7B0099] uppercase tracking-wider">[New Department]</span>
                    <span className="text-[8px] font-black uppercase text-[#7B0099]/70 tracking-widest">Awaiting creation</span>
                  </div>
                </div>
              </Card>

              {/* Enterprise Quota Progress */}
              <Card className="border-none shadow-sm bg-[#7B0099] border border-[#7B0099]/30 rounded-[20px] p-6 text-white space-y-4">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-purple-200">Enterprise Quota</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black">{deptStats.length}</span>
                    <span className="text-sm font-bold text-purple-200">/ 15 Departments</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (deptStats.length / 15) * 100)}%` }}
                  />
                </div>
              </Card>

              {/* Policy Checklist */}
              <Card className="border-none shadow-sm bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-[20px] p-6 space-y-4">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Policy Checklist</h4>
                <div className="space-y-3">
                  {[
                    "Department code must be unique enterprise-wide.",
                    "Initial budget must not exceed branch surplus.",
                    "Assigned manager must be a Full-Time employee."
                  ].map((policy, idx) => (
                    <div key={idx} className="flex gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider leading-normal">{policy}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

        </div>

      </div>
    </div>
  );
}
