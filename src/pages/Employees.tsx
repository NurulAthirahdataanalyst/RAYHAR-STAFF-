import { useNavigate } from "react-router-dom";
import { MonthPicker } from '@/components/shared/MonthPicker';
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
  Printer,
    MapPin,
    Trash2,
    ArrowLeft, Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useReactToPrint } from "react-to-print";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { parseCutiGantiRows, getCleanReason } from "@/lib/leaveStorage";
import { API_BASE_URL } from "../config/api";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { StaffProfileDialog } from "@/components/shared/StaffProfileDialog";

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

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2)*Math.sin(dp/2) + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function Employees() {
  const navigate = useNavigate();

  const { role, userBranch, userDepartment } = useRole();
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });
  const [search, setSearch] = useState("");
  const [empSearchOpen, setEmpSearchOpen] = useState(false);
  const [empSearchText, setEmpSearchText] = useState("");
  const [checkedEmployees, setCheckedEmployees] = useState<string[]>([]);
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
  const [selectedLeaveFormDetail, setSelectedLeaveFormDetail] = useState<any>(null);
  const [printingLeaveId, setPrintingLeaveId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState<any>(null);
  const [statusConfirmEmp, setStatusConfirmEmp] = useState<any>(null);
  const [analyticsDate, setAnalyticsDate] = useState<string>(new Date().toISOString().substring(0, 7));

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
      fetchAttendanceSettings(selectedEmployee.user_id);
    } else {
      setAnalytics(null);
    }
  }, [selectedEmployee, isModalOpen, analyticsDate]);

  const [todayStats, setTodayStats] = useState<any>(null);

  const fetchTodayStats = async (uid: string) => {
    try {
      const dStr = new Date().toLocaleDateString("en-CA");
      const res = await fetch(`${API_BASE_URL}/api/dashboard-stats?userId=${uid}&date=${dStr}`);
      const data = await res.json();
      if (data.success && data.stats) {
        setTodayStats(data.stats);
      } else {
        setTodayStats(null);
      }
    } catch(e) {
      setTodayStats(null);
    }
  };

  const [tempAssignment, setTempAssignment] = useState({ location: "", start_date: "", end_date: "", status: "Active" });
  const [tempAssignmentsHistory, setTempAssignmentsHistory] = useState<any[]>([]);
  const [allowedLocations, setAllowedLocations] = useState<string[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [locationHistory, setLocationHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchAttendanceSettings = async (userId: string) => {
    fetchTodayStats(userId);
    setLoadingSettings(true);
    try {
      const [waRes, alRes, histRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/work-assignments/${userId}`),
        fetch(`${API_BASE_URL}/api/allowed-locations/${userId}`),
          fetch(`${API_BASE_URL}/api/employee-location-history?userId=${userId}&days=14`)
      ]);
      const waData = await waRes.json();
      const alData = await alRes.json();

      if (waData.success && waData.assignments.length > 0) {
        setTempAssignmentsHistory(waData.assignments);
        const activeOrLatest = waData.assignments[0];
        setTempAssignment({
          location: activeOrLatest.location,
          start_date: activeOrLatest.start_date ? activeOrLatest.start_date.split('T')[0] : "",
          end_date: activeOrLatest.end_date ? activeOrLatest.end_date.split('T')[0] : "",
          status: activeOrLatest.status
        });
      } else {
        setTempAssignmentsHistory([]);
        setTempAssignment({ location: "", start_date: "", end_date: "", status: "Active" });
      }

      if (alData.success) {
        setAllowedLocations(alData.allowedLocations);
        }
        if (histRes.ok) {
          const hData = await histRes.json();
          let sorted = [];
          if (hData.success) {
            sorted = (hData.history || []).slice().sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            const now = new Date();
            try {
              const attRes = await fetch(`${API_BASE_URL}/api/attendance/history?userId=${userId}&month=all&year=${now.getFullYear()}`);
              const attJ = await attRes.json();
              if (attJ.success && attJ.history) {
                sorted.forEach((loc: any) => {
                  const locTime = new Date(loc.timestamp).getTime();
                  const matchingAtt = attJ.history.find((a: any) => {
                    if (!a.clock_in) return false;
                    const ciTime = new Date(a.clock_in).getTime();
                    if (Math.abs(locTime - ciTime) < 120000) return true;
                    if (a.clock_out) {
                      const coTime = new Date(a.clock_out).getTime();
                      if (Math.abs(locTime - coTime) < 120000) return true;
                    }
                    return false;
                  });
                  if (matchingAtt) {
                    const ciTime = new Date(matchingAtt.clock_in).getTime();
                    const coTime = matchingAtt.clock_out ? new Date(matchingAtt.clock_out).getTime() : 0;
                    if (Math.abs(locTime - ciTime) < 120000) loc.attendance_status = "Clock In";
                    else if (coTime && Math.abs(locTime - coTime) < 120000) loc.attendance_status = "Clock Out";
                  }
                });
              }
            } catch (e) {
              console.error("Failed to merge attendance history", e);
            }
          }
          setLocationHistory(sorted);
        }
    } catch (e) {
      console.error(e);
    }
    setLoadingSettings(false);
  };

  const saveTempAssignment = async () => {
    if (!selectedEmployee) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/work-assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tempAssignment, user_id: selectedEmployee.user_id })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Temporary Assignment Saved" });
        fetchAttendanceSettings(selectedEmployee.user_id);
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast({ title: "Error Saving Assignment", description: e.message, variant: "destructive" });
    }
  };

  const saveAllowedLocations = async () => {
    if (!selectedEmployee) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/allowed-locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedEmployee.user_id, branches: allowedLocations })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Allowed Locations Saved" });
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast({ title: "Error Saving Locations", description: e.message, variant: "destructive" });
    }
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const { toast } = useToast();

  // Add User State
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupBranch, setSignupBranch] = useState("HQ");
  const [signupDepartment, setSignupDepartment] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

      const [empRes, assignRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/employees?${params}`),
        fetch(`${API_BASE_URL}/api/work-assignments-all`)
      ]);
      const data = await empRes.json();
      const assignData = await assignRes.json();
      let assignments: any[] = [];
      if (assignData.success) {
        assignments = assignData.assignments;
      }

      if (!empRes.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch employees");
      }

      const formattedData = data.employees.map((employee: any) => {
        const activeAssignment = assignments.find((a: any) => 
          a.user_id === employee.user_id && a.status === 'Active' && 
          (!a.start_date || new Date(a.start_date) <= new Date()) &&
          (!a.end_date || new Date(a.end_date) >= new Date())
        );

        return {
          ...employee,
          id: employee.user_id,
          name: employee.full_name || "New User",
          email: employee.email || "Account Active",
          position: (employee.role === "operation_manager" || employee.role === "finance_manager" || employee.position === "Finance Manager" || employee.position === "finance_manager") ? "Operation Manager" : employee.role === "hr_admin" ? "HR Admin" : employee.role ? String(employee.role).split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : "Employee",
          branch: employee.branch || "HQ",
          department: employee.department || "General",
          status: employee.status || "Active",
          tempBranch: activeAssignment ? activeAssignment.location : null,
        };
      });

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
  ).sort((a, b) => {
    if (a === "Rayhar HQ" || a === "HQ") return -1;
    if (b === "Rayhar HQ" || b === "HQ") return 1;
    return (a as string).localeCompare(b as string);
  }) as string[];

  const uniquePositions = Array.from(
    new Set(dbEmployees.map((emp) => emp.position).filter(Boolean))
  ).sort() as string[];

  const filtered = dbEmployees.filter((e) => {
    const matchesSearch = checkedEmployees.length > 0
        ? checkedEmployees.includes(e.id?.toString() || e.user_id || e.name)
        : (!search || e.name.toLowerCase().includes(search.toLowerCase()) || e.position.toLowerCase().includes(search.toLowerCase()));
    const matchesBranch = selectedBranch === "All" || e.branch === selectedBranch;
    const matchesPosition = selectedPosition === "All" || e.position === selectedPosition;
    const matchesStatus = selectedStatus === "All" || e.status === selectedStatus;
    return matchesSearch && matchesBranch && matchesPosition && matchesStatus;
  });

  // Sort priority for roles: Head of Department at position 4, Branch Leader at position 5
  const getRolePriority = (roleStr: string) => {
    switch (roleStr) {
      case "managing_director": return 1;
      case "operation_manager":
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
    const today = new Date().toISOString().split('T')[0];
    const csvContent = [
      ["Name", "Email", "Position", "Permanent Branch", "Working Branch", "Status"],
      ...filtered.map((emp) => {
        // Use active temporary branch if available, otherwise permanent branch
        const workingBranch = emp.tempBranch || emp.branch;
        return [
          `"${emp.name}"`,
          `"${emp.email}"`,
          `"${emp.position === "Finance Manager" || emp.position === "finance_manager" ? "Operation Manager" : emp.position.replace(/_/g, ' ')}"`,
          `"${emp.branch}"`,
          `"${workingBranch}"`,
          `"${emp.status}"`,
        ];
      })
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

  
  const handleDeleteEmployee = async () => {
    if (!deleteConfirmEmp) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: deleteConfirmEmp.id || deleteConfirmEmp.user_id,
          status: "Deleted"
        })
      });

      if (!response.ok) throw new Error("Failed to delete employee");

      toast({
        title: "Success",
        description: "Staff record has been permanently deleted.",
      });

      await fetchEmployees();
      setDeleteConfirmEmp(null);
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast({
        title: "Error",
        description: "Failed to delete employee. Please try again.",
        variant: "destructive",
      });
    }
  };

    const handleToggleStatus = (e: React.MouseEvent, emp: any) => {
    e.stopPropagation();
    setStatusConfirmEmp(emp);
  };

  const confirmToggleStatus = async () => {
    if (!statusConfirmEmp) return;
    try {
      const currentStatus = statusConfirmEmp.status || "Active";
      const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
      
      const response = await fetch(`${API_BASE_URL}/api/employees/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: statusConfirmEmp.id || statusConfirmEmp.user_id,
          status: nextStatus,
          changer_role: role
        })
      });

      if (!response.ok) throw new Error("Failed to update status");

      toast({
        title: "Success",
        description: `Staff record has been marked as ${nextStatus}.`,
      });

      await fetchEmployees();
      setStatusConfirmEmp(null);
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update employee status. Please try again.",
        variant: "destructive",
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
    <div className="space-y-4 sm:space-y-4 animate-in fade-in duration-500">

        <div className="mb-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 gap-2 px-0 text-foreground hover:bg-transparent hover:text-[#7B0099] transition-colors touch-target no-global-hover"
            onClick={() => navigate("/master")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Back to Employee Management
            </span>
          </Button>

          {["hr_admin", "managing_director", "operation_manager", "finance_manager"].includes(role) ? (
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="h-9 px-6 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/95 font-black text-[9px] uppercase tracking-wider shadow-lg shadow-[#7B0099]/15 transition-all whitespace-nowrap touch-target flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4 w-full sm:w-auto">
              <ExportDropdown onExportCSV={handleExportCSV} />
            </div>
          )}
        </div>



      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-card/50 backdrop-blur-sm p-3 rounded-2xl border border-border/50">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto flex-1">
          <Popover open={empSearchOpen} onOpenChange={setEmpSearchOpen}>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50 z-10 pointer-events-none" />
                
                <PopoverAnchor asChild>
                  <Input
                    placeholder={checkedEmployees.length > 0 ? `${checkedEmployees.length} employee${checkedEmployees.length > 1 ? 's' : ''} selected` : "Search employees..."}
                    value={empSearchText}
                    onFocus={() => setEmpSearchOpen(true)}
                    onChange={(e) => {
                        setEmpSearchText(e.target.value);
                        setSearch(e.target.value);
                        if (!empSearchOpen) setEmpSearchOpen(true);
                    }}
                    className={`pl-9 pr-8 h-11 sm:h-10 border bg-background/50 rounded-xl font-semibold text-xs focus-visible:ring-1 focus-visible:ring-[#7B0099]/50 w-full transition-all ${checkedEmployees.length > 0 ? 'border-[#7B0099]/50 text-[#7B0099] placeholder:text-[#7B0099]/80 placeholder:font-bold' : 'border-border/60'}`}
                  />
                </PopoverAnchor>
                <PopoverTrigger asChild>
                  <button type="button" className="sr-only" aria-hidden="true" />
                </PopoverTrigger>
                {(search || checkedEmployees.length > 0) && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSearch(''); setCheckedEmployees([]); setEmpSearchText(''); }} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground z-10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <PopoverContent className="w-[340px] p-0 shadow-xl" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                {checkedEmployees.length > 0 && (
                  <div className="p-3 border-b border-border/50">
                    <div className="flex flex-wrap gap-1.5">
                      {checkedEmployees.map(id => {
                        const emp = dbEmployees.find(e => (e.id?.toString() || e.user_id || e.name) === id);
                        return emp ? (
                          <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7B0099]/10 text-[#7B0099] text-[10px] font-bold">
                            {emp.name}
                            <button onClick={() => setCheckedEmployees(prev => prev.filter(x => x !== id))} className="hover:text-red-500">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                <div className="max-h-[260px] overflow-y-auto p-1">
                  {(() => {
                    const empList = dbEmployees
                      .filter(e => {
                        const bMatch = selectedBranch === "All" || e.branch === selectedBranch;
                        const pMatch = selectedPosition === "All" || e.position === selectedPosition;
                        const sMatch = selectedStatus === "All" || e.status === selectedStatus;
                        const tMatch = !empSearchText || e.name.toLowerCase().includes(empSearchText.toLowerCase()) || (e.user_id || '').toLowerCase().includes(empSearchText.toLowerCase());
                        return bMatch && pMatch && sMatch && tMatch;
                      })
                      .sort((a, b) => {
                        const aId = a.id?.toString() || a.user_id || a.name;
                        const bId = b.id?.toString() || b.user_id || b.name;
                        const aChecked = checkedEmployees.includes(aId) ? 0 : 1;
                        const bChecked = checkedEmployees.includes(bId) ? 0 : 1;
                        if (aChecked !== bChecked) return aChecked - bChecked;
                        return a.name.localeCompare(b.name);
                      });
                    return empList.map(emp => {
                      const empId = emp.id?.toString() || emp.user_id || emp.name;
                      const isChecked = checkedEmployees.includes(empId);
                      return (
                        <div
                          key={empId}
                          onClick={() => {
                            setCheckedEmployees(prev =>
                              prev.includes(empId) ? prev.filter(x => x !== empId) : [...prev, empId]
                            );
                          }}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-[#7B0099]/5' : 'hover:bg-muted/50'}`}
                        >
                          <label className="relative cursor-pointer" style={{width:18,height:18}} onClick={(e) => e.preventDefault()}>
                            <input type="checkbox" checked={isChecked} readOnly className="sr-only peer" />
                            <svg viewBox="0 0 18 18" width="18" height="18" className="relative z-10" style={{fill:'none',strokeLinecap:'round',strokeLinejoin:'round',stroke: isChecked ? '#7B0099' : '#c8ccd4',strokeWidth:1.5,transition:'all 0.2s ease'}}>
                              <path d="M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z"
                                style={{strokeDasharray:60, strokeDashoffset: isChecked ? 60 : 0, transition:'all 0.3s linear'}} />
                              <polyline points="1 9 7 14 15 4"
                                style={{strokeDasharray:22, strokeDashoffset: isChecked ? 42 : 66, transition: isChecked ? 'all 0.2s linear 0.15s' : 'all 0.2s linear'}} />
                            </svg>
                          </label>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate ${isChecked ? 'text-[#7B0099]' : 'text-foreground'}`}>{emp.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{emp.user_id || emp.email || ''} · {emp.branch || ''}</p>
                          </div>
                          {isChecked && <span className="text-[10px] font-bold text-[#7B0099] bg-[#7B0099]/10 px-2 py-0.5 rounded-full">Selected</span>}
                        </div>
                      );
                    });
                  })()}
                </div>
                {checkedEmployees.length > 0 && (
                  <div className="border-t border-border/50 p-2 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-[#7B0099]">{checkedEmployees.length} selected</span>
                    <Button size="sm" variant="ghost" className="text-[10px] h-6 text-red-500 hover:text-red-600" onClick={() => setCheckedEmployees([])}>Clear All</Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

          {(["hr_admin", "managing_director", "operation_manager", "finance_manager"].includes(role) || uniqueBranches.length > 1) && (
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
              <p className="text-xs font-bold text-foreground animate-pulse uppercase tracking-widest">Loading Personnel...</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="py-4 px-6">Staff Member</TableHead>
                      <TableHead className="py-4 px-6">Position</TableHead>
                      <TableHead className="py-4 px-6">Branch</TableHead>
                      <TableHead className="py-4 px-6">Status</TableHead>
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
                                {String(emp.name).split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-foreground group-hover:text-[#7B0099] transition-colors">{emp.name}</p>
                                <p className="text-[10px] text-foreground truncate font-medium">{emp.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <span className="text-xs font-bold text-foreground capitalize">
                              {emp.position === "Finance Manager" || emp.position === "finance_manager" ? "Operation Manager" : emp.position.replace(/_/g, ' ')}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 px-6 text-xs font-bold text-foreground">
                            <div className="flex flex-col gap-1 items-start">
                              <span>{emp.branch}</span>
                              {emp.tempBranch && (
                                <Badge variant="outline" className="text-[9px] bg-[#a01497]/10 text-[#a01497] border-[#a01497]/20 whitespace-nowrap">
                                  Temp: {emp.tempBranch}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-[10px] font-black px-3 ${emp.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : emp.status === 'Inactive' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-rose-500 hover:bg-rose-600 text-white'}`}>
                                  {emp.status === 'Deleted' ? 'Deleted Staff' : `${emp.status} Staff`}
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
                                {role === "hr_admin" && emp.status !== "Deleted" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmEmp(emp); }}
                                    className="h-7 w-7 p-0 text-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center text-foreground italic font-medium">No employees found matching your search.</TableCell>
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
                        {String(emp.name).split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-black text-sm text-foreground truncate">{emp.name}</p>
                           <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Badge className={`text-[9px] font-black h-5 shrink-0 ${emp.status === 'Active' ? 'bg-emerald-500 text-white' : emp.status === 'Inactive' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {emp.status === 'Deleted' ? 'Deleted Staff' : `${emp.status} Staff`}
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
                                {role === "hr_admin" && emp.status !== "Deleted" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmEmp(emp); }}
                                    className="h-7 w-7 p-0 text-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-foreground uppercase tracking-wider">
                          <span className="truncate max-w-[100px]">
                            {emp.position === "Finance Manager" || emp.position === "finance_manager" ? "Operation Manager" : emp.position.replace(/_/g, ' ')}
                          </span>
                          <span className="opacity-30">â€¢</span>
                          <span>{emp.branch}</span>
                          {emp.tempBranch && (
                            <>
                              <span className="opacity-30">â€¢</span>
                              <Badge variant="outline" className="text-[9px] bg-[#a01497]/10 text-[#a01497] border-[#a01497]/20">
                                Temp: {emp.tempBranch}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-foreground italic font-medium p-6">No employees found.</div>
                )}
              </div>

              {/* Pagination Controls */}
              {filtered.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                    <span>
                      TOTAL SHOWING {indexOfFirstItem + 1} TO {Math.min(indexOfLastItem, filtered.length)} OF {filtered.length} ENTRIES
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
                      {"<"}
                    </Button>
                    <div className="flex items-center gap-1 overflow-x-auto max-w-[150px] sm:max-w-none scrollbar-hide">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-8 w-8 p-0 text-xs font-bold ${currentPage === pageNum ? 'bg-[#a01497] text-white hover:bg-[#8a1182]' : 'text-slate-600 dark:text-slate-300'}`}
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="h-8 px-3 text-xs font-bold"
                    >
                      {">"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Employee Details */}
      <StaffProfileDialog 
        employeeId={selectedEmployee?.user_id} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      {/* LEAVE FORMS DIALOG */}
      <Dialog open={!!viewLeaveStatus} onOpenChange={(open) => !open && setViewLeaveStatus(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <div className="print:hidden">
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
                <p className="text-sm text-center text-foreground p-4 italic">No {viewLeaveStatus?.toLowerCase()} leave records found for this staff member.</p>
              ) : (
                <div className="border border-border/50 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-[10px]">Leave Type</TableHead>
                        <TableHead className="text-[10px]">Start Date</TableHead>
                        <TableHead className="text-[10px]">End Date</TableHead>
                        <TableHead className="text-[10px]">Days</TableHead>
                        <TableHead className="text-[10px] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeLeaves
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
                            <TableRow key={req.leave_id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedLeaveFormDetail(req)}>
                              <TableCell className="font-bold text-xs">{req.leave_type}</TableCell>
                              <TableCell className="text-xs">{fromStr}</TableCell>
                              <TableCell className="text-xs">{toStr}</TableCell>
                              <TableCell className="text-xs font-bold">{req.days}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] bg-[#7B0099] text-white hover:bg-[#5c0073] font-bold"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLeaveFormDetail(req);
                                  }}
                                >
                                  View Form
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>

      {/* LEAVE APPLICATION DETAIL DIALOG (MATCHES LEAVE ADMIN) */}
      <Dialog open={!!selectedLeaveFormDetail} onOpenChange={(open) => !open && setSelectedLeaveFormDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-none shadow-2xl rounded-[32px] p-0 safe-area-bottom">
          {selectedLeaveFormDetail && (() => {
            const req = selectedLeaveFormDetail;
            const fromStr = new Date(req.start_date).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const toStr = new Date(req.end_date).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return (
              <>
                <div className="p-6 bg-gradient-to-br from-[#7B0099] to-[#a855f7] text-white print:hidden">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-white text-xl font-black tracking-tight">
                      <FileText className="h-6 w-6" />
                      Leave Application Detail
                    </DialogTitle>
                    <DialogDescription className="text-white/80 font-bold uppercase text-[10px] tracking-widest">
                      HR Approval Registry â€¢ ID: {req.leave_id}
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div id="leave-form-print" ref={printRef} className="p-4 sm:p-6 space-y-4">
                  <div className="rounded-[24px] border border-border/50 p-4 sm:p-6 space-y-4 bg-card shadow-sm">
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

                    <div className="grid grid-cols-4 gap-3 p-4 bg-muted/30 rounded-[20px] border border-border/50">
                      <div className="text-center flex flex-col justify-center">
                        <p className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50 mb-1">Dari</p>
                        <p className="font-black text-xs sm:text-sm">{fromStr}</p>
                      </div>
                      <div className="text-center flex flex-col justify-center border-l border-border/50">
                        <p className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50 mb-1">Hingga</p>
                        <p className="font-black text-xs sm:text-sm">{toStr}</p>
                      </div>
                      <div className="text-center bg-white dark:bg-slate-900 rounded-[14px] border border-border/50 py-1 shadow-sm flex flex-col justify-center">
                        <p className="text-[9px] uppercase font-black text-[#7B0099]">Hari</p>
                        <p className="font-black text-lg text-[#7B0099] leading-none mt-0.5">{req.days}</p>
                      </div>
                      <div className="text-center rounded-[14px] border-2 border-emerald-500 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-center py-1">
                        <p className="text-[9px] uppercase font-black text-emerald-600">Baki Layak</p>
                        <p className="font-black text-sm text-emerald-600 mt-0.5">
                          {analytics?.leave?.remaining ?? selectedEmployee?.annual_leave_balance ?? req.balance ?? "-"} HARI
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase text-slate-950 dark:text-slate-50 tracking-widest">Sebab / Tujuan</p>
                      <p className="rounded-[16px] border border-border/40 p-4 font-bold text-foreground bg-muted/10 text-sm leading-relaxed">
                        {getCleanReason(req.reason) || "-"}
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
                                  <TableHead className="py-2.5 px-4 text-[10px]">Tarikh Cuti</TableHead>
                                  <TableHead className="py-2.5 px-4 text-[10px]">Tarikh/Hari Cuti Ganti</TableHead>
                                  <TableHead className="py-2.5 px-4 text-[10px]">Keterangan / Tugasan</TableHead>
                                  <TableHead className="py-2.5 px-4 text-[10px] text-right">Jam Bekerja</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="divide-y divide-blue-500/10 font-bold text-foreground/80">
                                {rows.map((row, idx) => (
                                  <TableRow key={idx} className="hover:bg-blue-500/5">
                                    <TableCell className="py-2 px-4">{row.tarikhCuti || "-"}</TableCell>
                                    <TableCell className="py-2 px-4">{row.tarikhGanti || "-"}</TableCell>
                                    <TableCell className="py-2 px-4 whitespace-normal break-words max-w-[200px] text-[11px] text-blue-900/80 font-medium">{row.keterangan || "-"}</TableCell>
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
                            {req.cuti_tanpa_gaji_signature ? "âœ“ DISAHKAN" : "TIADA PENGESAHAN"}
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
                          <p className="text-[11px] font-bold break-words">{req.waris_alamat || "-"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Approval History Timeline */}
                    {req.approval_history && req.approval_history.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#7B0099]" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">
                            Approval History
                          </h3>
                        </div>
                        <div className="relative space-y-4 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
                          {req.approval_history.map((history: any, idx: number) => (
                            <div key={idx} className="relative flex items-start gap-4">
                              <div className={`absolute left-4 -translate-x-1/2 flex h-2 w-2 items-center justify-center rounded-full border border-white dark:border-slate-900 ${history.status === 'Approved' ? 'bg-emerald-500' : 'bg-rose-500'} z-10`} />
                              <div className="ml-6 flex-1 bg-muted/30 rounded-[16px] p-3 border border-border/40">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${history.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                      {history.status}
                                    </span>
                                    <span className="text-[10px] font-black text-foreground/70">
                                      by {history.approver_name || history.approver_id}
                                    </span>
                                  </div>
                                  <span className="text-[8px] font-black text-foreground/50">
                                    {new Date(history.created_at).toLocaleDateString('ms-MY')}
                                  </span>
                                </div>
                                {history.remarks && (
                                  <p className="text-[10px] italic text-foreground bg-white/50 dark:bg-black/20 p-2 rounded-lg mt-1">
                                    "{history.remarks}"
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="hidden print:grid grid-cols-2 gap-16 pt-12 pb-4">
                      <div className="border-t border-foreground pt-2 text-center">
                        <p className="text-[10px] font-bold uppercase">Tandatangan Kakitangan</p>
                      </div>
                      <div className="border-t border-foreground pt-2 text-center">
                        <p className="text-[10px] font-bold uppercase">Kelulusan Pengurus / HR</p>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 print:hidden">
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2 border-[#7B0099] text-[#7B0099] hover:bg-[#7B0099]/5 rounded-xl font-black text-[10px] uppercase tracking-widest px-6"
                        onClick={() => {
                          const originalTitle = document.title;
                          const empName = selectedEmployee?.name || selectedEmployee?.full_name || "UNKNOWN";
                          const branch = selectedEmployee?.branch || selectedEmployee?.branch_code || "HQ";
                          document.title = `LEAVE REQUEST ( ${empName.toUpperCase()} - ${branch.toUpperCase()} )`;
                          handlePrint();
                          setTimeout(() => {
                            document.title = originalTitle;
                          }, 500);
                        }}
                      >
                        <Printer className="w-4 h-4" /> Save to PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      
            {/* Status Confirmation Modal */}
      <Dialog open={!!statusConfirmEmp} onOpenChange={(open) => !open && setStatusConfirmEmp(null)}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80">
          <DialogHeader>
            <DialogTitle className={`text-xl font-black ${statusConfirmEmp?.status === "Active" ? "text-amber-600" : "text-emerald-600"}`}>
              {statusConfirmEmp?.status === "Active" ? "Inactive Employee?" : "Reactivate Employee?"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-foreground dark:text-slate-300">
              {statusConfirmEmp?.status === "Active" 
                ? <>Are you sure you want to mark <strong>{statusConfirmEmp?.name}</strong> as Inactive?</>
                : <>Are you sure you want to reactivate <strong>{statusConfirmEmp?.name}</strong>?</>}
            </p>
            <div className={`border rounded-lg p-3 ${statusConfirmEmp?.status === "Active" ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"}`}>
              <p className={`text-xs font-medium leading-relaxed ${statusConfirmEmp?.status === "Active" ? "text-amber-600" : "text-emerald-600"}`}>
                {statusConfirmEmp?.status === "Active" 
                  ? "This action is temporary and can be reversed later. The employee's records will be retained." 
                  : "This action will restore the employee's active status and grant them system access."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusConfirmEmp(null)}>
              Cancel
            </Button>
            <Button 
              variant={statusConfirmEmp?.status === "Active" ? "destructive" : "default"} 
              onClick={confirmToggleStatus} 
              className={statusConfirmEmp?.status === "Active" ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
            >
              {statusConfirmEmp?.status === "Active" ? "Inactive" : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirmEmp} onOpenChange={(open) => !open && setDeleteConfirmEmp(null)}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-rose-600">Delete Employee?</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-foreground dark:text-slate-300">
              Are you sure you want to permanently delete <strong>{deleteConfirmEmp?.name}</strong> from <strong>{deleteConfirmEmp?.branch}</strong>?
            </p>
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg p-3">
              <p className="text-xs text-rose-600 font-medium leading-relaxed">
                ⚠️ This action is permanent and cannot be undone or recovered. All employee records associated with this account will be deleted.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmEmp(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEmployee} className="bg-rose-600 hover:bg-rose-700">
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80">
          <DialogHeader className="bg-[#942392] p-6 -mx-6 -mt-6 sm:rounded-t-lg">
            <DialogTitle className="text-white">Add New Staff</DialogTitle>
            <DialogDescription className="text-white/80">
              Create a new user account for an employee. They will be assigned to the selected branch.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSignup} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Full Name</Label>
              <Input id="signup-name" type="text" className="bg-slate-100 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800" placeholder="e.g. AHMAD ALBAB" value={signupName} onChange={(e) => setSignupName(e.target.value.toUpperCase())} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" type="email" className="bg-slate-100 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800" placeholder="ahmad@rayhar.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-branch">Branch</Label>
              <Select value={signupBranch} onValueChange={setSignupBranch}>
                <SelectTrigger className="rounded-md bg-slate-100 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800">
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
                  <SelectTrigger className="rounded-md bg-slate-100 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800">
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
                <SelectTrigger className="rounded-md bg-slate-100 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800">
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
              <div className="relative">
                <Input id="signup-password" type={showPassword ? "text" : "password"} className="bg-slate-100 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800 pr-10" placeholder="Min. 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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




