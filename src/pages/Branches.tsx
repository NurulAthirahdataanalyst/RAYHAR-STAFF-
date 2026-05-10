import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, Building2, CalendarCheck, Clock, Loader2, MapPin, TrendingUp, Users, FileText, Info, PhoneCall, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const branches = [
  { code: "HQ", name: "Rayhar HQ", location: "Kemaman,Terengganu", employees: 68, attendance: 95, leader: "Maria Santos" },
  { code: "KMM", name: "Kemaman", location: "Kemaman,Terengganu", employees: 68, attendance: 95, leader: "Maria Santos" },
  { code: "CNH", name: "Cheneh", location: "Kemaman,Terengganu", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "KBG", name: "Kuala Berang", location: "Hulu Terengganu,Terengganu", employees: 48, attendance: 92, leader: "David Chen" },
  { code: "TGG", name: "Kuala Terengganu", location: "Kuala Terengganu,Terengganu", employees: 48, attendance: 92, leader: "David Chen" },
  { code: "DGN", name: "Dungun", location: "Dungun,Terengganu", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "JTH", name: "Jertih", location: "Besut,Terengganu", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "KBR", name: "Kota Bharu", location: "Kota Bharu,Kelantan", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "RMP", name: "Rompin", location: "Rompin,Pahang", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "MZM", name: "Muadzam Shah", location: "Muadzam Shah,Pahang", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "SHA", name: "Shah Alam", location: "Shah Alam,Selangor", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "BBB", name: "Bandar Baru Bangi", location: "Bandar Baru Bangi,Selangor", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "KUL", name: "Kuala Lumpur", location: "Kuala Lumpur,Wilayah Persekutuan", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "IPH", name: "Ipoh", location: "Ipoh,Perak", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "MJG", name: "Manjung", location: "Manjung,Perak", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "KKS", name: "Kuala Kangsar", location: "Kuala Kangsar,Perak", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "MLK", name: "Melaka", location: "Melaka,Melaka", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "AOR", name: "Alor Setar", location: "Alor Setar,Kedah", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "BTM", name: "Bertam", location: "Bertam,Pulau Pinang", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "SNS", name: "Seremban", location: "Seremban,Negeri Sembilan", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "BTP", name: "Batu Pahat", location: "Batu Pahat,Johor", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "JB", name: "Johor Bharu", location: "Johor Bharu,Johor", employees: 40, attendance: 94, leader: "Roberto Lim" },
  { code: "TWU", name: "Tawau", location: "Tawau,Sabah", employees: 40, attendance: 94, leader: "Roberto Lim" },
];

