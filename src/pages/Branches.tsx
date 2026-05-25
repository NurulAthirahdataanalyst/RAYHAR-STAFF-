import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, Building2, CalendarCheck, Clock, Loader2, MapPin, TrendingUp, Users, FileText, PhoneCall, X, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config/api";
import { toast } from "sonner";

const branches = [
  { code: "HQ", name: "Rayhar HQ", location: "Kemaman,Terengganu", leader: "Maria Santos" },
  { code: "KMM", name: "Kemaman", location: "Kemaman,Terengganu", leader: "Maria Santos" },
  { code: "CNH", name: "Cheneh", location: "Kemaman,Terengganu", leader: "Roberto Lim" },
  { code: "KBG", name: "Kuala Berang", location: "Hulu Terengganu,Terengganu", leader: "David Chen" },
  { code: "TGG", name: "Kuala Terengganu", location: "Kuala Terengganu,Terengganu", leader: "David Chen" },
  { code: "DGN", name: "Dungun", location: "Dungun,Terengganu", leader: "Roberto Lim" },
  { code: "JTH", name: "Jertih", location: "Besut,Terengganu", leader: "Roberto Lim" },
  { code: "KBR", name: "Kota Bharu", location: "Kota Bharu,Kelantan", leader: "Roberto Lim" },
  { code: "RMP", name: "Rompin", location: "Rompin,Pahang", leader: "Roberto Lim" },
  { code: "MZM", name: "Muadzam Shah", location: "Muadzam Shah,Pahang", leader: "Roberto Lim" },
  { code: "SHA", name: "Shah Alam", location: "Shah Alam,Selangor", leader: "Roberto Lim" },
  { code: "BBB", name: "Bandar Baru Bangi", location: "Bandar Baru Bangi,Selangor", leader: "Roberto Lim" },
  { code: "KUL", name: "Kuala Lumpur", location: "Kuala Lumpur,Wilayah Persekutuan", leader: "Roberto Lim" },
  { code: "IPH", name: "Ipoh", location: "Ipoh,Perak", leader: "Roberto Lim" },
  { code: "MJG", name: "Manjung", location: "Manjung,Perak", leader: "Roberto Lim" },
  { code: "KKS", name: "Kuala Kangsar", location: "Kuala Kangsar,Perak", leader: "Roberto Lim" },
  { code: "MLK", name: "Melaka", location: "Melaka,Melaka", leader: "Roberto Lim" },
  { code: "AOR", name: "Alor Setar", location: "Alor Setar,Kedah", leader: "Roberto Lim" },
  { code: "BTM", name: "Bertam", location: "Bertam,Pulau Pinang", leader: "Roberto Lim" },
  { code: "SNS", name: "Seremban", location: "Seremban,Negeri Sembilan", leader: "Roberto Lim" },
  { code: "BTP", name: "Batu Pahat", location: "Batu Pahat,Johor", leader: "Roberto Lim" },
  { code: "JB", name: "Johor Bharu", location: "Johor Bharu,Johor", leader: "Roberto Lim" },
  { code: "TWU", name: "Tawau", location: "Tawau,Sabah", leader: "Roberto Lim" },
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
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [employees, setEmployees] = useState<BranchEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewLeaveStatus, setViewLeaveStatus] = useState<"Approved" | "Pending" | "Rejected" | null>(null);
  const [employeeLeaves, setEmployeeLeaves] = useState<any[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [branchStats, setBranchStats] = useState<any[]>([]);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

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

  const handleDeleteBranch = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete branch ${code}?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/branches/${code}`, { method: "DELETE" });
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
        const response = await fetch(`${API_BASE_URL}/api/leave-requests?userId=${selectedEmployeeId}`);
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
        const response = await fetch(`${API_BASE_URL}/api/branch-employees?branch=${selectedBranch.code}`);
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
    [employees, selectedEmployeeId]
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      {selectedBranch ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <Button
                type="button"
                variant="ghost"
                className="mb-1 gap-2 px-0 text-muted-foreground hover:bg-transparent hover:text-[#7B0099] transition-colors touch-target"
                onClick={() => setSelectedBranch(null)}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Back to branches</span>
              </Button>
              <h1 className="text-responsive-xl font-black text-foreground tracking-tight truncate">{selectedBranch.name}</h1>
              <p className="text-responsive-sm text-muted-foreground font-medium mt-1">Branch staff overview and analytics</p>
            </div>
            <Badge variant="outline" className="w-fit font-mono text-[10px] sm:text-xs bg-muted/30 border-border/60 px-3 py-1">
              {selectedBranch.code}
            </Badge>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 bg-card/60 backdrop-blur-md rounded-[32px] border border-border/50">
              <Loader2 className="h-10 w-10 animate-spin text-[#7B0099]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Syncing Branch Data...</p>
            </div>
          ) : (
            <Card className="border-none shadow-sm overflow-hidden bg-card/60 backdrop-blur-md rounded-[24px]">
              <CardContent className="p-0">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 text-foreground border-b border-border">
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em]">Personnel</th>
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em]">Leave Balance</th>
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em]">Attendance</th>
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em]">Today</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {employees.length > 0 ? (
                        employees.map((employee) => (
                          <tr
                            key={employee.user_id}
                            className={`cursor-pointer transition-colors group hover:bg-[#7B0099]/5 ${
                              selectedEmployee?.user_id === employee.user_id ? "bg-[#7B0099]/10" : ""
                            }`}
                            onClick={() => {
                              setSelectedEmployeeId(employee.user_id);
                              setIsStatsOpen(true);
                            }}
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#7B0099]/10 flex items-center justify-center text-[11px] font-black text-[#7B0099] group-hover:scale-110 transition-transform">
                                  {employee.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-foreground group-hover:text-[#7B0099] transition-colors">{employee.full_name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate font-medium uppercase tracking-widest">{employee.user_id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-bold text-foreground text-xs uppercase">{employee.annual_leave_balance} DAYS</td>
                            <td className="py-4 px-6 font-bold text-muted-foreground text-xs">{employee.attendance_rate || 0}%</td>
                            <td className="py-4 px-6">
                              <Badge className={`text-[9px] font-black px-2.5 h-5 ${
                                employee.today_status === "Present" ? "bg-emerald-500 text-white" :
                                employee.today_status === "On Leave" ? "bg-amber-500 text-white" :
                                "bg-rose-500 text-white"
                              }`}>
                                {employee.today_status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-muted-foreground italic font-medium">No personnel found in this branch.</td>
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
                          {employee.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-black text-sm text-foreground truncate">{employee.full_name}</p>
                            <Badge className={`text-[9px] font-black h-5 shrink-0 ${
                              employee.today_status === "Present" ? "bg-emerald-500" :
                              employee.today_status === "On Leave" ? "bg-amber-500" :
                              "bg-rose-500"
                            }`}>
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
                    <div className="py-12 text-center text-muted-foreground italic font-medium p-6">No personnel found.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Sheet open={isStatsOpen} onOpenChange={setIsStatsOpen}>
            <SheetContent className="sm:max-w-md w-full overflow-y-auto border-none shadow-2xl safe-area-bottom">
              <SheetHeader className="pb-6 border-b border-border/50 pt-4">
                <SheetTitle className="text-xl font-black text-foreground tracking-tight">Staff Analytics</SheetTitle>
              </SheetHeader>
              <div className="py-6 space-y-6">
                {selectedEmployee ? (
                  <>
                    <div className="bg-muted/30 p-6 rounded-[24px] border border-border/50">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#7B0099] to-[#a855f7] flex items-center justify-center text-white text-2xl font-black shadow-lg">
                          {selectedEmployee.full_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-xl font-black text-foreground leading-tight truncate">{selectedEmployee.full_name}</h2>
                          <p className="text-[10px] font-black text-muted-foreground mt-1 uppercase tracking-widest">{selectedEmployee.user_id}</p>
                          <Badge variant="secondary" className="mt-2 text-[10px] uppercase font-black bg-[#7B0099]/10 text-[#7B0099] border-none px-2">{selectedEmployee.role.replace(/_/g, ' ')}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[20px] border border-border/50 p-4 bg-card/50 hover:border-[#7B0099]/30 transition-colors group">
                        <CalendarCheck className="mb-2 h-4 w-4 text-[#7B0099] group-hover:scale-110 transition-transform" />
                        <p className="text-2xl font-black text-foreground">{selectedEmployee.annual_leave_balance}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Days Left</p>
                      </div>
                      <div className="rounded-[20px] border border-border/50 p-4 bg-card/50 hover:border-emerald-500/30 transition-colors group">
                        <TrendingUp className="mb-2 h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                        <p className="text-2xl font-black text-foreground">{selectedEmployee.attendance_rate || 0}%</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Attendance</p>
                      </div>
                      <div className="rounded-[20px] border border-border/50 p-4 bg-card/50 hover:border-amber-500/30 transition-colors group">
                        <Clock className="mb-2 h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
                        <p className="text-2xl font-black text-foreground">{selectedEmployee.pending_leaves}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Pending</p>
                      </div>
                      <div className="rounded-[20px] border border-border/50 p-4 bg-card/50 hover:border-purple-500/30 transition-colors group">
                        <FileText className="mb-2 h-4 w-4 text-purple-500 group-hover:scale-110 transition-transform" />
                        <p className="text-2xl font-black text-foreground">{selectedEmployee.mc_leaves || 0}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Total MC</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Review Leave Records</p>
                      <div className="grid grid-cols-1 gap-2">
                        <button className="flex items-center justify-between w-full rounded-[16px] bg-emerald-500/10 p-4 hover:bg-emerald-500/20 transition-all border border-emerald-500/20 group touch-target" onClick={() => setViewLeaveStatus("Approved")}>
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                            <span className="font-black text-emerald-700 text-sm">Approved Leaves</span>
                          </div>
                          <Badge className="bg-emerald-500 text-white font-black">{selectedEmployee.approved_leaves}</Badge>
                        </button>
                        <button className="flex items-center justify-between w-full rounded-[16px] bg-amber-500/10 p-4 hover:bg-amber-500/20 transition-all border border-amber-500/20 group touch-target" onClick={() => setViewLeaveStatus("Pending")}>
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                            <span className="font-black text-amber-700 text-sm">Pending Approvals</span>
                          </div>
                          <Badge className="bg-amber-500 text-white font-black">{selectedEmployee.pending_leaves}</Badge>
                        </button>
                        <button className="flex items-center justify-between w-full rounded-[16px] bg-rose-500/10 p-4 hover:bg-rose-500/20 transition-all border border-rose-500/20 group touch-target" onClick={() => setViewLeaveStatus("Rejected")}>
                          <div className="flex items-center gap-3">
                            <X className="w-5 h-5 text-rose-600 group-hover:scale-110 transition-transform" />
                            <span className="font-black text-rose-700 text-sm">Rejected Leaves</span>
                          </div>
                          <Badge className="bg-rose-500 text-white font-black">{selectedEmployee.rejected_leaves}</Badge>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-40">
                    <Users className="w-16 h-16 mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Select staff to view</p>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-responsive-2xl font-black text-foreground tracking-tight">Branches Overview</h1>
            <p className="text-responsive-sm text-muted-foreground font-medium mt-1">Real-time status across all locations</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {loadingBranches ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-[#7B0099]" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Scanning Network...</p>
              </div>
            ) : (
              allBranches.map((branch) => {
                const stat = branchStats.find((s) => s.branch === branch.code);
                const totalEmployees = stat ? stat.total_employees : 0;
                const presentToday = stat ? stat.present_today : 0;
                const onLeave = stat ? stat.on_leave : 0;
                const absent = Math.max(0, totalEmployees - presentToday - onLeave);
                const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;
                const staticInfo = branches.find(b => b.code === branch.code);
                const location = branch.location || staticInfo?.location || "Rayhar Branch";
                const leader = branch.leader_name || staticInfo?.leader || "Branch Leader";

                return (
                  <Card key={branch.code} className="cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all border-none shadow-sm bg-card/80 backdrop-blur-md overflow-hidden group rounded-[24px]" onClick={() => setSelectedBranch({...branch, location, leader, employees: totalEmployees, attendance: attendanceRate})}>
                    <CardContent className="p-0">
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-[18px] bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-[#7B0099]/10 transition-colors">
                              <Building2 className="w-6 h-6 text-muted-foreground group-hover:text-[#7B0099] transition-colors" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-black text-foreground text-lg leading-tight truncate group-hover:text-[#7B0099] transition-colors">{branch.name}</h3>
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest truncate opacity-60">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {location}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="font-mono text-[9px] h-5 px-1.5 bg-muted/20 border-border/50">{branch.code}</Badge>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-7 h-7 hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground"
                              onClick={(e) => handleDeleteBranch(e, branch.code)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-6">
                          <div className="bg-emerald-500/10 rounded-[16px] p-3 border border-emerald-500/20 text-center">
                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{presentToday}</p>
                            <p className="text-[9px] font-black text-emerald-600/70 dark:text-emerald-400/70 uppercase mt-1">Present</p>
                          </div>
                          <div className="bg-amber-500/10 rounded-[16px] p-3 border border-amber-500/20 text-center">
                            <p className="text-xl font-black text-amber-600 dark:text-amber-400 leading-none">{onLeave}</p>
                            <p className="text-[9px] font-black text-amber-600/70 dark:text-amber-400/70 uppercase mt-1">Leave</p>
                          </div>
                          <div className="bg-rose-500/10 rounded-[16px] p-3 border border-rose-500/20 text-center">
                            <p className="text-xl font-black text-rose-600 dark:text-rose-400 leading-none">{absent}</p>
                            <p className="text-[9px] font-black text-rose-600/70 dark:text-rose-400/70 uppercase mt-1">Absent</p>
                          </div>
                        </div>
                      </div>
                      <div className="px-6 py-4 bg-muted/30 flex items-center justify-between border-t border-border/50">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-muted-foreground opacity-50" />
                            <span className="text-[11px] font-black text-foreground/70">{totalEmployees}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className={`w-3.5 h-3.5 ${attendanceRate > 80 ? 'text-emerald-500' : 'text-amber-500'}`} />
                            <span className="text-[11px] font-black text-foreground/70">{attendanceRate}%</span>
                          </div>
                        </div>
                        <div className="text-right min-w-0 ml-4">
                          <p className="text-[9px] font-black text-muted-foreground uppercase leading-none opacity-40">Leader</p>
                          <p className="text-[10px] font-black text-foreground/80 mt-0.5 truncate">{leader}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* LEAVE DETAILS DIALOG */}
      <Dialog open={!!viewLeaveStatus} onOpenChange={(open) => !open && setViewLeaveStatus(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-none shadow-2xl rounded-[32px] p-0 overflow-hidden safe-area-bottom">
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

          <div className="p-4 sm:p-6 space-y-6">
            {loadingLeaves ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#7B0099]" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fetching Forms...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {employeeLeaves.filter(req => {
                  const status = (req.status || "").toLowerCase().trim();
                  const viewStatus = (viewLeaveStatus || "").toLowerCase().trim();
                  if (viewStatus === "pending") return status.includes("pending");
                  return status === viewStatus;
                }).length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center gap-3 opacity-30">
                    <FileText className="w-12 h-12" />
                    <p className="text-sm font-black uppercase tracking-widest">No matching records found</p>
                  </div>
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
                        <div key={req.leave_id} className="rounded-[24px] border border-border/50 p-5 sm:p-6 space-y-6 bg-card shadow-sm hover:shadow-md transition-all">
                          <div className="text-center border-b-2 border-[#1A1C1E] pb-4">
                            <h2 className="text-xl font-black tracking-tighter text-[#1A1C1E]">RAYHAR GROUP</h2>
                            <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-60">Staff Leave Application</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-muted-foreground opacity-50">Staff Name</span>
                              <p className="border-b pb-1 border-border/40 truncate">{selectedEmployee?.full_name}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-muted-foreground opacity-50">Branch</span>
                              <p className="border-b pb-1 border-border/40">{selectedBranch?.code || "HQ"}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-muted-foreground opacity-50">Type</span>
                              <p className="border-b pb-1 border-border/40">{req.leave_type}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-muted-foreground opacity-50">Status</span>
                              <p className={`font-black uppercase ${req.status === "Rejected" ? "text-rose-600" : "text-[#7B0099]"}`}>
                                {req.status}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30 rounded-[20px] border border-border/50">
                            <div className="text-center">
                              <p className="text-[9px] uppercase font-black text-muted-foreground opacity-50 mb-1">From</p>
                              <p className="font-black text-sm">{fromStr}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] uppercase font-black text-muted-foreground opacity-50 mb-1">To</p>
                              <p className="font-black text-sm">{toStr}</p>
                            </div>
                            <div className="text-center bg-white dark:bg-slate-900 rounded-[14px] border border-border/50 py-1 shadow-sm flex flex-col justify-center">
                              <p className="text-[9px] uppercase font-black text-[#7B0099]">Days</p>
                              <p className="font-black text-lg text-[#7B0099] leading-none mt-0.5">{req.days}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest">Reason / Purpose</p>
                            <p className="rounded-[16px] border border-border/40 p-4 italic text-foreground/80 bg-muted/20 text-xs leading-relaxed">
                              "{req.reason || "-"}"
                            </p>
                          </div>

                          {(req.leave_type === "Sick Leave" || req.leave_type === "Cuti Sakit") && req.mc_file_url && (
                            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-[16px] flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-[#7B0099]" />
                                <span className="text-xs font-black text-[#7B0099]">MC Attachment</span>
                              </div>
                              <a href={`${API_BASE_URL}${req.mc_file_url}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest bg-[#7B0099] text-white px-3 py-2 rounded-lg hover:bg-[#5e0080] transition-colors">
                                View File
                              </a>
                            </div>
                          )}

                          <div className="pt-4 border-t border-border/50 space-y-4">
                            <div className="flex items-center gap-2">
                              <PhoneCall className="w-4 h-4 text-rose-500" />
                              <h3 className="text-[10px] font-black uppercase tracking-widest">Emergency Contact (Waris)</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-[20px]">
                              <div className="space-y-1">
                                <span className="text-[8px] font-black text-muted-foreground uppercase opacity-50">Name</span>
                                <p className="text-[11px] font-bold truncate">{req.waris_nama || "-"}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-black text-muted-foreground uppercase opacity-50">Phone</span>
                                <p className="text-[11px] font-black text-[#7B0099]">{req.waris_phone || "-"}</p>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
