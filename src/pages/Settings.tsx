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
import { useState, useEffect, useCallback } from "react";
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

type SettingsTab = "system" | "staff" | "branch" | "department";

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

  const [leaveSearch, setLeaveSearch] = useState("");
  const [selectedLeaveBranch, setSelectedLeaveBranch] = useState("");
  const [selectedLeaveDept, setSelectedLeaveDept] = useState("");
  const [selectedLeaveType, setSelectedLeaveType] = useState("");
  const [selectedLeaveYear, setSelectedLeaveYear] = useState(String(new Date().getFullYear()));
  const [selectedLeaveStatus, setSelectedLeaveStatus] = useState("Active");
  const [leaveRows, setLeaveRows] = useState<any[]>([]);
  const [leaveSummary, setLeaveSummary] = useState({ totalEmployees: 0, carryForwardEligible: 0, pendingAdjustments: 0, expiringSoon: 0 });
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [sseStatus, setSseStatus] = useState("Connecting");
  
  // Which leave workspace module is active (left submenu)
  const [selectedLeaveModule, setSelectedLeaveModule] = useState<string>("Annual Leave Allocation");

  const leaveTypes = ["Annual Leave", "Carry Forward", "Special Leave", "Medical Leave", "Unpaid Leave"];
  const leaveStatusOptions = ["Active", "Pending", "Approved", "Forfeited"];
  const leaveYears = [String(new Date().getFullYear()), String(new Date().getFullYear() - 1), String(new Date().getFullYear() - 2)];

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

  const fetchLeaveEntitlements = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLeaveBranch) params.set("branch", selectedLeaveBranch);
      if (selectedLeaveDept) params.set("department", selectedLeaveDept);
      if (leaveSearch) params.set("search", leaveSearch);
      if (selectedLeaveType) params.set("leaveType", selectedLeaveType);
      if (selectedLeaveYear) params.set("year", selectedLeaveYear);
      if (selectedLeaveStatus) params.set("status", selectedLeaveStatus);

      const response = await fetch(`${API_BASE_URL}/api/leave-entitlements?${params.toString()}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setLeaveRows(data.entitlements || []);
        setLeaveSummary(data.summary || { totalEmployees: 0, carryForwardEligible: 0, pendingAdjustments: 0, expiringSoon: 0 });
      }
    } catch (err) {
      console.error("Leave entitlement refresh error:", err);
    } finally {
      setLeaveLoading(false);
    }
  }, [leaveSearch, selectedLeaveBranch, selectedLeaveDept, selectedLeaveType, selectedLeaveYear, selectedLeaveStatus]);

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

        // 5. Fetch leave entitlements
        await fetchLeaveEntitlements();

      } catch (err) {
        console.error("Settings initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [fetchLeaveEntitlements]);

  // Removed fetchLeaveEntitlements from here

  // SSE connection for real-time telemetry
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/api/presence/stream`);

    eventSource.onopen = () => {
      setSseStatus("Live");
    };

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
          void fetchLeaveEntitlements();
        } else if (data.type === "employee-status-change") {
          setSseEvents(prev => [`[SSE] ${time} - Employee ${data.userId} status changed to ${data.status}`, ...prev].slice(0, 50));
          void fetchLeaveEntitlements();
        }
      } catch (e) {
        console.error("Failed to parse SSE event:", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      setSseStatus("Reconnecting");
    };

    return () => {
      eventSource.close();
    };
  }, [fetchLeaveEntitlements]);

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
          { id: "department", label: "Department Management", icon: Layers }
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
      <div className="grid grid-cols-1 gap-4 sm:gap-5 items-start lg:grid-cols-3">
        
        {/* LEFT/MAIN CONTAINER (SPAN 2 COLS) */}
        <div className="lg:col-span-2 space-y-4">
          
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

        </div>
      </div>
    </div>
  );
}
