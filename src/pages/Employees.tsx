import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Loader2, 
  CalendarCheck, 
  TrendingUp, 
  Clock, 
  FileText, 
  Users,
  Briefcase,
  X,
  PhoneCall,
  Download,
  Printer
} from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { parseCutiGantiRows, getCleanReason } from "@/lib/leaveStorage";
import { API_BASE_URL } from "../config/api";
import { ExportDropdown } from "@/components/shared/ExportDropdown";

const BRANCH_NAMES: Record<string, string> = {
  HQ: "Rayhar HQ",
  KMM: "Kemaman",
  TGG: "Kuala Terengganu",
  CNH: "Cheneh",
  KBG: "Kuala Berang",
  DGN: "Dungun",
  JTH: "Jertih",
  KBR: "Kota Baru",
  RMP: "Rompin",
  MZM: "Muadzam Shah",
  SHA: "Shah Alam",
  BBB: "Bandar Baru Bangi",
  KUL: "Kuala Lumpur",
  IPH: "Ipoh",
  MJG: "Manjung",
  MLK: "Melaka",
  KKS: "Kuala Kangsar",
  TWU: "Tawau",
  SNS: "Seremban",
  AOR: "Alor Setar",
  BTM: "Bertam",
  BTP: "Batu Pahat",
  JB: "Johor Bharu",
};

