import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  Clock,
  Loader2,
  MapPin,
  TrendingUp,
  Users,
  FileText,
  PhoneCall,
  X,
  Trash2,
  LayoutGrid,
  List,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { toast } from "sonner";
import { getCleanReason } from "@/lib/leaveStorage";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const branches = [
  {
    code: "HQ",
    name: "Rayhar HQ",
    location: "Kemaman,Terengganu",
    leader: "Maria Santos",
  },
  {
    code: "KMM",
    name: "Kemaman",
    location: "Kemaman,Terengganu",
    leader: "Maria Santos",
  },
  {
    code: "CNH",
    name: "Cheneh",
    location: "Kemaman,Terengganu",
    leader: "Roberto Lim",
  },
  {
    code: "KBG",
    name: "Kuala Berang",
    location: "Hulu Terengganu,Terengganu",
    leader: "David Chen",
  },
  {
    code: "TGG",
    name: "Kuala Terengganu",
    location: "Kuala Terengganu,Terengganu",
    leader: "David Chen",
  },
  {
    code: "DGN",
    name: "Dungun",
    location: "Dungun,Terengganu",
    leader: "Roberto Lim",
  },
  {
    code: "JTH",
    name: "Jertih",
    location: "Besut,Terengganu",
    leader: "Roberto Lim",
  },
  {
    code: "KBR",
    name: "Kota Bharu",
    location: "Kota Bharu,Kelantan",
    leader: "Roberto Lim",
  },
  {
    code: "RMP",
    name: "Rompin",
    location: "Rompin,Pahang",
    leader: "Roberto Lim",
  },
  {
    code: "MZM",
    name: "Muadzam Shah",
    location: "Muadzam Shah,Pahang",
    leader: "Roberto Lim",
  },
  {
    code: "SHA",
    name: "Shah Alam",
    location: "Shah Alam,Selangor",
    leader: "Roberto Lim",
  },
  {
    code: "BBB",
    name: "Bandar Baru Bangi",
    location: "Bandar Baru Bangi,Selangor",
    leader: "Roberto Lim",
  },
  {
    code: "KUL",
    name: "Kuala Lumpur",
    location: "Kuala Lumpur,Wilayah Persekutuan",
    leader: "Roberto Lim",
  },
  { code: "IPH", name: "Ipoh", location: "Ipoh,Perak", leader: "Roberto Lim" },
  {
    code: "MJG",
    name: "Manjung",
    location: "Manjung,Perak",
    leader: "Roberto Lim",
  },
  {
    code: "KKS",
    name: "Kuala Kangsar",
    location: "Kuala Kangsar,Perak",
    leader: "Roberto Lim",
  },
  {
    code: "MLK",
    name: "Melaka",
    location: "Melaka,Melaka",
    leader: "Roberto Lim",
  },
  {
    code: "AOR",
    name: "Alor Setar",
    location: "Alor Setar,Kedah",
    leader: "Roberto Lim",
  },
  {
    code: "BTM",
    name: "Bertam",
    location: "Bertam,Pulau Pinang",
    leader: "Roberto Lim",
  },
  {
    code: "SNS",
    name: "Seremban",
    location: "Seremban,Negeri Sembilan",
    leader: "Roberto Lim",
  },
  {
    code: "BTP",
    name: "Batu Pahat",
    location: "Batu Pahat,Johor",
    leader: "Roberto Lim",
  },
  {
    code: "JB",
    name: "Johor Bharu",
    location: "Johor Bharu,Johor",
    leader: "Roberto Lim",
  },
  {
    code: "TWU",
    name: "Tawau",
    location: "Tawau,Sabah",
    leader: "Roberto Lim",
  },
];

type BranchEmployee = {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  today_status: string;
  annual_leave_balance: number;
  pending_leaves: number;
  approved_leaves: number;
  rejected_leaves: number;
  total_leave_requests: number;
  mc_leaves: number;
  days_present: number;
  attendance_rate: number | null;
};

