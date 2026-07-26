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
  X,
  PhoneCall,
  Download
} from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
        <DialogContent className="max-w-2xl w-full overflow-y-auto max-h-[90vh]">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-black text-slate-800">Staff Profile</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {selectedEmployee ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <Badge className={`text-white font-black text-[9px] h-5 ${selectedEmployee.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}>{selectedEmployee.status}</Badge>
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
                      <div key={req.leave_id} className="rounded-lg border p-4 space-y-4 bg-white shadow-sm mb-4">
                        <div className="text-center border-b-2 border-foreground pb-4">
                          <h2 className="text-2xl font-black tracking-tight text-foreground">RAYHAR GROUP</h2>
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
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-blue-100/50 hover:bg-blue-100/50 border-b border-blue-100">
                                      <TableHead className="py-2.5 px-4 text-[10px] text-blue-700 font-bold uppercase">Tarikh Cuti</TableHead>
                                      <TableHead className="py-2.5 px-4 text-[10px] text-blue-700 font-bold uppercase">Tarikh/Hari Cuti Ganti</TableHead>
                                      <TableHead className="py-2.5 px-4 text-[10px] text-blue-700 font-bold uppercase text-right">Jam Bekerja</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody className="divide-y divide-blue-100 font-medium text-slate-800">
                                    {rows.map((row, idx) => (
                                      <TableRow key={idx} className="hover:bg-blue-50/50">
                                        <TableCell className="py-2 px-4">{row.tarikh || "-"}</TableCell>
                                        <TableCell className="py-2 px-4">{row.hari || "-"}</TableCell>
                                        <TableCell className="py-2 px-4 text-right">{row.jam || 0} Jam</TableCell>
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
                          <div className="grid grid-cols-2 gap-4 text-sm border rounded-xl p-4 bg-rose-50/50 border-rose-100">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-rose-600">No. Tel H/P</p>
                              <p className="font-bold text-base text-foreground">{req.cuti_tanpa_gaji_phone || "-"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-rose-600">Tandatangan Pengesahan</p>
                              <p className="font-bold text-base text-foreground">
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
                              <p className="text-sm font-semibold text-foreground border-b border-dotted pb-1">
                                {req.waris_nama || "-"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">Hubungan</label>
                              <p className="text-sm font-semibold text-foreground border-b border-dotted pb-1">
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
