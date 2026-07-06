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
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/12 border border-white/15">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-[0.22em]">HR Admin Workspace</span>
                    </div>
                    <h3 className="mt-2 text-[20px] sm:text-[24px] leading-none font-black uppercase tracking-tight">
                      Leave Balance Management
                    </h3>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-white/78 max-w-2xl">
                      Manage employee leave allocation, carry forward, additional credits, adjustments, and history from a single HR workspace.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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

              <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
                <Card className="border-none shadow-sm bg-white/90 dark:bg-card/80 rounded-[20px] p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-[0.25em] text-[#7B0099]">Workspace</h4>
                      <p className="text-[11px] text-muted-foreground mt-1">Select one of the leave entitlement management modules.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                      <span className={`h-2 w-2 rounded-full ${sseStatus === "Live" ? "bg-emerald-500" : "bg-amber-500"}`} />
                      SSE {sseStatus}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Annual Leave Allocation" },
                      { label: "Carry Forward" },
                      { label: "Additional Leave" },
                      { label: "Adjustments" },
                      { label: "Special Leave" },
                      { label: "Forfeiture" },
                      { label: "History" },
                      { label: "Reports" },
                      { label: "Bulk Allocation" }
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setSelectedLeaveModule(item.label)}
                        className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${item.label === selectedLeaveModule ? 'border-[#7B0099] bg-[#7B0099]/10 text-[#220841]' : 'border-border/70 bg-background/60 text-foreground hover:border-[#7B0099] hover:bg-[#7B0099]/5'}`}
                      >
                        <span className="text-sm font-black">{item.label}</span>
                        <p className="text-[10px] text-muted-foreground mt-1">{item.label === 'Dashboard' ? 'HR summary and action required' : 'Manage ' + item.label.toLowerCase()}</p>
                      </button>
                    ))}
                  </div>
                </Card>

                <div className="space-y-4">
                  <Card className="border-none shadow-sm bg-white/90 dark:bg-card/80 rounded-[20px] p-5">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        { title: 'Total Employees', value: leaveSummary.totalEmployees, tone: 'bg-violet-500/10 text-violet-600' },
                        { title: 'Carry Forward Eligible', value: leaveSummary.carryForwardEligible, tone: 'bg-emerald-500/10 text-emerald-600' },
                        { title: 'Pending Adjustments', value: leaveSummary.pendingAdjustments, tone: 'bg-amber-500/10 text-amber-600' },
                        { title: 'Expiring Soon', value: leaveSummary.expiringSoon, tone: 'bg-red-500/10 text-red-600' }
                      ].map((metric) => (
                        <div key={metric.title} className={`rounded-3xl border border-border/70 p-4 ${metric.tone}`}>
                          <p className="text-[9px] font-black uppercase tracking-[0.27em] text-muted-foreground">{metric.title}</p>
                          <p className="mt-3 text-2xl font-black text-foreground">{metric.value}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="border-none shadow-sm bg-white/90 dark:bg-card/80 rounded-[20px] p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-[0.25em] text-[#7B0099]">Quick Actions</h4>
                        <p className="text-[11px] text-muted-foreground mt-1">Start the most common HR leave operations.</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: 'Allocate Leave', tone: 'bg-[#7B0099]/10 text-[#7B0099]' },
                        { label: 'Carry Forward', tone: 'bg-emerald-500/10 text-emerald-600' },
                        { label: 'Adjust Leave', tone: 'bg-amber-500/10 text-amber-600' },
                        { label: 'Grant Credits', tone: 'bg-sky-500/10 text-sky-600' }
                      ].map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => toast.success(`${action.label} workflow opened.`)}
                          className={`rounded-3xl border border-border/70 px-4 py-4 text-left ${action.tone} hover:shadow-lg hover:scale-[1.01] transition-all`}
                        >
                          <span className="text-sm font-black">{action.label}</span>
                          <p className="text-[10px] text-muted-foreground mt-2">Execute the selected leave entitlement workflow for employees.</p>
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>

              <Card className="border-none shadow-sm bg-white/90 dark:bg-card/80 rounded-[20px] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h4 className="text-lg font-black text-foreground">Leave Entitlement Search</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">Search, filter, and review leave balances before applying allocations or adjustments.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void fetchLeaveEntitlements();
                      toast.success('Leave entitlement filters applied.');
                    }}
                    className="h-11 rounded-xl bg-[#7B0099] px-5 text-[9px] font-black uppercase tracking-widest text-white"
                  >
                    Apply Filters
                  </button>
                </div>

                <div className="grid gap-3 mt-4 sm:grid-cols-2 xl:grid-cols-3">
                  <input
                    type="text"
                    value={leaveSearch}
                    onChange={(e) => setLeaveSearch(e.target.value)}
                    placeholder="Search Employee..."
                    className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 text-sm font-bold outline-none focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10"
                  />
                  <Select value={selectedLeaveBranch} onValueChange={setSelectedLeaveBranch}>
                    <SelectTrigger className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 text-sm font-black uppercase">
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="" className="text-[10px] font-black uppercase">All Branches</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.code} value={branch.code} className="text-[10px] font-black uppercase">{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedLeaveDept} onValueChange={setSelectedLeaveDept}>
                    <SelectTrigger className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 text-sm font-black uppercase">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="" className="text-[10px] font-black uppercase">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept} className="text-[10px] font-black uppercase">{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
                    <SelectTrigger className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 text-sm font-black uppercase">
                      <SelectValue placeholder="Leave Type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="" className="text-[10px] font-black uppercase">All Leave Types</SelectItem>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type} value={type} className="text-[10px] font-black uppercase">{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedLeaveYear} onValueChange={setSelectedLeaveYear}>
                    <SelectTrigger className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 text-sm font-black uppercase">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {leaveYears.map((year) => (
                        <SelectItem key={year} value={year} className="text-[10px] font-black uppercase">{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedLeaveStatus} onValueChange={setSelectedLeaveStatus}>
                    <SelectTrigger className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 text-sm font-black uppercase">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {leaveStatusOptions.map((status) => (
                        <SelectItem key={status} value={status} className="text-[10px] font-black uppercase">{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>

              <Card className="border-none shadow-sm bg-white/90 dark:bg-card/80 rounded-[20px] p-0 overflow-hidden">
                {leaveLoading ? (
                  <div className="flex items-center justify-center py-10 text-sm font-black uppercase tracking-[0.25em] text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading live entitlements...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                    <thead className="bg-muted/10 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-4">Employee</th>
                        <th className="px-4 py-4">Branch</th>
                        <th className="px-4 py-4">Department</th>
                        <th className="px-4 py-4">Leave Type</th>
                        <th className="px-4 py-4">Balance</th>
                        <th className="px-4 py-4">Pending</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-sm font-black uppercase tracking-[0.22em] text-muted-foreground">
                            No live entitlement records found for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        leaveRows.map((row) => (
                          <tr key={row.user_id} className="border-t border-border/70 even:bg-muted/10">
                            <td className="px-4 py-4 font-black text-foreground">{row.employee}</td>
                            <td className="px-4 py-4 text-[11px] text-muted-foreground">{row.branch || 'HQ'}</td>
                            <td className="px-4 py-4 text-[11px] text-muted-foreground">{row.department || 'Unassigned'}</td>
                            <td className="px-4 py-4 text-[11px] text-muted-foreground">{row.leave_type}</td>
                            <td className="px-4 py-4 font-black">{row.balance} days</td>
                            <td className="px-4 py-4 text-[11px] text-muted-foreground">{row.pending} days</td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${row.status === 'Active' ? 'bg-emerald-500/10 text-emerald-700' : row.status === 'Pending' ? 'bg-amber-500/10 text-amber-700' : 'bg-sky-500/10 text-sky-700'}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() => toast.success(`Reviewing ${row.employee}'s leave balance.`)}
                                className="rounded-full border border-[#7B0099] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#7B0099]"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Module render area: show the selected leave module UI */}
              <Card className="border-none shadow-sm bg-white/90 dark:bg-card/80 rounded-[20px] p-5">
                {selectedLeaveModule === 'Carry Forward' && (
                  <div>
                    <h4 className="text-lg font-black">Carry Forward Leave</h4>
                    <p className="text-sm text-muted-foreground mt-1">Configure carry forward rules and process eligible employees.</p>
                    <div className="grid gap-3 mt-4 sm:grid-cols-2">
                      <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
                        <SelectTrigger className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 text-sm font-black uppercase">
                          <SelectValue placeholder="Leave Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {leaveTypes.map((type) => (
                            <SelectItem key={type} value={type} className="text-[10px] font-black uppercase">{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={selectedLeaveYear} onValueChange={setSelectedLeaveYear}>
                        <SelectTrigger className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 text-sm font-black uppercase">
                          <SelectValue placeholder="Leave Year" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {leaveYears.map((y) => (
                            <SelectItem key={y} value={y} className="text-[10px] font-black uppercase">{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Select value="" onValueChange={() => {}}>
                        <SelectTrigger className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 text-sm font-black uppercase">
                          <SelectValue placeholder="Carry Forward To" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="2027" className="text-[10px] font-black uppercase">2027</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-3 flex items-center">
                        <label className="font-black mr-2">Max Carry Forward</label>
                        <input className="w-16 bg-transparent outline-none" defaultValue={5} />
                        <span className="text-muted-foreground"> days</span>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                      <Button onClick={() => toast.success('Preview generated')} className="bg-background/20">Preview</Button>
                      <Button onClick={() => toast.success('Carry forward executed')} className="bg-[#7B0099] text-white">Execute Carry Forward</Button>
                    </div>
                  </div>
                )}

                {selectedLeaveModule === 'Additional Leave' && (
                  <div>
                    <h4 className="text-lg font-black">Additional Leave Allocation</h4>
                    <p className="text-sm text-muted-foreground mt-1">Grant additional leave to selected employee.</p>
                    <div className="grid gap-3 mt-4 sm:grid-cols-2">
                      <input type="text" placeholder="Search Employee" className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4" />
                      <div className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-3 flex items-center">Current Balance: 14 Days</div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
                        <SelectTrigger className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 text-sm font-black uppercase">
                          <SelectValue placeholder="Leave Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {leaveTypes.map((type) => (
                            <SelectItem key={type} value={type} className="text-[10px] font-black uppercase">{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-3 flex items-center">
                        <label className="font-black mr-2">Additional Days</label>
                        <input className="w-16 bg-transparent outline-none" defaultValue={3} />
                        <span className="text-muted-foreground"> days</span>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <Button onClick={() => toast.error('Cancelled')} className="bg-background/20">Cancel</Button>
                      <Button onClick={() => toast.success('Leave granted')} className="bg-[#7B0099] text-white">Grant Leave</Button>
                    </div>
                  </div>
                )}

                {selectedLeaveModule === 'Adjustments' && (
                  <div>
                    <h4 className="text-lg font-black">Manual Leave Adjustment</h4>
                    <p className="text-sm text-muted-foreground mt-1">Adjust an employee's leave balances.</p>
                    <div className="mt-4">
                      <input type="text" placeholder="Search Employee" className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4" />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
                        <SelectTrigger className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 text-sm font-black uppercase">
                          <SelectValue placeholder="Leave Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {leaveTypes.map((type) => (
                            <SelectItem key={type} value={type} className="text-[10px] font-black uppercase">{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-3 flex items-center">
                        <label className="font-black mr-2">Adjustment Days</label>
                        <input className="w-16 bg-transparent outline-none" defaultValue={2} />
                      </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <Button onClick={() => toast.error('Cancelled')} className="bg-background/20">Cancel</Button>
                      <Button onClick={() => toast.success('Adjustment saved')} className="bg-[#7B0099] text-white">Save Adjustment</Button>
                    </div>
                  </div>
                )}

                {selectedLeaveModule === 'Special Leave' && (
                  <div>
                    <h4 className="text-lg font-black">Special Leave Credits</h4>
                    <p className="text-sm text-muted-foreground mt-1">Grant special leave types such as birthday or compassionate leave.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input type="text" placeholder="Search Employee" className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4" />
                      <Select value="Birthday" onValueChange={() => {}}>
                        <SelectTrigger className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 text-sm font-black uppercase">
                          <SelectValue placeholder="Leave Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Birthday">Birthday Leave</SelectItem>
                          <SelectItem value="Compassionate">Compassionate Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <Button onClick={() => toast.error('Cancelled')} className="bg-background/20">Cancel</Button>
                      <Button onClick={() => toast.success('Special leave granted')} className="bg-[#7B0099] text-white">Grant Credit</Button>
                    </div>
                  </div>
                )}

                {selectedLeaveModule === 'Forfeiture' && (
                  <div>
                    <h4 className="text-lg font-black">Leave Forfeiture</h4>
                    <p className="text-sm text-muted-foreground mt-1">Process forfeiture for employees exceeding limits.</p>
                    <div className="mt-4">
                      <input type="text" placeholder="Search Employee" className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4" />
                    </div>
                    <div className="mt-6 flex gap-3">
                      <Button onClick={() => toast.success('Preview generated')} className="bg-background/20">Preview</Button>
                      <Button onClick={() => toast.success('Forfeiture processed')} className="bg-[#7B0099] text-white">Process Forfeiture</Button>
                    </div>
                  </div>
                )}

                {selectedLeaveModule === 'Bulk Allocation' && (
                  <div>
                    <h4 className="text-lg font-black">Bulk Leave Allocation (Wizard)</h4>
                    <p className="text-sm text-muted-foreground mt-1">4-step wizard for bulk allocation.</p>
                    <div className="mt-4">
                      <p className="font-black">Step 1 — Select Employees</p>
                      <div className="mt-2">(Department / Branch / Type filters and employee table)</div>
                    </div>
                    <div className="mt-4">
                      <p className="font-black">Step 2 — Allocation</p>
                      <div className="mt-2">(Leave Type / Days / Effective Date / Expiry)</div>
                    </div>
                    <div className="mt-4">
                      <p className="font-black">Step 3 — Preview</p>
                      <div className="mt-2">Preview table with counts and totals</div>
                    </div>
                    <div className="mt-4">
                      <p className="font-black">Step 4 — Confirm</p>
                      <div className="mt-2">Allocation summary and confirm</div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