export default function Branches() {
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [employees, setEmployees] = useState<BranchEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewLeaveStatus, setViewLeaveStatus] = useState<
    "Approved" | "Pending" | "Rejected" | null
  >(null);
  const [employeeLeaves, setEmployeeLeaves] = useState<any[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [branchStats, setBranchStats] = useState<any[]>([]);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "line">(() => {
    return (
      (localStorage.getItem("branchesViewMode") as "grid" | "line") || "grid"
    );
  });
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBranches = useMemo(() => {
    return allBranches.filter(
      (b) =>
        b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.location?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [allBranches, searchQuery]);

  useEffect(() => {
    localStorage.setItem("branchesViewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/branches`);
        const data = await response.json();
        if (data.success) {
          setAllBranches(data.branches);
        }
      } catch (err) {
        console.error("Error fetching branches", err);
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
  }, []);

  const fetchBranchesList = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/branches`);
      const data = await response.json();
      if (data.success) setAllBranches(data.branches);
    } catch (err) {}
  };

  useEffect(() => {
    if (allBranches.length > 0) {
      const fetchBranchStats = async () => {
        try {
          const params = new URLSearchParams({
            startDate: new Date().toISOString().split("T")[0],
            endDate: new Date().toISOString().split("T")[0],
          });
          const response = await fetch(
            `${API_BASE_URL}/api/analytics/branch-stats?${params}`,
          );
          const data = await response.json();
          if (data.success) setBranchStats(data.data);
        } catch (err) {
          console.error("Error fetching branch stats", err);
        }
      };
      fetchBranchStats();
    }
  }, [allBranches]);

  useEffect(() => {
    if (selectedBranch && selectedBranch.code) {
      const fetchEmployees = async () => {
        setLoading(true);
        try {
          const params = new URLSearchParams({ branch: selectedBranch.code });
          const response = await fetch(
            `${API_BASE_URL}/api/branch-employees?${params}`,
          );
          const data = await response.json();
          if (data.success) {
            setEmployees(data.employees || []);
          }
        } catch (err) {
          toast.error("Failed to fetch branch employees");
        } finally {
          setLoading(false);
        }
      };
      fetchEmployees();
    }
  }, [selectedBranch]);

  const handleDeleteBranch = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    if (code === "HQ") {
      toast.error("Cannot delete default Rayhar HQ branch");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete branch ${code}?`))
      return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/branches/${encodeURIComponent(code)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.success) {
        toast.success("Branch deleted successfully");
        fetchBranchesList();
      } else {
        toast.error(data.error || "Failed to delete branch");
      }
    } catch (err) {
      toast.error("Server error");
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/branches-stats`);
        const data = await response.json();
        if (data.success) {
          setBranchStats(data.stats);
        }
      } catch (err) {
        console.error("Error fetching branch stats", err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchLeaves = async () => {
      if (!viewLeaveStatus || !selectedEmployeeId) {
        setEmployeeLeaves([]);
        return;
      }
      setLoadingLeaves(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/leave-requests?userId=${selectedEmployeeId}`,
        );
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
  }, [viewLeaveStatus, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedBranch) return;
    const fetchBranchEmployees = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/branch-employees?branch=${selectedBranch.code}`,
        );
        const data = await response.json();
        if (data.success) {
          setEmployees(data.employees);
          if (data.employees.length > 0) {
            setSelectedEmployeeId(data.employees[0].user_id);
          } else {
            setSelectedEmployeeId("");
          }
        }
      } catch (error) {
        console.error("Branch employee fetch error:", error);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchBranchEmployees();
  }, [selectedBranch]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.user_id === selectedEmployeeId),
    [employees, selectedEmployeeId],
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      {selectedBranch ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
            <div className="min-w-0 flex-1">
              <Button
                type="button"
                variant="ghost"
                className="mb-1 gap-2 px-0 text-muted-foreground hover:bg-transparent hover:text-[#7B0099] transition-colors touch-target"
                onClick={() => setSelectedBranch(null)}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Back to branches
                </span>
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-responsive-xl font-black text-foreground tracking-tight truncate">
                  {selectedBranch.name}
                </h1>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] sm:text-xs bg-muted/30 border-border/60 px-3 py-1"
                >
                  {selectedBranch.code}
                </Badge>
              </div>
              <p className="text-responsive-sm text-muted-foreground font-medium mt-1">
                Branch staff overview and analytics
              </p>
            </div>
            
            {selectedBranch.operating_zone && (
              <div className="flex-shrink-0 bg-white dark:bg-card border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-md self-start">
                <p className="mb-2"><span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Operating Hours ({selectedBranch.operating_zone === 'ZONE_A' ? 'Zone A' : 'Zone B'})</span></p>
                <div className="flex flex-wrap sm:flex-nowrap gap-4 sm:gap-6 text-[11px] text-muted-foreground">
                  {selectedBranch.operating_zone === 'ZONE_A' ? (
                    <>
                      <div className="space-y-1 border-l-2 border-[#7B0099] pl-2.5">
                        <p className="flex items-center gap-2"><Clock className="w-3 h-3 text-[#7B0099]" /> 8:30 AM – 5:30 PM (Saturday – Wednesday)</p>
                        <p className="flex items-center gap-2"><Clock className="w-3 h-3 text-[#7B0099]" /> 8:30 AM – 1:00 PM (Thursday)</p>
                        <p className="flex items-center gap-2"><Clock className="w-3 h-3 text-[#7B0099]" /> 8:30 AM – 5:30 PM (First Thursday of the Month)</p>
                      </div>
                      <div className="space-y-1 border-l-2 border-rose-500 pl-2.5">
                        <p className="flex items-center gap-2 text-rose-500/90"><X className="w-3 h-3" /> Closed (Friday)</p>
                        <p className="flex items-center gap-2 text-rose-500/90"><X className="w-3 h-3" /> Closed (First Saturday of the Month)</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1 border-l-2 border-[#7B0099] pl-2.5">
                        <p className="flex items-center gap-2"><Clock className="w-3 h-3 text-[#7B0099]" /> 8:30 AM – 5:30 PM (Monday – Friday)</p>
                        <p className="flex items-center gap-2"><Clock className="w-3 h-3 text-[#7B0099]" /> 8:30 AM – 1:00 PM (Saturday)</p>
                      </div>
                      <div className="space-y-1 border-l-2 border-rose-500 pl-2.5">
                        <p className="flex items-center gap-2 text-rose-500/90"><X className="w-3 h-3" /> Closed (Sunday)</p>
                        <p className="flex items-center gap-2 text-rose-500/90"><X className="w-3 h-3" /> Closed (First Saturday of the Month)</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 bg-card/60 backdrop-blur-md rounded-[32px] border border-border/50">
              <Loader2 className="h-10 w-10 animate-spin text-[#7B0099]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">
                Syncing Branch Data...
              </p>
            </div>
          ) : (
            <Card className="border-none shadow-sm overflow-hidden bg-card/60 backdrop-blur-md rounded-[24px]">
              <CardContent className="p-0">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 text-foreground border-b border-border">
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em]">
                          Personnel
                        </th>
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em]">
                          Leave Balance
                        </th>
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em]">
                          Attendance
                        </th>
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em]">
                          Today
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {employees.length > 0 ? (
                        employees.map((employee) => (
                          <tr
                            key={employee.user_id}
                            className={`cursor-pointer transition-colors group hover:bg-[#7B0099]/5 ${
                              selectedEmployee?.user_id === employee.user_id
                                ? "bg-[#7B0099]/10"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedEmployeeId(employee.user_id);
                              setIsStatsOpen(true);
                            }}
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#7B0099]/10 flex items-center justify-center text-[11px] font-black text-[#7B0099] group-hover:scale-110 transition-transform">
                                  {employee.full_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-foreground group-hover:text-[#7B0099] transition-colors">
                                    {employee.full_name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate font-medium uppercase tracking-widest">
                                    {employee.user_id}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-bold text-foreground text-xs uppercase">
                              {employee.annual_leave_balance} DAYS
                            </td>
                            <td className="py-4 px-6 font-bold text-muted-foreground text-xs">
                              {employee.attendance_rate || 0}%
                            </td>
                            <td className="py-4 px-6">
                              <Badge
                                className={`text-[9px] font-black px-2.5 h-5 ${
                                  employee.today_status === "Present (On Time)" || employee.today_status === "Present"
                                    ? "bg-emerald-500 text-white"
                                    : employee.today_status === "Present (Late)"
                                      ? "bg-amber-500 text-white"
                                      : employee.today_status === "Outstation"
                                        ? "bg-pink-500 text-white"
                                        : employee.today_status === "On Leave"
                                          ? "bg-blue-500 text-white"
                                          : employee.today_status === "Company Leave"
                                            ? "bg-purple-500 text-white"
                                            : "bg-rose-500 text-white"
                                }`}
                              >
                                {employee.today_status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-12 text-center text-muted-foreground italic font-medium"
                          >
                            No personnel found in this branch.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-border/50">
                  {employees.length > 0 ? (
                    employees.map((employee) => (
                      <div
                        key={employee.user_id}
                        className="p-4 active:bg-[#7B0099]/5 transition-colors flex items-center gap-4 cursor-pointer"
                        onClick={() => {
                          setSelectedEmployeeId(employee.user_id);
                          setIsStatsOpen(true);
                        }}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-[#7B0099]/10 flex items-center justify-center text-sm font-black text-[#7B0099] shrink-0">
                          {employee.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-black text-sm text-foreground truncate">
                              {employee.full_name}
                            </p>
                            <Badge
                              className={`text-[9px] font-black h-5 shrink-0 ${
                                employee.today_status === "Present (On Time)" || employee.today_status === "Present"
                                  ? "bg-emerald-500 text-white"
                                  : employee.today_status === "Present (Late)"
                                    ? "bg-amber-500 text-white"
                                    : employee.today_status === "Outstation"
                                      ? "bg-pink-500 text-white"
                                      : employee.today_status === "On Leave"
                                        ? "bg-blue-500 text-white"
                                        : employee.today_status === "Company Leave"
                                          ? "bg-purple-500 text-white"
                                          : "bg-rose-500 text-white"
                              }`}
                            >
                              {employee.today_status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <span>ID: {employee.user_id}</span>
                            <span className="opacity-30">•</span>
                            <span>Rate: {employee.attendance_rate || 0}%</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-muted-foreground italic font-medium p-6">
                      No personnel found.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Dialog open={isStatsOpen} onOpenChange={setIsStatsOpen}>
            <DialogContent className="max-w-2xl w-full overflow-y-auto max-h-[90vh]">
              <DialogHeader className="pb-4 border-b border-border/50">
                <DialogTitle className="text-xl font-black text-foreground">
                  Staff Profile
                </DialogTitle>
                <DialogDescription className="sr-only">
                  View and analyze staff attendance and leave metrics.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                {selectedEmployee ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column: Bio */}
                      <div className="bg-card p-6 rounded-[24px] border border-border/50 flex flex-col items-center text-center shadow-sm">
                        <div className="w-24 h-24 rounded-2xl bg-[#7B0099] flex items-center justify-center text-white text-4xl font-black shadow-xl mb-4">
                          {selectedEmployee.full_name.charAt(0)}
                        </div>
                        <h2 className="text-xl font-black text-foreground leading-tight">
                          {selectedEmployee.full_name}
                        </h2>
                        <p className="text-sm font-bold text-[#7B0099] mt-1">
                          {selectedEmployee.email}
                        </p>
                        <Badge
                          variant="secondary"
                          className="mt-4 text-[10px] uppercase font-black px-3 py-1 bg-[#7B0099]/10 text-[#7B0099] border-none"
                        >
                          {selectedEmployee.role.replace(/_/g, " ")}
                        </Badge>

                        <div className="mt-6 pt-6 border-t border-border/50 w-full space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-muted-foreground uppercase tracking-widest">
                              User ID
                            </span>
                            <span className="font-black text-foreground">
                              {selectedEmployee.user_id}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-muted-foreground uppercase tracking-widest">
                              Branch
                            </span>
                            <span className="font-black text-foreground">
                              {selectedBranch?.name || "BRANCH"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-muted-foreground uppercase tracking-widest">
                              Department
                            </span>
                            <span className="font-black text-foreground">
                              Haji Umrah (BHU)
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-muted-foreground uppercase tracking-widest">
                              Status
                            </span>
                            <Badge
                              className={`text-white font-black text-[9px] h-5 ${selectedEmployee.status === "Active" ? "bg-emerald-500" : "bg-rose-500"}`}
                            >
                              {selectedEmployee.status || "Active"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Stats */}
                      <div className="space-y-4">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
                          Performance & Leave
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-[16px] border border-border/50 p-4 bg-card/50 hover:border-[#7B0099]/30 transition-colors group">
                            <CalendarCheck className="mb-2 h-4 w-4 text-[#7B0099] group-hover:scale-110 transition-transform" />
                            <p className="text-2xl font-black text-foreground">
                              {selectedEmployee.annual_leave_balance}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                              Annual Left
                            </p>
                          </div>
                          <div className="rounded-[16px] border border-border/50 p-4 bg-card/50 hover:border-emerald-500/30 transition-colors group">
                            <TrendingUp className="mb-2 h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                            <p className="text-2xl font-black text-foreground">
                              {selectedEmployee.attendance_rate || 0}%
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                              Attendance
                            </p>
                          </div>
                          <div className="rounded-[16px] border border-border/50 p-4 bg-card/50 hover:border-amber-500/30 transition-colors group">
                            <Clock className="mb-2 h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
                            <p className="text-2xl font-black text-foreground">
                              {selectedEmployee.pending_leaves}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                              Pending
                            </p>
                          </div>
                          <div className="rounded-[16px] border border-border/50 p-4 bg-card/50 hover:border-purple-500/30 transition-colors group">
                            <FileText className="mb-2 h-4 w-4 text-purple-500 group-hover:scale-110 transition-transform" />
                            <p className="text-2xl font-black text-foreground">
                              {selectedEmployee.mc_leaves || 0}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                              Total MC
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 mt-4">
                          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
                            Quick Links
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              className="flex items-center justify-between w-full rounded-[14px] bg-emerald-500/10 px-4 py-3 hover:bg-emerald-500/20 transition-all border border-emerald-500/20 group touch-target"
                              onClick={() => setViewLeaveStatus("Approved")}
                            >
                              <span className="text-xs font-black text-emerald-700">
                                Approved Leaves
                              </span>
                              <Badge className="bg-emerald-500 text-white font-black h-5 text-[10px] group-hover:scale-110 transition-transform">
                                {selectedEmployee.approved_leaves}
                              </Badge>
                            </button>
                            <button
                              className="flex items-center justify-between w-full rounded-[14px] bg-amber-500/10 px-4 py-3 hover:bg-amber-500/20 transition-all border border-amber-500/20 group touch-target"
                              onClick={() => setViewLeaveStatus("Pending")}
                            >
                              <span className="text-xs font-black text-amber-700">
                                Pending Approvals
                              </span>
                              <Badge className="bg-amber-500 text-white font-black h-5 text-[10px] group-hover:scale-110 transition-transform">
                                {selectedEmployee.pending_leaves}
                              </Badge>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-40">
                    <Users className="w-16 h-16 mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">
                      Select staff to view
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-responsive-2xl font-black text-foreground tracking-tight">
                  Branches Overview
                </h1>
                {!loadingBranches && (
                  <Badge
                    variant="outline"
                    className="px-3 py-1 text-xs font-bold bg-muted/30 border-border/60 flex items-center justify-center rounded-md h-fit"
                  >
                    Total{" "}
                    <span className="ml-2 flex items-center justify-center bg-[#7B0099] text-white rounded-md h-5 min-w-[20px] px-1.5 text-[10px] leading-none shrink-0">
                      {allBranches.length}
                    </span>
                  </Badge>
                )}
              </div>
              <p className="text-responsive-sm text-muted-foreground font-medium mt-1">
                Real-time status across all locations
              </p>
            </div>

            {!loadingBranches && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 self-start sm:self-auto w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search branches..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 rounded-xl border-border/60 bg-muted/30 focus-visible:ring-[#7B0099]/30 text-xs font-medium"
                  />
                </div>
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 shrink-0 w-full sm:w-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={`rounded-lg px-3 py-1.5 h-8 gap-1.5 text-xs font-black uppercase tracking-wider transition-all duration-200 touch-target ${
                      viewMode === "grid"
                        ? "bg-[#7B0099] text-white hover:bg-[#7B0099]/90 shadow-md"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Grid</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("line")}
                    className={`rounded-lg px-3 py-1.5 h-8 gap-1.5 text-xs font-black uppercase tracking-wider transition-all duration-200 touch-target ${
                      viewMode === "line"
                        ? "bg-[#7B0099] text-white hover:bg-[#7B0099]/90 shadow-md"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Line</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
          {loadingBranches ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 bg-card/60 backdrop-blur-md rounded-[32px] border border-border/50">
              <Loader2 className="h-10 w-10 animate-spin text-[#7B0099]" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">
                Scanning Network...
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredBranches.map((branch) => {
                const stat = branchStats.find((s) => s.branch === branch.code);
                const totalEmployees = stat ? stat.total_employees : 0;
                const presentToday = stat ? stat.present_today : 0;
                const onLeave = stat ? stat.on_leave : 0;
                const outstation = stat ? stat.outstation || 0 : 0;
                const absent = Math.max(
                  0,
                  totalEmployees - presentToday - onLeave - outstation,
                );
                const attendanceRate =
                  totalEmployees > 0
                    ? Math.round((presentToday / totalEmployees) * 100)
                    : 0;
                const staticInfo = branches.find((b) => b.code === branch.code);
                const location =
                  branch.location &&
                  branch.location !== "Rayhar Branch" &&
                  branch.location !== "RAYHAR BRANCH" &&
                  branch.location !== ""
                    ? branch.location
                    : staticInfo?.location || "Rayhar Branch";
                const leader =
                  branch.leader_name || staticInfo?.leader || "Branch Leader";

                return (
                  <Card
                    key={branch.code}
                    className="cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all border-none shadow-sm bg-card/80 backdrop-blur-md overflow-hidden group rounded-[24px]"
                    onClick={() =>
                      setSelectedBranch({
                        ...branch,
                        location,
                        leader,
                        employees: totalEmployees,
                        attendance: attendanceRate,
                        operating_zone: branch.operating_zone || 'ZONE_B'
                      })
                    }
                  >
                    <CardContent className="p-0">
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-[18px] bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-[#7B0099]/10 transition-colors">
                              <Building2 className="w-6 h-6 text-muted-foreground group-hover:text-[#7B0099] transition-colors" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-black text-foreground text-lg leading-tight truncate group-hover:text-[#7B0099] transition-colors">
                                {branch.name}
                              </h3>
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest truncate opacity-60">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {location}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className="font-mono text-[9px] h-5 px-1.5 bg-muted/20 border-border/50"
                            >
                              {branch.code}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground"
                              onClick={(e) =>
                                handleDeleteBranch(e, branch.code)
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-6">
                          <div className="bg-emerald-500/10 rounded-[16px] p-3 border border-emerald-500/20 text-center">
                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                              {presentToday}
                            </p>
                            <p className="text-[9px] font-black text-emerald-600/70 dark:text-emerald-400/70 uppercase mt-1">
                              Present
                            </p>
                          </div>
                          <div className="bg-amber-500/10 rounded-[16px] p-3 border border-amber-500/20 text-center">
                            <p className="text-xl font-black text-amber-600 dark:text-amber-400 leading-none">
                              {onLeave}
                            </p>
                            <p className="text-[9px] font-black text-amber-600/70 dark:text-amber-400/70 uppercase mt-1">
                              Leave
                            </p>
                          </div>
                          <div className="bg-blue-500/10 rounded-[16px] p-3 border border-blue-500/20 text-center">
                            <p className="text-xl font-black text-blue-600 dark:text-blue-400 leading-none">
                              {outstation}
                            </p>
                            <p className="text-[9px] font-black text-blue-600/70 dark:text-blue-400/70 uppercase mt-1">
                              Outstation
                            </p>
                          </div>
                          <div className="bg-rose-500/10 rounded-[16px] p-3 border border-rose-500/20 text-center">
                            <p className="text-xl font-black text-rose-600 dark:text-rose-400 leading-none">
                              {absent}
                            </p>
                            <p className="text-[9px] font-black text-rose-600/70 dark:text-rose-400/70 uppercase mt-1">
                              Absent
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="px-6 py-4 bg-muted/30 flex items-center justify-between border-t border-border/50">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-950 dark:text-slate-50" />
                            <span className="text-[11px] font-black text-foreground/70">
                              {totalEmployees}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp
                              className={`w-3.5 h-3.5 ${attendanceRate > 80 ? "text-emerald-500" : "text-amber-500"}`}
                            />
                            <span className="text-[11px] font-black text-foreground/70">
                              {attendanceRate}%
                            </span>
                          </div>
                        </div>
                        <div className="text-right min-w-0 ml-4">
                          <p className="text-[9px] font-black text-muted-foreground uppercase leading-none opacity-40">
                            Leader
                          </p>
                          <p className="text-[10px] font-black text-foreground/80 mt-0.5 truncate">
                            {leader}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-border shadow-sm overflow-hidden bg-card/60 backdrop-blur-md">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="py-4 pl-6">Branch Name</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Leave</TableHead>
                        <TableHead className="text-center">Outstation</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Staff</TableHead>
                        <TableHead className="text-center">
                          Attendance
                        </TableHead>
                        <TableHead>Leader</TableHead>
                        <TableHead className="text-right pr-6">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBranches.map((branch) => {
                        const stat = branchStats.find(
                          (s) => s.branch === branch.code,
                        );
                        const totalEmployees = stat ? stat.total_employees : 0;
                        const presentToday = stat ? stat.present_today : 0;
                        const onLeave = stat ? stat.on_leave : 0;
                        const outstation = stat ? stat.outstation || 0 : 0;
                        const absent = Math.max(
                          0,
                          totalEmployees - presentToday - onLeave - outstation,
                        );
                        const attendanceRate =
                          totalEmployees > 0
                            ? Math.round((presentToday / totalEmployees) * 100)
                            : 0;
                        const staticInfo = branches.find(
                          (b) => b.code === branch.code,
                        );
                        const location =
                          branch.location &&
                          branch.location !== "Rayhar Branch" &&
                          branch.location !== "RAYHAR BRANCH" &&
                          branch.location !== ""
                            ? branch.location
                            : staticInfo?.location || "Rayhar Branch";
                        const leader =
                          branch.leader_name ||
                          staticInfo?.leader ||
                          "Branch Leader";

                        return (
                          <TableRow
                            key={branch.code}
                            className="cursor-pointer hover:bg-muted/50 transition-colors group"
                            onClick={() =>
                              setSelectedBranch({
                                ...branch,
                                location,
                                leader,
                                employees: totalEmployees,
                                attendance: attendanceRate,
                              })
                            }
                          >
                            <TableCell className="py-4 pl-6 font-medium">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground flex items-center gap-2">
                                    {branch.name}
                                    <Badge
                                      variant="outline"
                                      className="font-mono text-[9px] h-4 px-1.5 bg-muted/20 border-border/50"
                                    >
                                      {branch.code}
                                    </Badge>
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">
                                    {location}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {presentToday > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20"
                                >
                                  {presentToday}
                                </Badge>
                              ) : (
                                <span className="text-sm font-medium text-muted-foreground">
                                  0
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {onLeave > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-500/5 text-amber-600 border-amber-500/20"
                                >
                                  {onLeave}
                                </Badge>
                              ) : (
                                <span className="text-sm font-medium text-muted-foreground">
                                  0
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {outstation > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-500/5 text-blue-600 border-blue-500/20"
                                >
                                  {outstation}
                                </Badge>
                              ) : (
                                <span className="text-sm font-medium text-muted-foreground">
                                  0
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {absent > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="bg-rose-500/5 text-rose-600 border-rose-500/20"
                                >
                                  {absent}
                                </Badge>
                              ) : (
                                <span className="text-sm font-medium text-muted-foreground">
                                  0
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {totalEmployees}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              <Badge
                                variant="outline"
                                className="bg-primary/5 text-primary border-primary/20"
                              >
                                {attendanceRate}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm italic text-muted-foreground truncate block max-w-[150px]">
                                {leader}
                              </span>
                            </TableCell>
                            <TableCell
                              className="text-right pr-6"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 shrink-0 hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) =>
                                  handleDeleteBranch(e, branch.code)
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* LEAVE DETAILS DIALOG */}
      <Dialog
        open={!!viewLeaveStatus}
        onOpenChange={(open) => !open && setViewLeaveStatus(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] border-none shadow-2xl rounded-[32px] p-0 overflow-hidden flex flex-col safe-area-bottom">
          <div className="p-6 bg-gradient-to-br from-[#7B0099] to-[#a855f7] text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-xl font-black tracking-tight">
                <FileText className="h-6 w-6" />
                {viewLeaveStatus} Records
              </DialogTitle>
              <DialogDescription className="text-white/80 font-bold">
                Reviewing leave history for {selectedEmployee?.full_name}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6">
            {loadingLeaves ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#7B0099]" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Fetching Forms...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {employeeLeaves.filter((req) => {
                  const status = (req.status || "").toLowerCase().trim();
                  const viewStatus = (viewLeaveStatus || "")
                    .toLowerCase()
                    .trim();
                  if (viewStatus === "pending")
                    return status.includes("pending");
                  return status === viewStatus;
                }).length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center gap-3 opacity-30">
                    <FileText className="w-12 h-12" />
                    <p className="text-sm font-black uppercase tracking-widest">
                      No matching records found
                    </p>
                  </div>
                ) : (
                  employeeLeaves
                    .filter((req) => {
                      const status = (req.status || "").toLowerCase().trim();
                      const viewStatus = (viewLeaveStatus || "")
                        .toLowerCase()
                        .trim();
                      if (viewStatus === "pending")
                        return status.includes("pending");
                      return status === viewStatus;
                    })
                    .map((req) => {
                      const fromStr = new Date(
                        req.start_date,
                      ).toLocaleDateString("ms-MY", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });
                      const toStr = new Date(req.end_date).toLocaleDateString(
                        "ms-MY",
                        { day: "2-digit", month: "2-digit", year: "numeric" },
                      );
                      return (
                        <div
                          key={req.leave_id}
                          id={`leave-form-${req.leave_id}`}
                          className="rounded-[24px] border border-border/50 p-5 sm:p-6 space-y-6 bg-card shadow-sm hover:shadow-md transition-all"
                        >
                          {/* Save to PDF Button */}
                          <div className="flex justify-end mb-2">
                            <button
                              onClick={async () => {
                                const el = document.getElementById(`leave-form-${req.leave_id}`);
                                if (!el) return;
                                const btn = el.querySelector('.pdf-btn') as HTMLElement;
                                if (btn) btn.style.display = 'none';
                                const canvas = await html2canvas(el, { scale: 2, useCORS: true });
                                if (btn) btn.style.display = '';
                                const imgData = canvas.toDataURL('image/png');
                                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                                const pdfWidth = pdf.internal.pageSize.getWidth();
                                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                                pdf.save(`Leave_Form_${selectedEmployee?.full_name?.replace(/ /g,'_') || 'Staff'}_${req.start_date}.pdf`);
                              }}
                              className="pdf-btn flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-[#7B0099] text-white px-3 py-2 rounded-xl hover:bg-[#5e0080] transition-colors shadow-md"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Save to PDF
                            </button>
                          </div>
                          <div className="text-center border-b-2 border-[#1A1C1E] pb-4">
                            <h2 className="text-xl font-black tracking-tighter text-[#1A1C1E]">
                              RAYHAR GROUP
                            </h2>
                            <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-60">
                              Staff Leave Application
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">
                                Staff Name
                              </span>
                              <p className="border-b pb-1 border-border/40 truncate">
                                {selectedEmployee?.full_name}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">
                                Branch
                              </span>
                              <p className="border-b pb-1 border-border/40">
                                {selectedBranch?.code || "HQ"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">
                                Type
                              </span>
                              <p className="border-b pb-1 border-border/40">
                                {req.leave_type}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">
                                Status
                              </span>
                              <p
                                className={`font-black uppercase ${req.status === "Rejected" ? "text-rose-600" : "text-[#7B0099]"}`}
                              >
                                {req.status}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30 rounded-[20px] border border-border/50">
                            <div className="text-center">
                              <p className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50 mb-1">
                                From
                              </p>
                              <p className="font-black text-sm">{fromStr}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50 mb-1">
                                To
                              </p>
                              <p className="font-black text-sm">{toStr}</p>
                            </div>
                            <div className="text-center bg-white dark:bg-slate-900 rounded-[14px] border border-border/50 py-1 shadow-sm flex flex-col justify-center">
                              <p className="text-[9px] uppercase font-black text-[#7B0099]">
                                Days
                              </p>
                              <p className="font-black text-lg text-[#7B0099] leading-none mt-0.5">
                                {req.days}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase text-slate-950 dark:text-slate-50 tracking-widest">
                              Reason / Purpose
                            </p>
                            <p className="rounded-[16px] border border-border/40 p-4 italic text-foreground/80 bg-muted/20 text-xs leading-relaxed">
                              "{getCleanReason(req.reason) || "-"}"
                            </p>
                          </div>

                          {(req.leave_type === "Sick Leave" ||
                            req.leave_type === "Cuti Sakit") &&
                            req.mc_file_url && (
                              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-[16px] flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                  <FileText className="w-5 h-5 text-[#7B0099]" />
                                  <span className="text-xs font-black text-[#7B0099]">
                                    MC Attachment
                                  </span>
                                </div>
                                <a
                                  href={`${API_BASE_URL}${req.mc_file_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-black uppercase tracking-widest bg-[#7B0099] text-white px-3 py-2 rounded-lg hover:bg-[#5e0080] transition-colors"
                                >
                                  View File
                                </a>
                              </div>
                            )}

                          <div className="pt-4 border-t border-border/50 space-y-4">
                            <div className="flex items-center gap-2">
                              <PhoneCall className="w-4 h-4 text-rose-500" />
                              <h3 className="text-[10px] font-black uppercase tracking-widest">
                                Emergency Contact (Waris)
                              </h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-[20px]">
                              <div className="space-y-1">
                                <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">
                                  Name
                                </span>
                                <p className="text-[11px] font-bold truncate">
                                  {req.waris_nama || "-"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">
                                  Phone
                                </span>
                                <p className="text-[11px] font-black text-[#7B0099]">
                                  {req.waris_phone || "-"}
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
          </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
