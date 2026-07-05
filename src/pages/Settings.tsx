import { useRole } from "@/contexts/RoleContext";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, UserPlus, Loader2, Plus, AlertCircle,
  SlidersHorizontal, MapPin, Layers, Info, Cloud, CheckCircle2, History, X, Save, BellRing, Calendar, Clock, CalendarDays
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config/api";

interface Branch {
  code: string;
  name: string;
  location?: string;
}

interface Department {
  name: string;
  employee_count: number;
}

type SettingsTab = "system" | "staff" | "branch" | "department" | "leave-entitlement";

export default function SettingsPage() {
  const { role } = useRole();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialTab = (searchParams.get("tab") as SettingsTab) || "system";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const handleTabChange = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };
  
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
  const [staffRole, setStaffRole] = useState("");
  const [staffStatus, setStaffStatus] = useState("Active");
  const [submittingStaff, setSubmittingStaff] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);

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

        // 4. Fetch Roles
        const rolesRes = await fetch(`${API_BASE_URL}/api/roles`);
        const rolesData = await rolesRes.json();
        if (rolesData.success) setAvailableRoles(rolesData.roles);

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
          role: staffRole.toLowerCase().replace(/ /g, '_'),
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
        setStaffRole("");
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
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-500 pb-16">
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
      <div className="inline-flex bg-gradient-to-r from-[#800A7A] via-[#7B0099] to-[#3d0052] p-1.5 rounded-2xl md:rounded-md shadow-lg overflow-x-auto gap-2 scrollbar-none items-center w-full lg:w-fit max-w-full border border-[#7B0099]/20 relative z-10">
        {[
          { id: "system", label: "System Configuration", icon: SlidersHorizontal },
          { id: "staff", label: "Personnel Management", icon: UserPlus },
          { id: "branch", label: "Branch Management", icon: MapPin },
          { id: "department", label: "Department Management", icon: Layers },
          { id: "leave-entitlement", label: "Leave Entitlement Management", icon: CalendarDays }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as SettingsTab)}
              className={`flex items-center gap-2 py-2.5 px-6 font-black text-[10px] uppercase tracking-widest whitespace-nowrap rounded-md transition-all duration-300 ${
                isActive 
                  ? "bg-white text-[#7B0099] border-b-[3px] border-[#d4b0eb] shadow-md active:translate-y-[1px] active:border-b-[1px]" 
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? "text-[#7B0099]" : "text-white/80"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE TAB CONTENTS */}
      <div className={`grid grid-cols-1 gap-4 sm:gap-5 items-start ${
        activeTab === "leave-entitlement" ? "" : "lg:grid-cols-3"
      }`}>
        
        {/* LEFT/MAIN CONTAINER (SPAN 2 COLS) */}
        <div className={activeTab === "leave-entitlement" ? "space-y-4" : "lg:col-span-2 space-y-4"}>
          
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
                  <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-widest rounded-md border border-amber-500/20 animate-pulse">
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
                    className={`w-12 h-6 flex items-center rounded-md p-1 transition-all shrink-0 ${isAlertsEnabled ? 'bg-[#7B0099]' : 'bg-muted-foreground/30'}`}
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
                      className={`w-12 h-6 flex items-center rounded-md p-1 transition-all ${isSchedulingEnabled ? 'bg-[#7B0099]' : 'bg-muted-foreground/30'}`}
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
                        {availableRoles.filter(r => r.status === 'Active').map(r => (
                          <SelectItem key={r.id} value={r.name} className="text-[10px] font-black uppercase tracking-widest">
                            {r.name}
                          </SelectItem>
                        ))}
                        {availableRoles.filter(r => r.status === 'Active').length === 0 && (
                          <SelectItem value="Employee" disabled className="text-[10px] font-black uppercase tracking-widest">No roles available</SelectItem>
                        )}
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
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Branch Code</label>
                    <input
                      type="text"
                      placeholder="e.g. AOR "
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value)}
                      className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-black uppercase placeholder:normal-case outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Branch Name</label>
                    <input
                      type="text"
                      placeholder="e.g. ALOR SETAR "
                      value={branchNameInput}
                      onChange={(e) => setBranchNameInput(e.target.value)}
                      className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-bold placeholder:normal-case uppercase outline-none"
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Branch Location / District</label>
                  <input
                    type="text"
                    placeholder="e.g. ALOR SETAR, KEDAH"
                    value={branchLocationInput}
                    onChange={(e) => setBranchLocationInput(e.target.value)}
                    className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-bold placeholder:normal-case uppercase outline-none"
                  />
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
                      className={`w-12 h-6 flex items-center rounded-md p-1 transition-all ${isDeptActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
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

          {/* TAB 5: LEAVE ENTITLEMENT MANAGEMENT */}
          {activeTab === "leave-entitlement" && (
            <div className="space-y-4 animate-in slide-in-from-left duration-300">
              <Card className="border-none shadow-sm bg-gradient-to-r from-[#7B0099] to-[#5E006F] text-white rounded-[18px] overflow-hidden px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/12 border border-white/15">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-[0.22em]">HR Admin Workspace</span>
                    </div>
                    <h3 className="mt-2 text-[20px] sm:text-[24px] leading-none font-black uppercase tracking-tight">
                      Leave Entitlement Management
                    </h3>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-white/78 max-w-2xl">
                      Manage annual leave allocation, carry forward, manual adjustments, special credits, forfeiture, and history in one screen.
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toast.info("Policy sync prepared for the next entitlement cycle.")}
                      className="h-9 px-3.5 rounded-xl bg-white/12 hover:bg-white/18 border border-white/15 text-[9px] font-black uppercase tracking-widest whitespace-nowrap"
                    >
                      Sync Policy
                    </button>
                    <button
                      onClick={() => toast.info("Audit export queued for compliance review.")}
                      className="h-9 px-3.5 rounded-xl bg-white text-[#7B0099] hover:bg-white/90 text-[9px] font-black uppercase tracking-widest whitespace-nowrap"
                    >
                      Export Audit
                    </button>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <Card className="lg:col-span-3 border-none shadow-sm bg-white/75 dark:bg-card/75 backdrop-blur-md rounded-[18px] p-4 space-y-4">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Navigation</h4>
                    <p className="mt-1 text-[10px] text-muted-foreground">Leave management sections</p>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      "Dashboard",
                      "Annual Leave",
                      "Carry Forward",
                      "Adjustments",
                      "Special Leave",
                      "Forfeiture",
                      "History",
                      "Reports",
                    ].map((item, idx) => (
                      <button
                        key={item}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                          idx === 0 ? "bg-[#7B0099]/10 text-[#7B0099]" : "hover:bg-muted/30 text-foreground"
                        }`}
                        onClick={() => {
                          if (item !== "Dashboard") {
                            toast.info(`${item} section will open here.`);
                          }
                        }}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest">{item}</span>
                        <span className="text-[9px] font-black text-current/70">›</span>
                      </button>
                    ))}
                  </div>
                </Card>

                <div className="lg:col-span-9 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5">
                    {[
                      { label: "Employees", value: "1,284" },
                      { label: "Eligible", value: "1,112" },
                      { label: "Carry Forward", value: "326" },
                      { label: "Pending", value: "42" },
                      { label: "Expiring", value: "12" },
                      { label: "Bulk Runs", value: "8" },
                    ].map((item) => (
                      <Card key={item.label} className="border border-border/40 shadow-sm rounded-[16px] p-3 bg-white/75 dark:bg-card/75">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</p>
                        <div className="mt-1 text-[22px] leading-none font-black text-foreground">{item.value}</div>
                      </Card>
                    ))}
                  </div>

                  <Card className="border-none shadow-sm bg-white/75 dark:bg-card/75 backdrop-blur-md rounded-[18px] p-4 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Quick Filters</h4>
                        <p className="text-[10px] text-muted-foreground mt-1">Filter entitlement records before applying actions.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {["Allocate", "Carry Forward", "Adjust", "Forfeit"].map((action) => (
                          <button
                            key={action}
                            onClick={() => toast.info(`${action} action opened.`)}
                            className="h-9 px-3.5 rounded-xl bg-[#7B0099]/8 hover:bg-[#7B0099]/12 border border-[#7B0099]/15 text-[#7B0099] text-[9px] font-black uppercase tracking-widest"
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5">
                      {[
                        "Search Employee...",
                        "Branch",
                        "Department",
                        "Leave Type",
                        "Year",
                        "Status",
                      ].map((placeholder, idx) => (
                        <input
                          key={placeholder}
                          type="text"
                          placeholder={placeholder}
                          className={`h-10 px-3 rounded-xl border border-border/70 bg-background/50 text-[10px] outline-none focus:border-[#7B0099] ${
                            idx === 0 ? "md:col-span-2" : ""
                          }`}
                        />
                      ))}
                    </div>
                  </Card>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
                    <Card className="xl:col-span-2 border-none shadow-sm bg-white/75 dark:bg-card/75 backdrop-blur-md rounded-[18px] p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entitlement Actions</h4>
                          <p className="text-[10px] text-muted-foreground mt-1">Compact controls for the leave workspace.</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#7B0099]/10 text-[#7B0099] text-[9px] font-black uppercase tracking-widest">
                          HR Only
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          {
                            title: "Annual Leave Allocation",
                            body: "Assign yearly leave entitlements to the selected population at the start of a cycle.",
                          },
                          {
                            title: "Carry Forward Leave",
                            body: "Move unused balance into the new leave year according to policy rules.",
                          },
                          {
                            title: "Additional Leave Allocation",
                            body: "Grant one-off leave for performance rewards, special approval, or compensation.",
                          },
                          {
                            title: "Manual Leave Adjustments",
                            body: "Correct balances when a policy exception or data issue is discovered.",
                          },
                        ].map((item) => (
                          <div key={item.title} className="rounded-[16px] border border-border/40 bg-muted/20 p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#7B0099]" />
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground">{item.title}</h5>
                            </div>
                            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{item.body}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-[16px] border border-[#7B0099]/15 bg-[#7B0099]/5 p-3.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-[#7B0099]">Bulk Allocation</h5>
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#7B0099]/70">Year Start</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <input
                              type="text"
                              placeholder="Target group"
                              className="h-9 px-3 rounded-xl border border-border/70 bg-background/50 text-[10px] outline-none focus:border-[#7B0099]"
                            />
                            <input
                              type="number"
                              placeholder="Days"
                              className="h-9 px-3 rounded-xl border border-border/70 bg-background/50 text-[10px] outline-none focus:border-[#7B0099]"
                            />
                          </div>
                          <button
                            onClick={() => toast.success("Bulk leave allocation preview opened.")}
                            className="w-full h-9 rounded-xl bg-[#7B0099] text-white text-[9px] font-black uppercase tracking-widest"
                          >
                            Prepare Bulk Run
                          </button>
                        </div>

                        <div className="rounded-[16px] border border-border/40 bg-slate-950 text-white p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-purple-200">Policy Controls</h5>
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300">Live</span>
                          </div>
                          <div className="space-y-2">
                            {[
                              "Carry forward cap: 5 days",
                              "Manual adjustments require audit note",
                              "Special leave credits need HR approval",
                              "Forfeiture runs after year-end closure",
                            ].map((rule) => (
                              <div key={rule} className="flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white/85">{rule}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>

                    <div className="space-y-4">
                      <Card className="border-none shadow-sm bg-white/75 dark:bg-card/75 backdrop-blur-md rounded-[18px] p-4 space-y-3">
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Balance Snapshot</h4>
                          <p className="text-[10px] text-muted-foreground mt-1">Quick look at the leave ledger state.</p>
                        </div>
                        <div className="space-y-2.5">
                          {[
                            { label: "Annual Leave", value: "14,820 days" },
                            { label: "Carry Forward", value: "326 days" },
                            { label: "Special Credits", value: "58 days" },
                            { label: "Pending Review", value: "12 cases" },
                          ].map((row) => (
                            <div key={row.label} className="flex items-center justify-between rounded-xl bg-muted/20 border border-border/30 px-3 py-2.5">
                              <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{row.label}</span>
                              <span className="text-[10px] font-black text-[#7B0099]">{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </Card>

                      <Card className="border-none shadow-sm bg-white/75 dark:bg-card/75 backdrop-blur-md rounded-[18px] p-4 space-y-3">
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent History</h4>
                          <p className="text-[10px] text-muted-foreground mt-1">Audit trail of entitlement operations.</p>
                        </div>
                        <div className="space-y-2.5">
                          {[
                            { action: "Bulk allocation", meta: "14 days to 312 employees", time: "Today" },
                            { action: "Carry forward", meta: "5 days moved to 18 staff", time: "Yesterday" },
                            { action: "Manual adjustment", meta: "+2 days for payroll fix", time: "2 days ago" },
                            { action: "Forfeiture run", meta: "Excess 3 days removed", time: "This week" },
                          ].map((item) => (
                            <div key={item.action} className="rounded-xl border border-border/30 bg-muted/20 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{item.action}</p>
                                  <p className="text-[10px] text-muted-foreground">{item.meta}</p>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-[#7B0099]">{item.time}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT/SIDEBAR CONTAINER (SPAN 1 COL) */}
        {activeTab !== "leave-entitlement" && (
          <div className="space-y-4">
          
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
        )}
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
                      <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
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
                      <span className="text-[9px] font-black bg-[#7B0099]/10 text-[#7B0099] px-2 py-0.5 rounded-md">{dept.employee_count} Staff</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* SIDEBAR FOR BRANCH TAB */}
          {activeTab === "branch" && (
            <>
              {/* Malaysia Live Map Visualizer */}
              {(() => {
                const getBranchCoordinates = (code: string, name: string, locationStr: string = "") => {
                  const normCode = code.toUpperCase();
                  const normLoc = locationStr.toLowerCase();
                  const normName = name.toLowerCase();

                  if (normCode === "HQ" || normCode === "KUL") return { x: 25.5, y: 57.5 };
                  if (normCode === "KMM") return { x: 52, y: 46 };
                  if (normCode === "TGG") return { x: 51, y: 29 };
                  if (normCode === "CNH") return { x: 48, y: 48 };
                  if (normCode === "KBG") return { x: 44, y: 33 };
                  if (normCode === "DGN") return { x: 52, y: 36 };
                  if (normCode === "JTH") return { x: 45, y: 21 };
                  if (normCode === "KBR") return { x: 41, y: 17 };
                  if (normCode === "RMP") return { x: 49, y: 65 };
                  if (normCode === "MZM") return { x: 43, y: 62 };
                  if (normCode === "SHA") return { x: 24, y: 58 };
                  if (normCode === "BBB") return { x: 26, y: 60 };
                  if (normCode === "IPH") return { x: 24, y: 36 };
                  if (normCode === "MJG") return { x: 21, y: 39 };
                  if (normCode === "KKS") return { x: 23, y: 30 };
                  if (normCode === "MLK") return { x: 32, y: 72 };
                  if (normCode === "AOR") return { x: 22, y: 20 };
                  if (normCode === "BTM") return { x: 20, y: 27 };
                  if (normCode === "SNS") return { x: 28, y: 64 };
                  if (normCode === "BTP") return { x: 38, y: 79 };
                  if (normCode === "JB") return { x: 46, y: 83 };
                  if (normCode === "TWU") return { x: 162, y: 56 };

                  if (normLoc.includes("terengganu") || normName.includes("terengganu")) {
                    if (normLoc.includes("kemaman") || normName.includes("kemaman") || normLoc.includes("cheneh")) return { x: 50, y: 44 };
                    if (normLoc.includes("dungun") || normName.includes("dungun")) return { x: 51, y: 36 };
                    if (normLoc.includes("kuala berang") || normName.includes("kuala berang")) return { x: 44, y: 33 };
                    if (normLoc.includes("jertih") || normName.includes("jertih") || normLoc.includes("besut")) return { x: 45, y: 21 };
                    return { x: 51, y: 29 };
                  }
                  if (normLoc.includes("kelantan") || normLoc.includes("kota bharu") || normName.includes("kelantan")) return { x: 41, y: 17 };
                  if (normLoc.includes("kedah") || normLoc.includes("alor setar") || normName.includes("kedah")) return { x: 22, y: 20 };
                  if (normLoc.includes("perlis") || normName.includes("perlis")) return { x: 21, y: 15 };
                  if (normLoc.includes("penang") || normLoc.includes("pulau pinang") || normLoc.includes("bertam") || normName.includes("penang")) return { x: 20, y: 27 };
                  if (normLoc.includes("perak") || normLoc.includes("ipoh") || normLoc.includes("manjung") || normName.includes("perak")) {
                    if (normLoc.includes("manjung")) return { x: 21, y: 39 };
                    if (normLoc.includes("kangsar")) return { x: 23, y: 30 };
                    return { x: 24, y: 36 };
                  }
                  if (normLoc.includes("selangor") || normLoc.includes("bangi") || normLoc.includes("shah alam") || normLoc.includes("gombak") || normName.includes("selangor")) {
                    if (normLoc.includes("bangi")) return { x: 26, y: 60 };
                    if (normLoc.includes("gombak")) return { x: 25, y: 55 };
                    return { x: 24, y: 58 };
                  }
                  if (normLoc.includes("kuala lumpur") || normName.includes("kuala lumpur")) return { x: 25.5, y: 57.5 };
                  if (normLoc.includes("negeri sembilan") || normLoc.includes("seremban") || normName.includes("negeri sembilan")) return { x: 28, y: 64 };
                  if (normLoc.includes("melaka") || normLoc.includes("malacca") || normName.includes("melaka")) return { x: 32, y: 72 };
                  if (normLoc.includes("johor") || normLoc.includes("batu pahat") || normLoc.includes("johor bahru") || normName.includes("johor")) {
                    if (normLoc.includes("batu pahat")) return { x: 38, y: 79 };
                    return { x: 46, y: 83 };
                  }
                  if (normLoc.includes("pahang") || normLoc.includes("rompin") || normLoc.includes("muadzam") || normName.includes("pahang")) {
                    if (normLoc.includes("muadzam")) return { x: 43, y: 62 };
                    return { x: 49, y: 65 };
                  }
                  if (normLoc.includes("sabah") || normLoc.includes("tawau") || normLoc.includes("kota kinabalu") || normName.includes("sabah")) return { x: 162, y: 56 };
                  if (normLoc.includes("sarawak") || normLoc.includes("kuching") || normName.includes("sarawak")) return { x: 80, y: 82 };

                  return { x: 25.5, y: 57.5 };
                };

                return (
                  <Card className="border-none shadow-sm bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-[20px] p-6 space-y-4">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest font-sans">Malaysia Network Coverage</h4>
                    <div className="w-full aspect-[2/1] rounded-2xl bg-[#090D1A] border border-border/30 overflow-hidden relative p-4 flex flex-col justify-between shadow-inner">
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-950/20 via-transparent to-transparent" />
                      
                      {/* SVG Map of Malaysia */}
                      <svg className="w-full h-full text-slate-800 dark:text-slate-800/40" viewBox="0 0 200 100" fill="none" stroke="currentColor" strokeWidth="0.8">
                        <defs>
                          <pattern id="map-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#map-grid)" stroke="none" />

                        {/* Peninsular Malaysia Outline */}
                        <path
                          d="M 25 15 L 45 15 L 52 28 L 54 48 L 52 68 L 46 84 L 38 80 L 32 72 L 28 66 L 24 55 L 21 38 L 20 28 L 22 20 Z"
                          fill="rgba(123, 0, 153, 0.08)"
                          stroke="rgba(123, 0, 153, 0.4)"
                          strokeWidth="1"
                          className="transition-all duration-300 hover:fill-rgba(123, 0, 153, 0.15)"
                        />

                        {/* East Malaysia Outline */}
                        <path
                          d="M 80 82 L 92 78 L 102 70 L 115 62 L 125 54 L 132 46 L 142 36 L 152 25 L 165 34 L 168 46 L 162 56 L 138 58 L 115 72 L 92 84 Z"
                          fill="rgba(123, 0, 153, 0.08)"
                          stroke="rgba(123, 0, 153, 0.4)"
                          strokeWidth="1"
                          className="transition-all duration-300 hover:fill-rgba(123, 0, 153, 0.15)"
                        />

                        {/* Dotted separator or scale indication */}
                        <path d="M 70 20 L 70 80" stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                      </svg>

                      {/* Branch Pointers/Markers */}
                      <div className="absolute inset-0 pointer-events-none">
                        {branches.map((b) => {
                          const coords = getBranchCoordinates(b.code, b.name, b.location);
                          return (
                            <div 
                              key={b.code}
                              style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                              className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 pointer-events-auto group/marker cursor-pointer"
                            >
                              {/* Inner glowing dot */}
                              <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-75 shadow-[0_0_8px_rgba(52,211,153,0.8)] filter drop-shadow-[0_0_2px_emerald-500]" />
                              {/* Outer pulse animation */}
                              <span className="absolute -inset-1 rounded-full bg-emerald-400/30 animate-ping duration-1000" />
                              
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[150px] bg-slate-950/90 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md border border-white/10 opacity-0 group-hover/marker:opacity-100 transition-opacity duration-200 pointer-events-none shadow-xl z-50 flex flex-col items-center">
                                <span className="text-emerald-400 mb-0.5">{b.name}</span>
                                <span className="text-[7px] text-white/50">{b.code} • {b.location || 'Branch Office'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <span className="absolute bottom-2 right-3 text-[7px] font-black text-white/30 uppercase tracking-widest pointer-events-none">Malaysia Live Map</span>
                    </div>
                  </Card>
                );
              })()}

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
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${cluster.color}`}>
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
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/20">
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
                      <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
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