type Branch = (typeof branches)[number];

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
        const response = await fetch("https://rayhar-staff-portal.onrender.com/api/branches");
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("https://rayhar-staff-portal.onrender.com/api/branches-stats");
        const data = await response.json();
        if (data.success) {
          setBranchStats(data.stats);
        }
      } catch (err) {
        console.error("Error fetching branch stats", err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Poll every 10 seconds
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
        const response = await fetch(`https://rayhar-staff-portal.onrender.com/api/leave-requests?userId=${selectedEmployeeId}`);
        const data = await response.json();
        console.log("DEBUG: Fetched leaves for", selectedEmployeeId, ":", data);
        if (data.success) {
          setEmployeeLeaves(data.leaveRequests || []);
        } else {
          setEmployeeLeaves([]);
        }
      } catch (err) {
        console.error("DEBUG: Error fetching leaves", err);
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
        const response = await fetch(`https://rayhar-staff-portal.onrender.com/api/branch-employees?branch=${selectedBranch.code}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to fetch branch employees");
        }

        setEmployees(data.employees);
        // Always select the first employee of the new branch
        if (data.employees.length > 0) {
          setSelectedEmployeeId(data.employees[0].user_id);
        } else {
          setSelectedEmployeeId("");
        }
      } catch (error) {
        console.error("Branch employee fetch error:", error);
        setEmployees([]);
        setSelectedEmployeeId("");
      } finally {
        setLoading(false);
      }
    };

    void fetchBranchEmployees();
  }, [selectedBranch]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.user_id === selectedEmployeeId) || employees[0],
    [employees, selectedEmployeeId]
  );

  return (
    <div className="space-y-6">
      {selectedBranch ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Button
                type="button"
                variant="ghost"
                className="mb-2 gap-2 px-0 text-muted-foreground hover:bg-transparent"
                onClick={() => setSelectedBranch(null)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to branches
              </Button>
              <h1 className="text-2xl font-bold font-heading text-foreground">{selectedBranch.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">Staff details, leave balance, and monthly statistics</p>
            </div>
            <Badge variant="outline" className="w-fit font-mono">{selectedBranch.code}</Badge>
          </div>

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center p-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              <Card className="border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Staff</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leave Balance</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendance</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.length > 0 ? (
                          employees.map((employee) => (
                            <tr
                              key={employee.user_id}
                              className={`cursor-pointer border-b border-slate-100 last:border-0 transition-colors hover:bg-white/80 ${
                                selectedEmployee?.user_id === employee.user_id ? "bg-white/90 shadow-sm" : ""
                              }`}
                              onClick={() => {
                                setSelectedEmployeeId(employee.user_id);
                                setIsStatsOpen(true);
                              }}
                            >
                              <td className="py-3 px-4">
                                <div className="font-medium text-foreground">{employee.full_name}</div>
                                <div className="text-xs text-muted-foreground">{employee.email}</div>
                              </td>
                              <td className="py-3 px-4 font-bold text-foreground">{employee.annual_leave_balance} days</td>
                              <td className="py-3 px-4 text-muted-foreground">{employee.attendance_rate || 0}%</td>
                              <td className="py-3 px-4">
                                <Badge variant={employee.today_status === "Present" ? "default" : "secondary"} className="text-[10px]">
                                  {employee.today_status}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-10 text-center text-muted-foreground">No staff found in this branch.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Sheet open={isStatsOpen} onOpenChange={setIsStatsOpen}>
                <SheetContent className="sm:max-w-md w-full overflow-y-auto">
                  <SheetHeader className="pb-6 border-b">
                    <SheetTitle className="text-xl font-black text-slate-800">Staff Statistics</SheetTitle>
                  </SheetHeader>
                  
                  <div className="py-6 space-y-6">
                    {selectedEmployee ? (
                      <>
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-[#601b8a] flex items-center justify-center text-white text-2xl font-black">
                              {selectedEmployee.full_name.charAt(0)}
                            </div>
                            <div>
                              <h2 className="text-xl font-black text-slate-800 leading-tight">{selectedEmployee.full_name}</h2>
                              <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">{selectedEmployee.user_id}</p>
                              <Badge variant="secondary" className="mt-2 text-[10px] uppercase font-black">{selectedEmployee.role.replace(/_/g, ' ')}</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-slate-100 p-4 bg-white hover:border-[#601b8a]/30 transition-colors">
                            <CalendarCheck className="mb-2 h-4 w-4 text-[#601b8a]" />
                            <p className="text-2xl font-black text-slate-800">{selectedEmployee.annual_leave_balance}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days Left</p>
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

                        <div className="space-y-3">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Leave Forms Detail</p>
                          <div className="grid grid-cols-1 gap-2">
                            <button 
                              className="flex items-center justify-between w-full rounded-2xl bg-emerald-50 p-4 hover:bg-emerald-100 transition-all border border-emerald-100" 
                              onClick={() => setViewLeaveStatus("Approved")}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-emerald-700">Approved Leaves</span>
                              </div>
                              <Badge className="bg-emerald-500 text-white font-black">{selectedEmployee.approved_leaves}</Badge>
                            </button>
                            
                            <button 
                              className="flex items-center justify-between w-full rounded-2xl bg-amber-50 p-4 hover:bg-amber-100 transition-all border border-amber-100" 
                              onClick={() => setViewLeaveStatus("Pending")}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white">
                                  <Clock className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-amber-700">Pending Approvals</span>
                              </div>
                              <Badge className="bg-amber-500 text-white font-black">{selectedEmployee.pending_leaves}</Badge>
                            </button>

                            <button 
                              className="flex items-center justify-between w-full rounded-2xl bg-rose-50 p-4 hover:bg-rose-100 transition-all border border-rose-100" 
                              onClick={() => setViewLeaveStatus("Rejected")}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white">
                                  <X className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-rose-700">Rejected Leaves</span>
                              </div>
                              <Badge className="bg-rose-500 text-white font-black">{selectedEmployee.rejected_leaves}</Badge>
                            </button>
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
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">Branches</h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of all company branches</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loadingBranches ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              allBranches.map((branch) => {
                const stat = branchStats.find((s) => s.branch === branch.code);
                const totalEmployees = stat ? stat.total_employees : 0;
                const presentToday = stat ? stat.present_today : 0;
                const onLeave = stat ? stat.on_leave : 0;
                const absent = Math.max(0, totalEmployees - presentToday - onLeave);
                
                const attendanceRate = totalEmployees > 0 
                  ? Math.round((presentToday / totalEmployees) * 100) 
                  : 0;

                // Find matching hardcoded data for location/leader if available
                const staticInfo = branches.find(b => b.code === branch.code);
                const location = staticInfo?.location || "Rayhar Branch";
                const leader = staticInfo?.leader || "Branch Manager";

                return (
                  <Card
                    key={branch.code}
                    className="cursor-pointer hover:shadow-lg transition-all border-none shadow-sm bg-white overflow-hidden group"
                    onClick={() => setSelectedBranch({...branch, location, leader, employees: totalEmployees, attendance: attendanceRate})}
                  >
                    <CardContent className="p-0">
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                              <Building2 className="w-6 h-6 text-slate-400 group-hover:text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-heading font-black text-slate-800 text-lg leading-tight">{branch.name}</h3>
                              <div className="flex items-center gap-1 text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                <MapPin className="w-3 h-3" />
                                {location}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="font-mono text-[10px] h-5 px-1.5">{branch.code}</Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-6">
                          <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50">
                            <p className="text-xl font-black text-emerald-600 leading-none">{presentToday}</p>
                            <p className="text-[9px] font-bold text-emerald-600/70 uppercase mt-1 tracking-tighter">Present</p>
                          </div>
                          <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100/50">
                            <p className="text-xl font-black text-amber-600 leading-none">{onLeave}</p>
                            <p className="text-[9px] font-bold text-amber-600/70 uppercase mt-1 tracking-tighter">On Leave</p>
                          </div>
                          <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100/50">
                            <p className="text-xl font-black text-rose-600 leading-none">{absent}</p>
                            <p className="text-[9px] font-bold text-rose-600/70 uppercase mt-1 tracking-tighter">Absent</p>
                          </div>
                        </div>
                      </div>

                      <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">{totalEmployees} Total Staff</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className={`w-3.5 h-3.5 ${attendanceRate > 80 ? 'text-emerald-500' : 'text-amber-500'}`} />
                            <span className="text-xs font-bold text-slate-600">{attendanceRate}% Rate</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Leader</p>
                          <p className="text-[11px] font-black text-slate-700 mt-0.5">{leader}</p>
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

      {/* LEAVE FORMS DIALOG - Now always accessible */}
      <Dialog open={!!viewLeaveStatus} onOpenChange={(open) => !open && setViewLeaveStatus(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {viewLeaveStatus} Leaves - {selectedEmployee?.full_name}
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
                      <div key={req.leave_id} className="rounded-lg border p-6 space-y-6 bg-white shadow-sm mb-6">
                        <div className="text-center border-b-2 border-slate-900 pb-4">
                          <h2 className="text-2xl font-black tracking-tight text-slate-900">RAYHAR GROUP</h2>
                          <p className="text-sm font-bold tracking-widest uppercase">Permohonan Cuti Kakitangan</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Nama Penuh</span>
                            <p className="font-semibold border-b pb-1 border-slate-100">{selectedEmployee?.full_name}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Cawangan</span>
                            <p className="font-semibold border-b pb-1 border-slate-100">{selectedBranch?.code || "HQ"}</p>
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
                            "{req.reason || "-"}"
                          </p>
                        </div>

                        {/* Conditional Fields: Cuti Ganti */}
                        {req.leave_type === "Cuti Ganti" && (
                          <div className="grid grid-cols-3 gap-4 text-sm border rounded-xl p-4 bg-blue-50/50 border-blue-100">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-blue-600">Tarikh Cuti</p>
                              <p className="font-bold text-base text-slate-900">{req.cuti_ganti_tarikh ? new Date(req.cuti_ganti_tarikh).toLocaleDateString() : "-"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-blue-600">Tarikh/Hari Cuti Ganti</p>
                              <p className="font-bold text-base text-slate-900">{req.cuti_ganti_hari || "-"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-blue-600">Jam Ganti</p>
                              <p className="font-bold text-base text-slate-900">{req.cuti_ganti_jam || 0} Jam</p>
                            </div>
                          </div>
                        )}

                        {/* Conditional Fields: Cuti Tanpa Gaji */}
                        {req.leave_type === "Cuti Tanpa Gaji" && (
                          <div className="grid grid-cols-2 gap-4 text-sm border rounded-xl p-4 bg-rose-50/50 border-rose-100">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-rose-600">No. Tel H/P</p>
                              <p className="font-bold text-base text-slate-900">{req.cuti_tanpa_gaji_phone || "-"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-rose-600">Tandatangan Pengesahan</p>
                              <p className="font-bold text-base text-slate-900">
                                {req.cuti_tanpa_gaji_signature ? "✓ Disahkan" : "Tiada Pengesahan"}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Conditional Fields: Cuti Sakit (MC) */}
                        {req.leave_type === "Cuti Sakit" && req.mc_file_url && (
                          <div className="text-sm p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
                            <p className="text-[10px] uppercase font-bold text-purple-600 mb-2">Lampiran MC</p>
                            <a href={`https://rayhar-staff-portal.onrender.com${req.mc_file_url}`} target="_blank" rel="noopener noreferrer" className="text-purple-700 underline font-semibold flex items-center gap-2">
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
                              <p className="text-sm font-semibold text-slate-900 border-b border-dotted pb-1">
                                {req.waris_nama || "-"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">Hubungan</label>
                              <p className="text-sm font-semibold text-slate-900 border-b border-dotted pb-1">
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
    </div>
  );
}
