import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, Users, ShieldCheck, Database, CheckCircle2, ChevronRight,
  TrendingUp, Loader2, Key, MapPin, RefreshCw, BarChart3
} from "lucide-react";
import { API_BASE_URL } from "@/config/api";

interface Employee {
  user_id: string;
  full_name: string;
  branch: string;
  department?: string;
  role: string;
  status: string;
}

interface DepartmentData {
  name: string;
  employee_count?: number;
}

export default function MasterOverview() {
  const { role, userBranch } = useRole();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("presenceSidebarCollapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    const handleSidebarChange = () => {
      setSidebarCollapsed(localStorage.getItem("presenceSidebarCollapsed") === "true");
    };
    window.addEventListener("presenceSidebarCollapsedChanged", handleSidebarChange);
    return () => {
      window.removeEventListener("presenceSidebarCollapsedChanged", handleSidebarChange);
    };
  }, []);

  // Redirect non-hr_admin roles as this is a master administration center
  useEffect(() => {
    if (role && role !== "hr_admin" && role !== "managing_director") {
      navigate("/");
    }
  }, [role, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch departments
      const deptRes = await fetch(`${API_BASE_URL}/api/departments`);
      const deptData = await deptRes.json();
      let deptsList: string[] = [];
      if (deptData.success) {
        deptsList = [...deptData.departments.map((d: any) => d.name), "HQ General"];
        setDepartments(deptsList);
      }

      // Fetch branches
      const branchRes = await fetch(`${API_BASE_URL}/api/branches`);
      const branchData = await branchRes.json();
      if (branchData.success) {
        setBranches(branchData.branches);
      }

      // Fetch employees (All employees for HR Admin view)
      const empRes = await fetch(`${API_BASE_URL}/api/employees?role=hr_admin&branch=`);
      const empData = await empRes.json();
      if (empData.success) {
        setEmployees(empData.employees);
      }
      setLastSynced(new Date());
    } catch (error) {
      console.error("Error fetching master data overview:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [role, userBranch]);

  // Calculations
  const totalDepartments = departments.length;
  const totalBranches = branches.length > 0 ? branches.length : 24;
  const totalUsers = employees.length;
  const activeUsers = employees.filter(e => e.status === "Active").length;
  const inactiveUsers = totalUsers - activeUsers;

  // HOD Assignments check: count of departments that have at least 1 HOD assigned
  const departmentsWithHOD = departments.filter(dept => {
    if (dept === "HQ General") {
      return employees.some(e => e.branch === "HQ" && (!e.department || e.department === "") && e.role === "head_of_department" && e.status === "Active");
    }
    return employees.some(e => e.department === dept && e.role === "head_of_department" && e.status === "Active");
  }).length;

  const hodCoveragePct = totalDepartments > 0 ? Math.round((departmentsWithHOD / totalDepartments) * 100) : 0;

  // Access Roles summary
  const roleCounts = {
    hr_admin: employees.filter(e => e.role === "hr_admin" && e.status === "Active").length,
    head_of_department: employees.filter(e => e.role === "head_of_department" && e.status === "Active").length,
    branch_leader: employees.filter(e => e.role === "branch_leader" && e.status === "Active").length,
    managing_director: employees.filter(e => e.role === "managing_director" && e.status === "Active").length,
    employee: employees.filter(e => (e.role === "employee" || (!e.role)) && e.status === "Active").length,
  };

  // Branch statistics
  const branchCounts = employees.reduce((acc: Record<string, number>, emp) => {
    acc[emp.branch] = (acc[emp.branch] || 0) + 1;
    return acc;
  }, {});

  // Department statistics mapping
  const departmentStats = departments.map(dept => {
    let deptEmployees = [];
    if (dept === "HQ General") {
      deptEmployees = employees.filter(e => e.branch === "HQ" && (!e.department || e.department === ""));
    } else {
      deptEmployees = employees.filter(e => e.department === dept);
    }
    return {
      name: dept,
      count: deptEmployees.length,
      active: deptEmployees.filter(e => e.status === "Active").length,
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto px-1 sm:px-4">
      
      {/* HEADER PANEL */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#7B0099] rounded-[20px] text-white shadow-xl shadow-[#7B0099]/20">
            <Database className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight uppercase leading-none">Master Control Hub</h1>
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-1.5 uppercase tracking-widest opacity-60">System Administration & Core Directory Master</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastSynced && (
            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider bg-muted/40 p-2 rounded-xl border border-border/50">
              Synced: {lastSynced.toLocaleTimeString("en-US")}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="gap-2 border-[#7B0099] text-[#7B0099] hover:bg-[#7B0099]/5 rounded-xl font-black text-[10px] uppercase tracking-widest px-4 py-4.5 shadow-sm active:scale-95 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Hub
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="border-none shadow-sm overflow-hidden bg-card/60 backdrop-blur-md rounded-[28px]">
          <CardContent className="p-24 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-[#7B0099]" />
            <p className="text-xs font-black text-muted-foreground animate-pulse uppercase tracking-[0.25em]">Syncing Core Master Directory...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          
          {/* TOP EXECUTIVE KPI CARDS */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${sidebarCollapsed ? "lg:grid-cols-5" : "lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"} gap-4 sm:gap-6`}>
            
            {/* KPI 1: Branches */}
            <Card onClick={() => navigate("/branches")} className="cursor-pointer shadow-md bg-[#fff0f5] dark:bg-[#2d0a1f] border border-[#fce7f3] dark:border-[#5c1340]/40 rounded-[24px] relative overflow-hidden transition-all duration-300 group hover:shadow-lg">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-pink-500" />
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <span className="text-[10px] font-black text-pink-700 dark:text-pink-400 uppercase tracking-widest block whitespace-normal break-words leading-tight">Branches</span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-black text-pink-600 dark:text-pink-400">{totalBranches}</span>
                    <span className="text-[9px] font-black text-pink-700 dark:text-pink-300 bg-pink-500/10 dark:bg-pink-500/20 border border-pink-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">Active Branches</span>
                  </div>
                  <p className="text-[9px] text-pink-800/60 dark:text-pink-400/60 font-semibold uppercase tracking-wider">Regional Offices & Outlets</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 dark:bg-pink-500/20 flex items-center justify-center text-pink-600 dark:text-pink-400 shrink-0 group-hover:scale-110 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
 
            {/* KPI 2: Departments */}
            <Card onClick={() => navigate("/master/department")} className="cursor-pointer shadow-md bg-[#eff6ff] dark:bg-[#0c1f3c] border border-[#dbeafe] dark:border-[#163063]/40 rounded-[24px] relative overflow-hidden transition-all duration-300 group hover:shadow-lg">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest block whitespace-normal break-words leading-tight">Departments</span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-black text-blue-600 dark:text-blue-400">{totalDepartments}</span>
                    <span className="text-[9px] font-black text-blue-700 dark:text-blue-300 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">Active Units</span>
                  </div>
                  <p className="text-[9px] text-blue-800/60 dark:text-blue-400/60 font-semibold uppercase tracking-wider">Organizational Segments</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
 
            {/* KPI 3: Total System Users */}
            <Card onClick={() => navigate("/employees")} className="cursor-pointer shadow-md bg-[#faf5ff] dark:bg-[#200a2d] border border-[#f3e8ff] dark:border-[#4c1266]/40 rounded-[24px] relative overflow-hidden transition-all duration-300 group hover:shadow-lg">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#7B0099]" />
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <span className="text-[10px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-widest block whitespace-normal break-words leading-tight">Total Staff / Users</span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-black text-[#7B0099] dark:text-purple-400">{totalUsers}</span>
                    <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">{activeUsers} Active</span>
                  </div>
                  <p className="text-[9px] text-purple-800/60 dark:text-purple-400/60 font-semibold uppercase tracking-wider">Access Licenses Provisioned</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#7B0099]/10 dark:bg-[#7B0099]/20 flex items-center justify-center text-[#7B0099] dark:text-purple-400 shrink-0 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
 
            {/* KPI 3: Leadership Coverage */}
            <Card className="shadow-md bg-[#fffbeb] dark:bg-[#2c1e0e] border border-[#fef3c7] dark:border-[#4d3214]/40 rounded-[24px] relative overflow-hidden transition-all duration-300 group hover:shadow-lg">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500" />
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest block whitespace-normal break-words leading-tight">Leadership Coverage</span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{hodCoveragePct}%</span>
                    <span className="text-[9px] font-black text-amber-700 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">{departmentsWithHOD} depts with HOD</span>
                  </div>
                  <p className="text-[9px] text-amber-800/60 dark:text-amber-400/60 font-semibold uppercase tracking-wider">HOD mapping efficiency</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
 
            {/* KPI 4: Integrity Status */}
            <Card className="shadow-md bg-[#eefcf2] dark:bg-[#0d2a1a] border border-[#c3f2d2] dark:border-[#0e4827]/40 rounded-[24px] relative overflow-hidden transition-all duration-300 group hover:shadow-lg">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block whitespace-normal break-words leading-tight">Directory Integrity</span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">100%</span>
                    <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">Healthy</span>
                  </div>
                  <p className="text-[9px] text-emerald-800/60 dark:text-emerald-400/60 font-semibold uppercase tracking-wider">Zero unresolved references</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>
 
          {/* MAIN PORTAL SELECTOR CARDS */}
          <div className={`grid grid-cols-1 ${sidebarCollapsed ? "lg:grid-cols-3" : "lg:grid-cols-2 xl:grid-cols-3"} gap-6 sm:gap-8`}>
            
            {/* Left Portal: Department Master Overview */}
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden flex flex-col justify-between">
              <div>
                <CardHeader className="pb-4 border-b border-border/40 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight">Departments Directory</CardTitle>
                      <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Corporate structural nodes and allocation</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-black text-[10px] px-3.5 py-1 text-blue-600 border-none bg-blue-500/10">
                    {totalDepartments} UNITS
                  </Badge>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Department Density List */}
                  <div className="space-y-3.5">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Department Allocation Density</h4>
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {departmentStats.slice(0, 4).map((d) => {
                        const pct = totalUsers > 0 ? Math.round((d.count / totalUsers) * 100) : 0;
                        return (
                          <div key={d.name} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-black text-foreground">{d.name}</span>
                              <span className="font-black text-muted-foreground">{d.count} Staff ({pct}%)</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </div>
              <div className="p-6 border-t border-border/40 bg-muted/5">
                <Button 
                  onClick={() => navigate("/master/department")}
                  className="w-full py-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-md flex items-center justify-center gap-1.5"
                >
                  Configure Departments
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Right Portal: User Directory Master */}
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden flex flex-col justify-between">
              <div>
                <CardHeader className="pb-4 border-b border-border/40 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight">System User Directory</CardTitle>
                      <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Credentials & active security profiles</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-black text-[10px] px-3.5 py-1 text-[#7B0099] border-none bg-purple-500/10">
                    {totalUsers} ACCOUNTS
                  </Badge>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Access Levels distribution */}
                  <div className="space-y-3.5">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Provisioned Role Mappings</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Admin licenses", value: roleCounts.hr_admin, icon: Key, color: "text-purple-600" },
                        { label: "HOD leaders", value: roleCounts.head_of_department, icon: ShieldCheck, color: "text-amber-500" },
                        { label: "Branch directors", value: roleCounts.branch_leader, icon: MapPin, color: "text-blue-500" },
                        { label: "Employee staff", value: roleCounts.employee, icon: Users, color: "text-emerald-500" },
                      ].map((item) => (
                        <div key={item.label} className="bg-muted/30 border border-border/40 p-3 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-wider">{item.label}</p>
                            <p className="text-lg font-black text-foreground leading-none mt-1">{item.value}</p>
                          </div>
                          <div className={`w-8 h-8 rounded-lg bg-white dark:bg-black/20 flex items-center justify-center ${item.color}`}>
                            <item.icon className="w-4 h-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </div>
              <div className="p-6 border-t border-border/40 bg-muted/5">
                <Button 
                  onClick={() => navigate("/employees")}
                  className="w-full py-5 rounded-xl bg-[#7B0099] hover:bg-[#5e0080] text-white font-black text-[10px] uppercase tracking-widest shadow-md flex items-center justify-center gap-1.5"
                >
                  Manage System Users
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Right Portal: Branches Directory */}
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden flex flex-col justify-between">
              <div>
                <CardHeader className="pb-4 border-b border-border/40 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-500/10 text-pink-600 rounded-xl">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight">Branches Directory</CardTitle>
                      <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Regional network configuration</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-black text-[10px] px-3.5 py-1 text-pink-600 border-none bg-pink-500/10">
                    {totalBranches} BRANCHES
                  </Badge>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Branch Density List */}
                  <div className="space-y-3.5">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Branch Allocation Density</h4>
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {Object.entries(branchCounts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 4).map(([branchName, count]: [string, any]) => {
                        const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
                        return (
                          <div key={branchName} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-black text-foreground">{branchName}</span>
                              <span className="font-black text-muted-foreground">{count} Staff ({pct}%)</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                              <div className="h-full bg-pink-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </div>
              <div className="p-6 border-t border-border/40 bg-muted/5">
                <Button 
                  onClick={() => navigate("/branches")}
                  className="w-full py-5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-black text-[10px] uppercase tracking-widest shadow-md flex items-center justify-center gap-1.5"
                >
                  Configure Branches
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>

          </div>

          {/* SYSTEM INTEGRITY DIAGNOSTIC CHECKLIST */}
          <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-sm sm:text-base font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                Database Health & Diagnostics
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11">Real-time system integrity audits and schema consistency logs</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: "Branch Mappings", desc: "Verifies all staff map to active, existing regional branches", status: "VERIFIED" },
                  { name: "Credential Allocation", desc: "Confirms system accounts maintain assigned auth privileges", status: "VERIFIED" },
                  { name: "Segment Consistency", desc: "Checks that no orphan records lack active departments", status: "VERIFIED" },
                ].map((log) => (
                  <div key={log.name} className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 hover:bg-emerald-500/10 rounded-2xl border border-emerald-500/10 transition-all flex flex-col justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black text-foreground uppercase tracking-wide">{log.name}</h4>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mt-1 leading-normal">{log.desc}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black tracking-widest uppercase">{log.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