export default function Employees() {
  const { role, userBranch, userDepartment } = useRole();
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedPosition, setSelectedPosition] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("Active");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [employeeLeaves, setEmployeeLeaves] = useState<any[]>([]);
  const [viewLeaveStatus, setViewLeaveStatus] = useState<"Approved" | "Pending" | "Rejected" | null>(null);
  const [printingLeaveId, setPrintingLeaveId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsDate, setAnalyticsDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const fetchAnalytics = async (userId: string, dateStr = analyticsDate) => {
    setLoadingAnalytics(true);
    try {
      const params = new URLSearchParams();
      if (dateStr) {
        const monthStr = dateStr.substring(0, 7); // YYYY-MM
        const yearStr = dateStr.substring(0, 4);  // YYYY
        params.append("month", monthStr);
        params.append("year", yearStr);
      }
      
      const res = await fetch(`${API_BASE_URL}/api/employees/${userId}/analytics?${params}`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingAnalytics(false);
  };

  useEffect(() => {
    if (selectedEmployee && isModalOpen) {
      fetchAnalytics(selectedEmployee.user_id, analyticsDate);
    } else {
      setAnalytics(null);
    }
  }, [selectedEmployee, isModalOpen, analyticsDate]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const { toast } = useToast();

  // Add User State
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupBranch, setSignupBranch] = useState("HQ");
  const [signupDepartment, setSignupDepartment] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState("");
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("page-header-actions"));
  }, []);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [branchMap, setBranchMap] = useState<Record<string, string>>(BRANCH_NAMES);

  useEffect(() => {
    fetchRoles();
    fetchBranchesAndDepartments();
  }, []);

  const fetchBranchesAndDepartments = async () => {
    try {
      const bRes = await fetch(`${API_BASE_URL}/api/branches`);
      const bData = await bRes.json();
      if (bData.success) {
        setBranchesList(bData.branches);
        const newMap = { ...BRANCH_NAMES };
        bData.branches.forEach((b: any) => {
          newMap[b.code] = b.name;
        });
        setBranchMap(newMap);
      }
      const dRes = await fetch(`${API_BASE_URL}/api/departments`);
      const dData = await dRes.json();
      if (dData.success) {
        setDepartmentsList(dData.departments);
      }
    } catch (error) {
      console.error("Error fetching branches/departments:", error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/roles`);
      const data = await response.json();
      if (data.success) {
        setAvailableRoles(data.roles);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

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

  const uniqueBranches = Array.from(
    new Set(dbEmployees.map((emp) => emp.branch).filter(Boolean))
  ).sort() as string[];

  const uniquePositions = Array.from(
    new Set(dbEmployees.map((emp) => emp.position).filter(Boolean))
  ).sort() as string[];

  const filtered = dbEmployees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase());
    const matchesBranch = selectedBranch === "All" || e.branch === selectedBranch;
    const matchesPosition = selectedPosition === "All" || e.position === selectedPosition;
    const matchesStatus = selectedStatus === "All" || e.status === selectedStatus;
    return matchesSearch && matchesBranch && matchesPosition && matchesStatus;
  });

  // Sort priority for roles: Head of Department at position 4, Branch Leader at position 5
  const getRolePriority = (roleStr: string) => {
    switch (roleStr) {
      case "managing_director": return 1;
      case "finance_manager": return 2;
      case "hr_admin": return 3;
      case "head_of_department": return 4;
      case "branch_leader": return 5;
      case "branch_officer": return 6;
      case "employee": return 7;
      default: return 8;
    }
  };

  const sorted = [...filtered].sort((a, b) => {
    const priorityA = getRolePriority(a.role);
    const priorityB = getRolePriority(b.role);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // Secondary sort: alphabetical by name
    return a.name.localeCompare(b.name);
  });

  const handleExportCSV = () => {
    const csvContent = [
      ["Name", "Email", "Position", "Branch", "Status"],
      ...filtered.map((emp) => [
        `"${emp.name}"`,
        `"${emp.email}"`,
        `"${emp.position.replace(/_/g, ' ')}"`,
        `"${emp.branch}"`,
        `"${emp.status}"`,
      ])
    ]
      .map(e => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Employee_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedBranch, selectedPosition, selectedStatus]);

  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;
  const currentItems = sorted.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sorted.length / entriesPerPage);

  const handleEmployeeClick = (emp: any) => {
    setSelectedEmployee(emp);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (e: React.MouseEvent, emp: any) => {
    e.stopPropagation();
    const currentStatus = emp.status || "Active";
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    
    const confirmMessage = currentStatus === "Active" 
      ? `Are you sure you want to mark ${emp.name} as Inactive?`
      : `Are you sure you want to reactivate ${emp.name}?`;
      
    if (!window.confirm(confirmMessage)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: emp.id || emp.user_id,
          status: nextStatus,
          changer_role: role
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: `Status Updated!`,
          description: `Successfully marked ${emp.name} as ${nextStatus}.`
        });
        fetchEmployees();
      } else {
        toast({
          title: "Update Failed",
          description: data.error || "Failed to update status",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Error toggling status:", err);
      toast({
        title: "Connection Error",
        description: "Could not connect to the server.",
        variant: "destructive"
      });
    }
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
          // Convert Proper Case display name (e.g. "Branch Leader") to snake_case (e.g. "branch_leader") for user_role table
          role: signupRole.toLowerCase().replace(/ /g, '_'),
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
        setSignupRole(""); // reset so placeholder shows
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
      {portalTarget && createPortal(
        <>
          {["hr_admin", "managing_director", "finance_manager"].includes(role) ? (
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#7B0099] hover:bg-[#5e0080] text-white font-bold gap-2 whitespace-nowrap touch-target"
            >
              <Users className="w-4 h-4" />
              Add Staff
            </Button>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4 w-full sm:w-auto">
              <ExportDropdown onExportCSV={handleExportCSV} />
              <Card className="border-border shadow-sm m-0">
                <CardContent className="p-3 sm:p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Employees</p>
                    <h3 className="text-2xl font-bold mt-0.5 text-green-600 dark:text-green-400 leading-none">
                      {filtered.length}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>,
        portalTarget
      )}

      {["hr_admin", "managing_director", "finance_manager"].includes(role) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2 mt-2">
          <div>
            <h1 className="text-responsive-xl font-bold font-heading text-foreground">Staff Directory</h1>
            <p className="text-responsive-sm text-muted-foreground mt-1">
              Manage employees across all branches
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-card/50 backdrop-blur-sm p-3 rounded-2xl border border-border/50">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 sm:h-10 border-border/60 bg-background/50 focus:ring-[#7B0099]/20"
            />
          </div>

          {(["hr_admin", "managing_director", "finance_manager"].includes(role) || uniqueBranches.length > 1) && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-full sm:w-[180px] h-11 sm:h-10 border-border/60 bg-background/50 focus:ring-[#7B0099]/20 font-bold text-xs rounded-xl">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="All" className="text-xs font-bold">All Branches</SelectItem>
                {uniqueBranches.map((br) => (
                  <SelectItem key={br} value={br} className="text-xs font-bold">
                    {branchMap[br] || br}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedPosition} onValueChange={setSelectedPosition}>
            <SelectTrigger className="w-full sm:w-[180px] h-11 sm:h-10 border-border/60 bg-background/50 focus:ring-[#7B0099]/20 font-bold text-xs rounded-xl">
              <SelectValue placeholder="All Positions" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="All" className="text-xs font-bold">All Positions</SelectItem>
              {uniquePositions.map((pos) => (
                <SelectItem key={pos} value={pos} className="text-xs font-bold capitalize">
                  {pos.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-[150px] h-11 sm:h-10 border-border/60 bg-background/50 focus:ring-[#7B0099]/20 font-bold text-xs rounded-xl">
              <SelectValue placeholder="Status: Active" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="All" className="text-xs font-bold">All Statuses</SelectItem>
              <SelectItem value="Active" className="text-xs font-bold">Active Only</SelectItem>
              <SelectItem value="Inactive" className="text-xs font-bold">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Badge variant="outline" className="px-3 py-1.5 text-xs font-bold whitespace-nowrap bg-muted/30 border-border/60 h-10 sm:h-auto flex items-center justify-center rounded-md">
          Total <span className="ml-2 flex items-center justify-center bg-[#7B0099] text-white rounded-md h-5 min-w-[20px] px-1.5 text-[10px] leading-none shrink-0">{filtered.length}</span>
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
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="py-4 px-6 font-medium text-muted-foreground whitespace-nowrap">Staff Member</TableHead>
                      <TableHead className="py-4 px-6 font-medium text-muted-foreground whitespace-nowrap">Position</TableHead>
                      <TableHead className="py-4 px-6 font-medium text-muted-foreground whitespace-nowrap">Branch</TableHead>
                      <TableHead className="py-4 px-6 font-medium text-muted-foreground whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/50">
                    {currentItems.length > 0 ? (
                      currentItems.map((emp) => (
                        <TableRow 
                          key={emp.id} 
                          className="hover:bg-[#7B0099]/5 transition-colors cursor-pointer group"
                          onClick={() => handleEmployeeClick(emp)}
                        >
                          <TableCell className="py-4 px-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-[#7B0099]/10 flex items-center justify-center text-xs font-black text-[#7B0099] group-hover:scale-110 transition-transform">
                                {emp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-foreground group-hover:text-[#7B0099] transition-colors">{emp.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate font-medium">{emp.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <span className="text-xs font-bold text-muted-foreground capitalize">{emp.position.replace(/_/g, ' ')}</span>
                          </TableCell>
                          <TableCell className="py-4 px-6 text-xs font-bold text-muted-foreground">{emp.branch}</TableCell>
                          <TableCell className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <Badge variant={emp.status === "Active" ? "default" : "secondary"} className={`text-[10px] font-black px-3 ${emp.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                                {emp.status}
                              </Badge>
                              {role === "hr_admin" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleToggleStatus(e, emp)}
                                  className={`h-7 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                    emp.status === "Active"
                                      ? "hover:bg-red-500/10 hover:text-red-500 text-red-400"
                                      : "hover:bg-emerald-500/10 hover:text-emerald-500 text-emerald-400"
                                  }`}
                                >
                                  {emp.status === "Active" ? "Inactive" : "Re-activate"}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center text-muted-foreground italic font-medium">No employees found matching your search.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border/50">
                {currentItems.length > 0 ? (
                  currentItems.map((emp) => (
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
                           <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Badge className={`text-[9px] font-black h-5 shrink-0 ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                              {emp.status}
                            </Badge>
                            {role === "hr_admin" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleToggleStatus(e, emp)}
                                className={`h-6 px-2 rounded-md text-[8px] font-black uppercase tracking-wider ${
                                  emp.status === "Active"
                                    ? "hover:bg-red-500/10 hover:text-red-500 text-red-500"
                                    : "hover:bg-emerald-500/10 hover:text-emerald-500 text-emerald-500"
                                }`}
                              >
                                {emp.status === "Active" ? "Inactive" : "Activate"}
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <span className="truncate max-w-[100px]">{emp.position.replace(/_/g, ' ')}</span>
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

              {/* Pagination Controls */}
              {filtered.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border/50 gap-4 bg-muted/10">
                  <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <span>
                      Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filtered.length)} of {filtered.length} Entries
                    </span>
                    <div className="flex items-center gap-2">
                      <span>Show</span>
                      <Select 
                        value={entriesPerPage.toString()} 
                        onValueChange={(val) => { setEntriesPerPage(Number(val)); setCurrentPage(1); }}
                      >
                        <SelectTrigger className="h-7 text-xs font-bold rounded-lg border-border w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="h-8 px-3 text-xs font-bold"
                    >
                      «
                    </Button>
                    <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-8 w-8 p-0 text-xs font-bold ${currentPage === pageNum ? 'bg-primary text-primary-foreground' : ''}`}
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="h-8 px-3 text-xs font-bold"
                    >
                      »
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Employee Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl w-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] max-h-[90vh] p-0 gap-0 bg-slate-50 dark:bg-slate-900">
          <DialogHeader className="p-4 pb-3 border-b bg-white dark:bg-slate-900 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
            <DialogTitle className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Staff Profile & Analytics</DialogTitle>
          </DialogHeader>
          
          <div className="p-4">
            {selectedEmployee ? (
              <TooltipProvider>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: Bio & Info (4 cols) */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/60 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7B0099] to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-md shadow-[#7B0099]/20 mb-3 border-4 border-white">
                        {selectedEmployee.name.charAt(0)}
                      </div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight mb-1">{selectedEmployee.name}</h2>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">{selectedEmployee.email}</p>
                      
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200">
                        {selectedEmployee.position?.replace(/_/g, ' ')}
                      </Badge>
                      
                      <div className="mt-5 w-full flex flex-col gap-2">
                        <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">User ID</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200">{selectedEmployee.user_id}</span>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Branch</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200">{selectedEmployee.branch}</span>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{selectedEmployee.department}</span>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                          <Badge className={`text-white font-black text-[9px] uppercase tracking-wider ${selectedEmployee.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}>
                            {selectedEmployee.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Columns: Advanced Analytics (8 cols) */}
                  <div className="lg:col-span-8 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-0 gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-blue-50 text-blue-600 rounded">
                          <TrendingUp className="h-3 w-3" />
                        </div>
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Attendance Performance</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="date" 
                          value={analyticsDate}
                          onChange={(e) => setAnalyticsDate(e.target.value)}
                          className="w-32 h-8 text-[10px] font-bold uppercase tracking-widest bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800/60 dark:border-slate-700"
                        />
                      </div>
                    </div>

                    {loadingAnalytics ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800/60 dark:border-slate-700 shadow-sm">
                        <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#7B0099]" />
                        <p className="text-xs font-bold tracking-wide">Loading enterprise analytics...</p>
                      </div>
                    ) : analytics ? (
                      <>
                        {/* Attendance Performance Section */}
                        <section>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Monthly Rate Card */}
                            <Card className="shadow-sm border-slate-200 dark:border-slate-800/60 hover:shadow-md transition-shadow duration-200">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Monthly Rate</p>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className="w-3 h-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-[8px] font-bold cursor-help hover:bg-slate-200 transition-colors">?</div>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-[200px] p-2 text-[10px] leading-relaxed">
                                        <p className="font-bold mb-1 text-slate-800 dark:text-slate-200">Formula:</p>
                                        <p className="text-slate-600 dark:text-slate-300">(Present Days / Expected Working Days) × 100</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <Badge variant="secondary" className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border ${
                                    analytics.attendance.monthly.rate >= 95 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 
                                    analytics.attendance.monthly.rate >= 85 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 
                                    analytics.attendance.monthly.rate >= 70 ? 'text-amber-700 bg-amber-50 border-amber-200' : 
                                    'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800'
                                  }`}>
                                    {analytics.attendance.monthly.rate >= 95 ? 'Excellent' : analytics.attendance.monthly.rate >= 85 ? 'Good' : analytics.attendance.monthly.rate >= 70 ? 'Warning' : 'Review'}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-baseline gap-1 mb-3">
                                  <span className={`text-3xl font-black tracking-tighter ${
                                    analytics.attendance.monthly.rate >= 85 ? 'text-emerald-600' : 
                                    analytics.attendance.monthly.rate >= 70 ? 'text-amber-500' : 
                                    analytics.attendance.monthly.rate === 0 ? 'text-slate-300' : 'text-slate-700 dark:text-slate-200'
                                  }`}>
                                    {analytics.attendance.monthly.rate}
                                  </span>
                                  <span className="text-sm font-bold text-slate-400">%</span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-emerald-600 leading-none mb-1">{analytics.attendance.monthly.present}</p>
                                    <p className="text-[8px] font-bold text-emerald-600/70 uppercase tracking-wider">Present</p>
                                  </div>
                                  <div className="bg-amber-50/50 border border-amber-100/50 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-amber-600 leading-none mb-1">{analytics.attendance.monthly.late}</p>
                                    <p className="text-[8px] font-bold text-amber-600/70 uppercase tracking-wider">Late</p>
                                  </div>
                                  <div className="bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800/60 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-slate-600 dark:text-slate-300 leading-none mb-1">{analytics.attendance.monthly.absent}</p>
                                    <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Absent</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Yearly Rate Card */}
                            <Card className="shadow-sm border-slate-200 dark:border-slate-800/60 hover:shadow-md transition-shadow duration-200">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Yearly Rate</p>
                                  </div>
                                  <Badge variant="secondary" className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border ${
                                    analytics.attendance.yearly.rate >= 95 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 
                                    analytics.attendance.yearly.rate >= 85 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 
                                    analytics.attendance.yearly.rate >= 70 ? 'text-amber-700 bg-amber-50 border-amber-200' : 
                                    'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800'
                                  }`}>
                                    {analytics.attendance.yearly.rate >= 95 ? 'Excellent' : analytics.attendance.yearly.rate >= 85 ? 'Good' : analytics.attendance.yearly.rate >= 70 ? 'Warning' : 'Review'}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-baseline gap-1 mb-3">
                                  <span className={`text-3xl font-black tracking-tighter ${
                                    analytics.attendance.yearly.rate >= 85 ? 'text-emerald-600' : 
                                    analytics.attendance.yearly.rate >= 70 ? 'text-amber-500' : 
                                    analytics.attendance.yearly.rate === 0 ? 'text-slate-300' : 'text-slate-700 dark:text-slate-200'
                                  }`}>
                                    {analytics.attendance.yearly.rate}
                                  </span>
                                  <span className="text-sm font-bold text-slate-400">%</span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-emerald-600 leading-none mb-1">{analytics.attendance.yearly.present}</p>
                                    <p className="text-[8px] font-bold text-emerald-600/70 uppercase tracking-wider">Present</p>
                                  </div>
                                  <div className="bg-amber-50/50 border border-amber-100/50 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-amber-600 leading-none mb-1">{analytics.attendance.yearly.late}</p>
                                    <p className="text-[8px] font-bold text-amber-600/70 uppercase tracking-wider">Late</p>
                                  </div>
                                  <div className="bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800/60 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-slate-600 dark:text-slate-300 leading-none mb-1">{analytics.attendance.yearly.absent}</p>
                                    <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Absent</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </section>

                        {/* Leave Utilization Section */}
                        <section>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-purple-50 text-purple-600 rounded">
                                <Briefcase className="h-3 w-3" />
                              </div>
                              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Leave Utilization</h3>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 p-3 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">Total Entitled</p>
                              <p className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tighter">{analytics.leave.entitlement}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 p-3 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">Approved Taken</p>
                              <p className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tighter">{analytics.leave.used}</p>
                            </div>
                            <div className="rounded-xl border-2 border-emerald-500/20 p-3 bg-emerald-50/30 shadow-sm flex flex-col justify-between">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mb-1.5">Remaining Balance</p>
                              <p className="text-2xl font-black text-emerald-600 tracking-tighter">{analytics.leave.remaining}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 p-3 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
                              <Tooltip>
                                <TooltipTrigger className="text-left w-full h-full flex flex-col justify-between">
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 flex items-center justify-between w-full">
                                    Utilization
                                    <span className="w-3 h-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[7px] text-slate-400">?</span>
                                  </p>
                                  <p className={`text-2xl font-black tracking-tighter ${analytics.leave.utilizationRate >= 90 ? 'text-amber-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {analytics.leave.utilizationRate}%
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Formula: (Approved Leave / Total Entitled) × 100</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button 
                              className="group flex flex-col items-start p-3 rounded-xl bg-amber-50/50 border border-amber-200/50 hover:bg-amber-50 hover:border-amber-300 transition-all duration-200"
                              onClick={() => setViewLeaveStatus("Pending")}
                            >
                              <div className="flex justify-between items-center w-full mb-2">
                                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600 group-hover:scale-110 transition-transform">
                                  <Clock className="w-3 h-3" />
                                </div>
                                <span className="text-lg font-black text-amber-600">{analytics.leave.pending}</span>
                              </div>
                              <span className="text-[9px] font-bold text-amber-700/80 uppercase tracking-widest">Pending Requests</span>
                            </button>
                            
                            <button 
                              className="group flex flex-col items-start p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/50 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200"
                              onClick={() => setViewLeaveStatus("Approved")}
                            >
                              <div className="flex justify-between items-center w-full mb-2">
                                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform">
                                  <Briefcase className="w-3 h-3" />
                                </div>
                                <span className="text-lg font-black text-emerald-600">{analytics.leave.approvedApplications ?? analytics.leave.totalTaken}</span>
                              </div>
                              <span className="text-[9px] font-bold text-emerald-700/80 uppercase tracking-widest">Approved Leave</span>
                            </button>

                            <button 
                              className="group flex flex-col items-start p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:bg-slate-800 hover:border-slate-300 transition-all duration-200 opacity-90 hover:opacity-100"
                              onClick={() => setViewLeaveStatus("Rejected")}
                            >
                              <div className="flex justify-between items-center w-full mb-2">
                                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 group-hover:scale-110 transition-transform">
                                  <X className="w-3 h-3" />
                                </div>
                                <span className="text-lg font-black text-slate-500">{analytics.leave.rejected}</span>
                              </div>
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Rejected Requests</span>
                            </button>
                          </div>
                        </section>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-32 text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800/60 dark:border-slate-700 shadow-sm">
                        <Users className="w-12 h-12 opacity-20 mb-4" />
                        <p className="text-sm font-bold">Analytics unavailable.</p>
                      </div>
                    )}
                  </div>
                </div>
              </TooltipProvider>
            ) : (
              <div className="py-20 text-center text-slate-500 dark:text-slate-400">
                <p>Loading profile details...</p>
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
                      <div key={req.leave_id} id={printingLeaveId === req.leave_id ? "leave-form-print" : undefined} className={`relative p-4 sm:p-6 space-y-4 bg-card rounded-lg border shadow-sm mb-4 ${printingLeaveId && printingLeaveId !== req.leave_id ? 'print:hidden' : ''}`}>
                        <div className="rounded-[24px] border border-border/50 p-4 sm:p-6 space-y-4 bg-card shadow-sm relative">
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute right-4 top-4 bg-[#7B0099] text-white hover:bg-[#5c0073] h-8 px-3 text-xs font-bold shadow-sm print:hidden"
                            onClick={() => {
                              setPrintingLeaveId(req.leave_id);
                              const originalTitle = document.title;
                              document.title = `Leave Request - ${selectedEmployee?.name}`;
                              setTimeout(() => {
                                window.print();
                                document.title = originalTitle;
                                setTimeout(() => setPrintingLeaveId(null), 100);
                              }, 100);
                            }}
                          >
                            <Printer className="w-3.5 h-3.5 mr-1.5" /> Save to PDF
                          </Button>

                          <div className="text-center border-b-2 border-foreground/50 dark:border-purple-500/50 pb-4">
                            <h2 className="text-2xl font-black tracking-tighter text-foreground dark:text-purple-400">RAYHAR GROUP</h2>
                            <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-60 dark:text-purple-300">Permohonan Cuti Kakitangan</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">Nama Penuh</span>
                              <p className="border-b pb-1 border-border/40 truncate">{selectedEmployee?.name}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">Cawangan</span>
                              <p className="border-b pb-1 border-border/40">{selectedEmployee?.branch || "HQ"}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">Jenis Cuti</span>
                              <p className="border-b pb-1 border-border/40">{req.leave_type}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">Status</span>
                              <p className={`font-black uppercase ${req.status === "Rejected" ? "text-rose-600" : "text-[#7B0099]"}`}>
                                {req.status}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30 rounded-[20px] border border-border/50">
                            <div className="text-center">
                              <p className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50 mb-1">Dari</p>
                              <p className="font-black text-xs sm:text-sm">{fromStr}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50 mb-1">Hingga</p>
                              <p className="font-black text-xs sm:text-sm">{toStr}</p>
                            </div>
                            <div className="text-center bg-white dark:bg-slate-900 rounded-[14px] border border-border/50 py-1 shadow-sm flex flex-col justify-center">
                              <p className="text-[9px] uppercase font-black text-[#7B0099]">Hari</p>
                              <p className="font-black text-lg text-[#7B0099] leading-none mt-0.5">{req.days}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase text-slate-950 dark:text-slate-50 tracking-widest">Sebab / Tujuan</p>
                            <p className="rounded-[16px] border border-border/40 p-4 font-bold text-foreground bg-muted/10 text-sm leading-relaxed">
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
                                <p className="text-[9px] font-black uppercase text-blue-600 opacity-80 tracking-widest px-1">Butiran Cuti Ganti</p>
                                <div className="border border-blue-500/20 rounded-[20px] overflow-hidden bg-blue-500/5">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-blue-500/10 hover:bg-blue-500/10 border-b border-blue-500/20">
                                        <TableHead className="py-2.5 px-4 text-[10px] text-blue-700 font-bold uppercase">Tarikh Cuti</TableHead>
                                        <TableHead className="py-2.5 px-4 text-[10px] text-blue-700 font-bold uppercase">Tarikh/Hari Cuti Ganti</TableHead>
                                        <TableHead className="py-2.5 px-4 text-[10px] text-blue-700 font-bold uppercase text-right">Jam Bekerja</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-blue-500/10 font-bold text-foreground/80">
                                      {rows.map((row, idx) => (
                                        <TableRow key={idx} className="hover:bg-blue-500/5">
                                          <TableCell className="py-2 px-4">{row.tarikhCuti || "-"}</TableCell>
                                          <TableCell className="py-2 px-4">{row.tarikhGanti || "-"}</TableCell>
                                          <TableCell className="py-2 px-4 text-right">{row.jamGanti || 0} Jam</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Conditional Fields: Cuti Tanpa Gaji */}
                          {(req.leave_type === "Unpaid Leave" || req.leave_type === "Cuti Tanpa Gaji") && (
                            <div className="grid grid-cols-2 gap-4 text-[10px] border rounded-[20px] p-4 bg-rose-500/5 border-rose-500/20">
                              <div>
                                <p className="uppercase font-black text-rose-600 opacity-60">No. Tel H/P</p>
                                <p className="font-black mt-0.5">{req.cuti_tanpa_gaji_phone || "-"}</p>
                              </div>
                              <div>
                                <p className="uppercase font-black text-rose-600 opacity-60">Tandatangan</p>
                                <p className="font-black mt-0.5 text-rose-700">
                                  {req.cuti_tanpa_gaji_signature ? "✓ DISAHKAN" : "TIADA PENGESAHAN"}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Conditional Fields: Cuti Sakit (MC) */}
                          {(req.leave_type === "Sick Leave" || req.leave_type === "Cuti Sakit") && req.mc_file_url && (
                            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-[16px] flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-[#7B0099]" />
                                <span className="text-[10px] font-black text-[#7B0099] uppercase tracking-widest">MC Attachment</span>
                              </div>
                              <a
                                href={`${API_BASE_URL}${req.mc_file_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] font-black uppercase tracking-widest bg-[#7B0099] text-white px-4 py-2 rounded-xl hover:bg-[#5e0080] transition-colors shadow-lg"
                              >
                                View File
                              </a>
                            </div>
                          )}

                          {/* Maklumat Waris Section */}
                          <div className="pt-4 border-t border-border/50 space-y-4">
                            <div className="flex items-center gap-2">
                              <PhoneCall className="w-4 h-4 text-rose-500" />
                              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Maklumat Waris (Kecemasan)</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-[20px]">
                              <div className="space-y-1">
                                <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">Nama</span>
                                <p className="text-[11px] font-bold truncate">{req.waris_nama || "-"}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">Hubungan</span>
                                <p className="text-[11px] font-bold truncate">{req.waris_hubungan || "-"}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">No. Telefon</span>
                                <p className="text-[11px] font-black text-[#7B0099]">{req.waris_phone || "-"}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">Alamat</span>
                                <p className="text-[10px] font-bold text-muted-foreground break-words">{req.waris_alamat || "-"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="hidden print:grid grid-cols-2 gap-16 pt-12 pb-4">
                            <div className="border-t border-foreground pt-2 text-center">
                              <p className="text-[10px] font-bold uppercase">Tandatangan Kakitangan</p>
                            </div>
                            <div className="border-t border-foreground pt-2 text-center">
                              <p className="text-[10px] font-bold uppercase">Kelulusan Pengurus / HR</p>
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
                  {branchesList.map((b) => (
                    <SelectItem key={b.code} value={b.code}>
                      {b.name}
                    </SelectItem>
                  ))}
                  {branchesList.length === 0 && (
                    <SelectItem value="HQ" disabled>Loading branches...</SelectItem>
                  )}
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
                    {departmentsList.map((d) => {
                      const dName = d.name || d.department_name || d;
                      return (
                        <SelectItem key={dName} value={dName}>
                          {dName}
                        </SelectItem>
                      );
                    })}
                    {departmentsList.length === 0 && (
                      <SelectItem value="IT" disabled>Loading departments...</SelectItem>
                    )}
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
                  {availableRoles.filter(r => r.status === 'Active').map(r => (
                    <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                  ))}
                  {availableRoles.filter(r => r.status === 'Active').length === 0 && (
                    <SelectItem value="Employee" disabled>No roles available</SelectItem>
                  )}
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

