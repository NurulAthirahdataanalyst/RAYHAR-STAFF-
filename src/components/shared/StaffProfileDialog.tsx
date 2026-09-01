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
  Printer
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useReactToPrint } from "react-to-print";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { parseCutiGantiRows, getCleanReason } from "@/lib/leaveStorage";
import { API_BASE_URL } from "@/config/api";
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


// Haversine formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

export function StaffProfileDialog({ 
  employeeId, 
  isOpen, 
  onClose 
}: { 
  employeeId: string | null; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const { role, userBranch, userDepartment } = useRole();
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });
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
  const [selectedLeaveFormDetail, setSelectedLeaveFormDetail] = useState<any>(null);
  const [printingLeaveId, setPrintingLeaveId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [todayStats, setTodayStats] = useState<any>(null);

  useEffect(() => {
    if (isOpen && employeeId) {
      // Fetch employee basic info
      fetch(`${API_BASE_URL}/api/employees`)
        .then(r => r.json())
        .then(data => {
           if(data.success) {
              const emp = data.employees.find((e: any) => e.user_id === employeeId || e.id === employeeId);
              if(emp) {
                 // Format the raw API employee to match the shape expected by the render code
                 const formatted = {
                   ...emp,
                   id: emp.user_id,
                   name: emp.full_name || emp.name || "New User",
                   email: emp.email || "Account Active",
                   position: (emp.role === "operation_manager" || emp.role === "finance_manager" || emp.position === "Finance Manager" || emp.position === "finance_manager") ? "Operation Manager" : emp.role === "hr_admin" ? "HR Admin" : emp.role ? String(emp.role).split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : "Employee",
                   branch: emp.branch || "HQ",
                   department: emp.department || "General",
                   status: emp.status || "Active",
                 };
                 setSelectedEmployee(formatted);
                 setIsModalOpen(true);
              }
           }
        });
    } else {
      setIsModalOpen(false);
      setSelectedEmployee(null);
    }
  }, [employeeId, isOpen]);

  // Sync internal modal state with onClose
  useEffect(() => {
    if (!isModalOpen && isOpen) {
      onClose();
    }
  }, [isModalOpen]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsDate, setAnalyticsDate] = useState<string>(new Date().toISOString().substring(0, 7));
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


  const fetchAnalytics = async (userId: string, dateStr = analyticsDate) => {
    setLoadingAnalytics(true);
    try {
      const params = new URLSearchParams();
      if (dateStr) {
        if (dateStr.endsWith('-all')) {
          params.append('month', 'all');
          params.append('year', dateStr.substring(0, 4));
        } else {
          const monthStr = dateStr.substring(0, 7); // YYYY-MM
          const yearStr = dateStr.substring(0, 4);  // YYYY
          params.append('month', monthStr);
          params.append('year', yearStr);
        }
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

    const [tempAssignmentsHistory, setTempAssignmentsHistory] = useState<any[]>([]);
  const [locationHistory, setLocationHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const historyItemsPerPage = 10;

  const [tempAssignment, setTempAssignment] = useState({ location: "", start_date: "", end_date: "", status: "Active" });
  const [allowedLocations, setAllowedLocations] = useState<string[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);

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
      const histData = await histRes.json();
      if (histData.success) {
        setLocationHistory(histData.history || []);
        setHistoryPage(1);
      } else {
        setLocationHistory([]);
      }

      if (waData.success) {
        setTempAssignmentsHistory(waData.assignments || []);
      }
      if (waData.success && waData.assignments.length > 0) {
        const activeOrLatest = waData.assignments[0];
        setTempAssignment({
          location: activeOrLatest.location,
          start_date: activeOrLatest.start_date ? activeOrLatest.start_date.split('T')[0] : "",
          end_date: activeOrLatest.end_date ? activeOrLatest.end_date.split('T')[0] : "",
          status: activeOrLatest.status
        });
      } else {
        setTempAssignment({ location: "", start_date: "", end_date: "", status: "Active" });
      }

      if (alData.success) {
        setAllowedLocations(alData.allowedLocations);
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
          position: (employee.role === "operation_manager" || employee.role === "finance_manager" || employee.position === "Finance Manager" || employee.position === "finance_manager") ? "Operation Manager" : employee.role === "hr_admin" ? "HR Admin" : employee.role ? employee.role.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : "Employee",
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
    <>
      {/* Employee Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl w-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] max-h-[90vh] p-0 gap-0 bg-slate-50 dark:bg-slate-900 print:hidden">
          <DialogHeader className="p-4 pb-3 border-b bg-[#942392] sticky top-0 z-10 shadow-sm text-white">
            <DialogTitle className="text-xl font-black tracking-tight text-white uppercase">Staff Profile & Analytics {selectedEmployee ? `- ${selectedEmployee.name} (${selectedEmployee.branch})` : ""}</DialogTitle>
          </DialogHeader>
          
          <div className="p-4">
            {selectedEmployee ? (
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="mb-4 flex w-fit mx-auto flex-wrap h-auto gap-1 bg-slate-100 dark:bg-slate-900 p-2 rounded-xl shadow-inner border border-slate-200 dark:border-slate-800">
                  <TabsTrigger value="basic" className="rounded-lg text-xs neumorphic-tab font-semibold">Staff Profile & Analytics</TabsTrigger>
                  <TabsTrigger value="attendance_settings" className="rounded-lg text-xs neumorphic-tab font-semibold">Attendance Settings</TabsTrigger>
                  <TabsTrigger value="temporary_assignment" className="rounded-lg text-xs neumorphic-tab font-semibold">Temporary Assignment</TabsTrigger>
                  <TabsTrigger value="multi_location" className="rounded-lg text-xs neumorphic-tab font-semibold">Multi Location Branch</TabsTrigger>
                  <TabsTrigger value="location_history" className="rounded-lg text-xs neumorphic-tab font-semibold">Location History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="mt-0">
                  <TooltipProvider>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: Bio & Info (4 cols) */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/60 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7B0099] to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-md shadow-[#7B0099]/20 mb-3 border-4 border-white">
                        {selectedEmployee.name.charAt(0)}
                      </div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight mb-1">{selectedEmployee.name}</h2>
                      <p className="text-xs font-semibold text-foreground dark:text-foreground mb-3">{selectedEmployee.email}</p>
                      
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200">
                        {selectedEmployee.position === "Finance Manager" || selectedEmployee.position === "finance_manager" ? "Operation Manager" : selectedEmployee.position?.replace(/_/g, ' ')}
                      </Badge>
                      
                      <div className="mt-5 w-full flex flex-col gap-2">
                        <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">User ID</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200">{selectedEmployee.user_id}</span>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">Branch</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200">{selectedEmployee.branch}</span>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">Department</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{selectedEmployee.department}</span>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">Status</span>
                          <Badge className={`text-white font-black text-[9px] uppercase tracking-wider ${selectedEmployee.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}>
                            {selectedEmployee.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Today's Attendance Card */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 dark:border-slate-700 shadow-sm flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                        <span className="text-[10px] font-black tracking-widest uppercase text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#7B0099]" />
                          TODAY'S ATTENDANCE
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                            📍 Clock In
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {todayStats?.todayStatus === "On Leave" || todayStats?.todayStatus === "Absent" || todayStats?.todayStatus === "Rest Day"
                              ? "--"
                              : (todayStats?.clockInTime && todayStats.clockInTime !== "--:--")
                              ? todayStats.clockInTime
                              : "--"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                            📍 Clock Out
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {(todayStats?.clockOutTime && todayStats.clockOutTime !== "--:--")
                              ? todayStats.clockOutTime
                              : "--"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                            📏 Distance
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {todayStats?.distanceMeters !== undefined && todayStats?.distanceMeters !== null
                              ? Number(todayStats.distanceMeters) >= 1000
                                ? `${(Number(todayStats.distanceMeters) / 1000).toFixed(2)} km`
                                : `${todayStats.distanceMeters} m`
                              : "--"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                            📌 Location
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]" title={
                            todayStats?.todayStatus === "On Leave"
                              ? "--"
                              : todayStats?.isOutstationToday
                              ? "Outstation"
                              : todayStats?.activeTemporaryAssignment
                              ? (BRANCH_NAMES[todayStats.activeTemporaryAssignment.location] || todayStats.activeTemporaryAssignment.location)
                              : (todayStats?.clockInTime && todayStats.clockInTime !== "--:--")
                              ? (todayStats?.attendanceLocation ? (BRANCH_NAMES[todayStats.attendanceLocation] || todayStats.attendanceLocation) : "Permanent Branch")
                              : "--"
                          }>
                            {todayStats?.todayStatus === "On Leave"
                              ? "--"
                              : todayStats?.isOutstationToday
                              ? "Outstation"
                              : todayStats?.activeTemporaryAssignment
                              ? (BRANCH_NAMES[todayStats.activeTemporaryAssignment.location] || todayStats.activeTemporaryAssignment.location)
                              : (todayStats?.clockInTime && todayStats.clockInTime !== "--:--")
                              ? (todayStats?.attendanceLocation ? (BRANCH_NAMES[todayStats.attendanceLocation] || todayStats.attendanceLocation) : "Permanent Branch")
                              : "--"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-foreground">Status:</span>
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                            <span className={`w-2 h-2 rounded-full ${
                              todayStats?.todayStatus?.includes("Present") || todayStats?.todayStatus?.includes("Clocked Out") ? "bg-emerald-500" :
                              todayStats?.todayStatus?.includes("On Leave") ? "bg-purple-500" :
                              todayStats?.todayStatus?.includes("Outstation") ? "bg-blue-500" :
                              todayStats?.todayStatus?.includes("Rest Day") ? "bg-slate-400" : "bg-rose-500"
                            }`} />
                            {todayStats?.todayStatus ? todayStats.todayStatus.replace(/\(.*?\)/g, '').trim() : "Absent"}
                          </span>
                        </div>

                        {/* Dynamic Tag */}
                        {todayStats?.isOutstationToday ? (
                          <Badge className="bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 text-[9px] font-bold">
                            Outstation
                          </Badge>
                        ) : todayStats?.activeTemporaryAssignment ? (
                          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 text-[9px] font-bold">
                            Temporary
                          </Badge>
                        ) : todayStats?.isMultiLocation ? (
                          <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 text-[9px] font-bold">
                            Multi Location
                          </Badge>
                        ) : todayStats?.todayStatus === "On Leave" && todayStats?.onLeaveType ? (
                          <Badge className="bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 text-[9px] font-bold">
                            {todayStats.onLeaveType}
                          </Badge>
                        ) : null}
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
                        <MonthPicker monthYear={analyticsDate} onSelectMonthYear={setAnalyticsDate} className="flex items-center justify-between gap-2 h-8 px-3 text-[10px] font-bold uppercase tracking-widest bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full cursor-pointer hover:bg-slate-50 transition-colors focus:outline-none focus:ring-1 focus:ring-[#7B0099]" />
                      </div>
                    </div>

                    {loadingAnalytics ? (
                      <div className="flex flex-col items-center justify-center py-20 text-foreground bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800/60 dark:border-slate-700 shadow-sm">
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
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-foreground dark:text-foreground">Monthly Rate</p>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className="w-3 h-3 rounded-full bg-slate-100 dark:bg-slate-800 text-foreground flex items-center justify-center text-[8px] font-bold cursor-help hover:bg-slate-200 transition-colors">?</div>
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
                                  <span className="text-sm font-bold text-foreground">%</span>
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
                                    <p className="text-[8px] font-bold text-foreground dark:text-foreground uppercase tracking-wider">Absent</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Yearly Rate Card */}
                            <Card className="shadow-sm border-slate-200 dark:border-slate-800/60 hover:shadow-md transition-shadow duration-200">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-foreground dark:text-foreground">Yearly Rate</p>
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
                                  <span className="text-sm font-bold text-foreground">%</span>
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
                                    <p className="text-[8px] font-bold text-foreground dark:text-foreground uppercase tracking-wider">Absent</p>
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
                              <p className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1.5">Total Entitled</p>
                              <p className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tighter">{analytics.leave.entitlement}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 p-3 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1.5">Approved Taken</p>
                              <p className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tighter">{analytics.leave.used}</p>
                            </div>
                            <div className="rounded-xl border-2 border-emerald-500/20 p-3 bg-emerald-50/30 shadow-sm flex flex-col justify-between">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mb-1.5">Remaining Balance</p>
                              <p className="text-2xl font-black text-emerald-600 tracking-tighter">{analytics.leave.remaining}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 p-3 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
                              <Tooltip>
                                <TooltipTrigger className="text-left w-full h-full flex flex-col justify-between">
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1.5 flex items-center justify-between w-full">
                                    Utilization
                                    <span className="w-3 h-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[7px] text-foreground">?</span>
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
                                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-foreground group-hover:scale-110 transition-transform">
                                  <X className="w-3 h-3" />
                                </div>
                                <span className="text-lg font-black text-foreground">{analytics.leave.rejected}</span>
                              </div>
                              <span className="text-[9px] font-bold text-foreground uppercase tracking-widest">Rejected Requests</span>
                            </button>
                          </div>

                          {/* 3 Leave Type Breakdown Cards (Replacement, Unpaid, Medical) */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                            {/* REPLACEMENT LEAVE */}
                            <div className="border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1">Replacement Leave</p>
                              <div className="my-1.5">
                                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                  {analytics.leave?.replacement?.taken || 0}
                                </span>
                                <span className="text-xs font-semibold text-foreground ml-1.5">Days Taken</span>
                              </div>
                              <div className="mt-1">
                                <div className="flex justify-between items-center text-[9px] font-bold text-foreground mb-1">
                                  <span className="uppercase tracking-wider">Progress</span>
                                  <span>{analytics.leave?.replacement?.taken || 0} / {analytics.leave?.replacement?.entitlement || 0}</span>
                                </div>
                                <Progress 
                                  value={
                                    (analytics.leave?.replacement?.entitlement || 0) > 0 
                                      ? Math.min(100, Math.round(((analytics.leave?.replacement?.taken || 0) / analytics.leave.replacement.entitlement) * 100)) 
                                      : (analytics.leave?.replacement?.taken || 0) > 0 ? 100 : 0
                                  } 
                                  className="h-1.5" 
                                />
                              </div>
                            </div>

                            {/* UNPAID LEAVE */}
                            <div className="border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1">Unpaid Leave</p>
                              <div className="my-1.5">
                                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                  {analytics.leave?.unpaid?.taken || 0}
                                </span>
                                <span className="text-xs font-semibold text-foreground ml-1.5">
                                  {(analytics.leave?.unpaid?.taken || 0) === 0 ? "Application" : "Days Taken"}
                                </span>
                              </div>
                              <div className="mt-1">
                                <div className="flex justify-between items-center text-[9px] font-bold text-foreground mb-1">
                                  <span className="uppercase tracking-wider">Usage</span>
                                  <span>{(analytics.leave?.unpaid?.taken || 0) === 0 ? "0 Application" : `${analytics.leave?.unpaid?.taken} Days`}</span>
                                </div>
                                <Progress 
                                  value={(analytics.leave?.unpaid?.taken || 0) > 0 ? 100 : 0} 
                                  className="h-1.5" 
                                />
                              </div>
                            </div>

                            {/* MEDICAL LEAVE (SICK LEAVE) */}
                            <div className="border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1">Medical Leave (Sick Leave)</p>
                              <div className="my-1.5">
                                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                  {analytics.leave?.sick?.taken || 0}
                                </span>
                                <span className="text-xs font-semibold text-foreground ml-1.5">Days Taken</span>
                              </div>
                              <div className="mt-1">
                                <div className="flex justify-between items-center text-[9px] font-bold text-foreground mb-1">
                                  <span className="uppercase tracking-wider">Progress</span>
                                  <span>{analytics.leave?.sick?.taken || 0} / {analytics.leave?.sick?.entitlement || 14}</span>
                                </div>
                                <Progress 
                                  value={Math.min(100, Math.round(((analytics.leave?.sick?.taken || 0) / (analytics.leave?.sick?.entitlement || 14)) * 100))} 
                                  className="h-1.5" 
                                />
                              </div>
                            </div>
                          </div>
                        </section>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-32 text-foreground bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800/60 dark:border-slate-700 shadow-sm">
                        <Users className="w-12 h-12 opacity-20 mb-4" />
                        <p className="text-sm font-bold">Analytics unavailable.</p>
                      </div>
                    )}
                  </div>
                </div>
              </TooltipProvider>
            </TabsContent>

                <TabsContent value="attendance_settings" className="mt-0">
                  {loadingSettings ? (
                    <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-4">
                        <Card>
                          <CardContent className="p-4 space-y-4">
                            <h3 className="font-bold text-lg border-b pb-2">Primary Branch</h3>
                            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-sm font-semibold">
                              {selectedEmployee.branch} - {BRANCH_NAMES[selectedEmployee.branch as keyof typeof BRANCH_NAMES] || "Unknown"}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4 space-y-4">
                            <h3 className="font-bold text-lg border-b pb-2">Temporary Assignment</h3>
                            
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs font-bold text-foreground uppercase">Working Branch</Label>
                                <Select value={tempAssignment.location} onValueChange={(val) => setTempAssignment({...tempAssignment, location: val})()}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Branch" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(BRANCH_NAMES).map(([code, name]) => (
                                      <SelectItem key={code} value={code}>{code} - {name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs font-bold text-foreground uppercase">Start Date</Label>
                                  <Input type="date" value={tempAssignment.start_date} onChange={(e) => setTempAssignment({...tempAssignment, start_date: e.target.value})()} />
                                </div>
                                <div>
                                  <Label className="text-xs font-bold text-foreground uppercase">End Date</Label>
                                  <Input type="date" value={tempAssignment.end_date} onChange={(e) => setTempAssignment({...tempAssignment, end_date: e.target.value})()} />
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-xs font-bold text-foreground uppercase">Status</Label>
                                <Select value={tempAssignment.status} onValueChange={(val) => setTempAssignment({...tempAssignment, status: val})()}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <Button className="w-full mt-2 bg-[#a01497] hover:bg-[#850f7c] text-white" onClick={saveTempAssignment}>Save Temporary Assignment</Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-4">
                        {role === "hr_admin" ? (
                          <Card>
                            <CardContent className="p-4 space-y-4">
                              <div className="flex justify-between items-center border-b pb-2">
                                <h3 className="font-bold text-lg">Manage Allowed Branches</h3>
                              </div>
                              <div className="text-xs text-foreground mb-2">Select the branches this employee is permitted to clock into.</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                                {Object.entries(BRANCH_NAMES).map(([code, name]) => (
                                  <div key={code} className="flex items-center space-x-2 border p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <Checkbox 
                                      id={`branch-${code}`} 
                                      checked={allowedLocations.includes(code)}
                                      onCheckedChange={(checked) => {
                                        if (checked) setAllowedLocations([...allowedLocations, code]);
                                        else setAllowedLocations(allowedLocations.filter(c => c !== code));
                                      }}
                                    />
                                    <Label htmlFor={`branch-${code}`} className="text-sm cursor-pointer flex-1">
                                      {code} - {name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                              <Button className="w-full mt-4 bg-[#a01497] hover:bg-[#850f7c] text-white" onClick={saveAllowedLocations}>Save Allowed Branches</Button>
                            </CardContent>
                          </Card>
                        ) : null}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="temporary_assignment" className="mt-0">
                  {loadingSettings ? (
                    <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : (
                    <div className="max-w-3xl mx-auto space-y-6">
                      <Card>
                        <CardContent className="p-4 space-y-4">
                          <h3 className="font-bold text-lg border-b pb-2">Assignment History</h3>
                          {tempAssignmentsHistory.length === 0 ? (
                            <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg border-dashed">
                              No temporary assignments found for this employee.
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                  <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Branch</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Assignment</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Start Date</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">End Date</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                  {tempAssignmentsHistory.map((ta, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{ta.location}</td>
                                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{BRANCH_NAMES[ta.location as keyof typeof BRANCH_NAMES] || ta.location}</td>
                                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{ta.start_date ? new Date(ta.start_date).toLocaleDateString('en-GB') : '-'}</td>
                                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{ta.end_date ? new Date(ta.end_date).toLocaleDateString('en-GB') : '-'}</td>
                                      <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${ta.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                                          {ta.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="multi_location" className="mt-0">
                  {loadingSettings ? (
                    <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : (
                    <div className="max-w-3xl mx-auto space-y-6">
                      <Card>
                        <CardContent className="p-4 space-y-4">
                          <h3 className="font-bold text-lg border-b pb-2 mb-4">Allowed Branches</h3>
                          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Type</th>
                                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Branch</th>
                                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Code</th>
                                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap uppercase">Permanent Branch</td>
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{selectedEmployee?.branch ? (BRANCH_NAMES[selectedEmployee.branch as keyof typeof BRANCH_NAMES] || selectedEmployee.branch) : '-'}</td>
                                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{selectedEmployee?.branch || '-'}</td>
                                  <td className="px-4 py-3">
                                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                      Permanent
                                    </span>
                                  </td>
                                </tr>
                                {allowedLocations.filter(c => c !== selectedEmployee?.branch).map((loc, idx) => (
                                  <tr key={loc} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap uppercase">Branch {idx + 2}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{BRANCH_NAMES[loc as keyof typeof BRANCH_NAMES] || loc}</td>
                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{loc}</td>
                                    <td className="px-4 py-3">
                                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                                        Active
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="location_history">
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800/60">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Location History (Last 14 Days)</h3>
                      <span className="text-xs text-muted-foreground">{locationHistory.length} records</span>
                    </div>
                    {loadingSettings ? (
                      <div className="flex items-center justify-center min-h-[200px]">
                        <p className="text-sm text-muted-foreground">Loading location history...</p>
                      </div>
                    ) : locationHistory.length === 0 ? (
                      <div className="flex items-center justify-center min-h-[200px]">
                        <p className="text-sm text-muted-foreground">No location history available for this employee.</p>
                      </div>
                    ) : (
                      <div className="relative"><div className="overflow-x-auto max-h-[400px] overflow-y-auto" id="staff-location-scroll">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
                            <tr>
                              <th className="text-left font-black text-foreground uppercase tracking-widest px-2 py-2">Timestamp</th>
                              <th className="text-left font-black text-foreground uppercase tracking-widest px-2 py-2">Coordinates</th>
                              <th className="text-left font-black text-foreground uppercase tracking-widest px-2 py-2">Distance from Branch</th>
                              <th className="text-left font-black text-foreground uppercase tracking-widest px-2 py-2">Location Status</th>
                              <th className="text-left font-black text-foreground uppercase tracking-widest px-2 py-2">Attendance Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const totalHistoryPages = Math.ceil(locationHistory.length / historyItemsPerPage);
                              const startIndex = (historyPage - 1) * historyItemsPerPage;
                              const paginatedHistory = locationHistory.slice(startIndex, startIndex + historyItemsPerPage);
                              return paginatedHistory.map((h: any, idx: number) => {
                              const ts = h.timestamp ? new Date(h.timestamp) : null;
                              const dateStr = ts ? ts.toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                              const timeStr = ts ? ts.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '-';
                              const pLat = Number(h.lat);
                              const pLng = Number(h.lng);
                              const isNoGPS = (!pLat && !pLng) || (pLat === 0 && pLng === 0);

                              // Attendance status badge colors
                              const statusColors: Record<string, string> = {
                                'Clock In': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
                                'Clock Out': 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
                                'Replacement Leave': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
                                'Outstation': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
                              };
                              const statusDotColors: Record<string, string> = {
                                'Clock In': 'bg-blue-500',
                                'Clock Out': 'bg-indigo-500',
                                'Replacement Leave': 'bg-amber-500',
                                'Outstation': 'bg-purple-500',
                              };
                              const attStatus = h.attendance_status || null;
                              const attClass = attStatus ? (statusColors[attStatus] || 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/30') : '';
                              const attDot = attStatus ? (statusDotColors[attStatus] || 'bg-teal-500') : '';

                              return (
                                <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/30">
                                  <td className="px-2 py-2 whitespace-nowrap">
                                    <div className="font-bold text-foreground">{dateStr}</div>
                                    <div className="text-muted-foreground">{timeStr}</div>
                                  </td>
                                  <td className="px-2 py-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                                    {isNoGPS ? 'N/A' : `${pLat.toFixed(7)}, ${pLng.toFixed(7)}`}
                                  </td>
                                  <td className="px-2 py-2 whitespace-nowrap font-bold text-foreground">
                                    {isNoGPS || h.distance == null ? '-' : `${h.distance} m`}
                                  </td>
                                  <td className="px-2 py-2">
                                    {isNoGPS ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-widest bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                        No GPS
                                      </span>
                                    ) : h.location_status === 'OFF-SITE' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-widest bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                        Off-Site {h.is_update ? "- UPDATED" : ""}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-widest bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        On-Site {h.is_update ? "- UPDATED" : ""}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2 py-2">
                                    {attStatus ? (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${attClass}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${attDot}`} />
                                        {attStatus}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                              })
                            })()}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </TabsContent>

</Tabs>
            ) : (
              <div className="py-20 text-center text-foreground dark:text-foreground">
                <p>Loading profile details...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
                        })()}
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
                      HR Approval Registry • ID: {req.leave_id}
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
              <Input id="signup-name" type="text" placeholder="e.g. AHMAD ALBAB" value={signupName} onChange={(e) => setSignupName(e.target.value.toUpperCase())} required />
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
                    })()}
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
    </>
  );
}



