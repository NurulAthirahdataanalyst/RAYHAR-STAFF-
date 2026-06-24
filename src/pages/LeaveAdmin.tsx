import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Users, MapPin, Info, Loader2, FileText, Printer, PhoneCall, Clock, CheckCircle2, XCircle, ChevronRight, ClipboardList, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { parseCutiGantiRows, getCleanReason } from "@/lib/leaveStorage";
import { API_BASE_URL } from "../config/api";

type LeaveRequest = {
  id: number;
  employee: string;
  branch: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "Pending HOD" | "Pending Branch Leader" | "Pending Finance" | "Pending MD" | "Approved" | "Rejected";
  warisNama: string;
  warisPhone: string;
  warisAlamat: string;
  warisHubungan: string;
  approverRole?: string;
  cutiGantiTarikh?: string;
  cutiGantiHari?: string;
  cutiGantiJam?: number;
  cutiTanpaGajiPhone?: string;
  cutiTanpaGajiSignature?: boolean;
  mcFileUrl?: string;
  approvalHistory?: {
    id: number;
    approver_id: string;
    approver_role: string;
    approver_name: string;
    status: string;
    remarks: string;
    created_at: string;
    approver_department?: string;
    approver_branch?: string;
  }[];
};

const formatDate = (value: string) => (value ? value.slice(0, 10) : "");

const formatRole = (role: string) => {
  return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const formatApproverRole = (role: string, department?: string, branch?: string) => {
  if (!role) return "Approver";
  const normalized = role.toLowerCase().trim();
  if (normalized === "head_of_department") {
    return `Head Of Department (${department || "N/A"})`;
  }
  if (normalized === "branch_leader") {
    return `Branch Leader (${branch || "N/A"})`;
  }
  if (normalized === "finance_manager") {
    return "Finance Manager";
  }
  if (normalized === "managing_director") {
    return "Managing Director";
  }
  return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Roles that can approve/reject leave requests
const APPROVER_ROLES = ["managing_director", "finance_manager", "head_of_department", "branch_leader"];
// Roles that can see the leave admin panel (view + approve or view only)
const ADMIN_VIEW_ROLES = ["hr_admin", "branch_leader", ...APPROVER_ROLES];

type TabFilter = "pending" | "approved" | "rejected" | "history";

export default function LeaveAdmin() {
  const { role, userBranch, userDepartment, userId } = useRole();
  const canApprove = APPROVER_ROLES.includes(role);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>("history");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const months = [
    { value: "all", label: "All Months" },
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // Remarks Modal State
  const [remarksDialogOpen, setRemarksDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ id: number, action: "approve" | "reject", status: string } | null>(null);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // First, filter by month
  const requestsByMonth = requests.filter((req) => {
    if (selectedMonth === "all") return true;
    return req.from.substring(5, 7) === selectedMonth;
  });

  // Then, filter by active tab
  const filteredRequests = requestsByMonth.filter((req) => {
    switch (activeTab) {
      case "pending":
        return req.status.startsWith("Pending");
      case "approved":
        return req.status === "Approved";
      case "rejected":
        return req.status === "Rejected";
      case "history":
        return true; // Show all
    }
    return false;
  });

  const pendingCount = requestsByMonth.filter((r) => r.status.startsWith("Pending")).length;
  const approvedCount = requestsByMonth.filter((r) => r.status === "Approved").length;
  const rejectedCount = requestsByMonth.filter((r) => r.status === "Rejected").length;

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    void fetchRequests();
  }, [role, userBranch, userDepartment]);

  // Auto-open a specific leave form when navigated with ?leaveId=xxx
  useEffect(() => {
    const leaveId = searchParams.get("leaveId");
    if (leaveId && requests.length > 0 && !selectedRequest) {
      const match = requests.find((r) => r.id === Number(leaveId));
      if (match) {
        if (match.status === "Approved") {
          setActiveTab("approved");
        } else if (match.status === "Rejected") {
          setActiveTab("rejected");
        } else if (match.status.startsWith("Pending")) {
          setActiveTab("pending");
        } else {
          setActiveTab("history");
        }
        setSelectedRequest(match);
        // Clear the param so it doesn't re-trigger
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, requests, selectedRequest, setSearchParams]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        role,
        branch: userBranch || "",
        department: userDepartment || "",
      });

      const response = await fetch(`${API_BASE_URL}/api/leave-requests?${params}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch leave requests");
      }

      const formatted = data.leaveRequests.map((request: any) => ({
        id: request.leave_id,
        employee: request.full_name || request.user_id,
        branch: request.branch || "HQ",
        type: request.leave_type,
        from: formatDate(request.start_date),
        to: formatDate(request.end_date),
        days: Number(request.days || 0),
        reason: request.reason || "-",
        status: request.status || "Pending HOD",
        // Mapped from backend snake_case to frontend camelCase
        warisNama: request.waris_nama || "N/A",
        warisPhone: request.waris_phone || "N/A",
        warisAlamat: request.waris_alamat || "N/A",
        warisHubungan: request.waris_hubungan || "N/A",
        approverRole: request.approver_role,
        cutiGantiTarikh: request.cuti_ganti_tarikh ? formatDate(request.cuti_ganti_tarikh) : undefined,
        cutiGantiHari: request.cuti_ganti_hari,
        cutiGantiJam: request.cuti_ganti_jam,
        cutiTanpaGajiPhone: request.cuti_tanpa_gaji_phone,
        cutiTanpaGajiSignature: request.cuti_tanpa_gaji_signature,
        mcFileUrl: request.mc_file_url,
        approvalHistory: request.approval_history || [],
      }));

      setRequests(formatted);
    } catch (error) {
      console.error("Leave approval fetch error:", error);
      toast.error("Unable to load leave requests", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: number, action: "approve" | "reject", currentStatus: string) => {
    setPendingAction({ id, action, status: currentStatus });
    setRemarks("");
    setRemarksDialogOpen(true);
  };

  const submitAction = async () => {
    if (!pendingAction) return;
    const { id, action } = pendingAction;
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/leave-requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action === "approve" ? "Approve" : "Reject",
          approver_id: userId,
          role: role,
          remarks: remarks,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update leave request");
      }

      setRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status: data.nextStatus } : req))
      );

      setRemarksDialogOpen(false);
      setPendingAction(null);

      if (action === "approve") {
        toast.success("Application Processed", { description: `Status is now: ${data.nextStatus}` });
        if (data.nextStatus === "Approved") {
          setActiveTab("approved");
        }
      } else {
        toast.error("Application Rejected", { description: "Status updated accordingly." });
        if (data.nextStatus === "Rejected") {
          setActiveTab("rejected");
        }
      }

      // Refresh to get updated history
      fetchRequests();
    } catch (error) {
      console.error("Leave approval update error:", error);
      toast.error("Unable to update application", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <Card className="border border-white/60 bg-white/40 dark:bg-card/40 backdrop-blur-2xl rounded-3xl shadow-xl shadow-purple-900/5 overflow-hidden ring-1 ring-black/5">
        <CardContent className="p-0">
          
          
          <div className="p-6 md:p-8 space-y-6">

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { title: "Total Leaves", count: requestsByMonth.length, bg: "bg-emerald-500", icon: CheckCircle2 },
          { title: "Approved Leaves", count: approvedCount, bg: "bg-pink-500", icon: FileText },
          { title: "Rejected Leaves", count: rejectedCount, bg: "bg-amber-500", icon: XCircle },
          { title: "Pending Requests", count: pendingCount, bg: "bg-cyan-500", icon: Clock },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border shadow-sm rounded-lg overflow-hidden flex relative h-[100px] hover:shadow-md transition-shadow">
            <div className={`w-[85px] ${stat.bg} flex items-center justify-center relative shrink-0`}>
              <stat.icon className="text-white w-8 h-8 z-10" />
              <div className="absolute -right-[20px] top-0 bottom-0 w-[40px] bg-card transform skew-x-[-20deg]" />
            </div>
            <div className="flex-1 flex flex-col justify-center items-end pr-5 relative z-10">
              <div className="text-[13px] font-medium text-muted-foreground whitespace-nowrap">{stat.title}</div>
              <div className="text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight">{stat.count}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <Card className="border border-border/60 shadow-sm bg-card rounded-lg overflow-hidden">
        
        {/* Table Controls Header */}
        <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-base font-bold text-foreground">Leave List</h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px] h-9 text-xs font-medium rounded-md bg-transparent">
                <SelectValue placeholder="All Months" />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" className="h-9 text-xs font-semibold rounded-md gap-2 border-border/50 hover:bg-muted/40 transition-colors">
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>

            <Select value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
              <SelectTrigger className="w-[140px] h-9 text-xs font-medium rounded-md bg-transparent">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="history" className="text-xs">All Status</SelectItem>
                <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                <SelectItem value="approved" className="text-xs">Approved</SelectItem>
                <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#7B0099]" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground animate-pulse">Loading Leaves...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="whitespace-nowrap">
                <TableHeader className="bg-muted/20 border-b border-border/40">
                  <TableRow>
                    <TableHead className="px-5 py-4 font-semibold text-muted-foreground">Employee</TableHead>
                    <TableHead className="px-5 py-4 font-semibold text-muted-foreground">Leave Type</TableHead>
                    <TableHead className="px-5 py-4 font-semibold text-muted-foreground">From</TableHead>
                    <TableHead className="px-5 py-4 font-semibold text-muted-foreground">To</TableHead>
                    <TableHead className="px-5 py-4 font-semibold text-muted-foreground">No of Days</TableHead>
                    <TableHead className="px-5 py-4 font-semibold text-muted-foreground">Status</TableHead>
                    {canApprove && <TableHead className="px-5 py-4 font-semibold text-muted-foreground text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {filteredRequests.length > 0 ? (
                    filteredRequests.map((req) => (
                      <TableRow key={req.id} className="hover:bg-muted/30 transition-colors group">
                        <TableCell className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#7B0099]/10 text-[#7B0099] flex items-center justify-center text-xs font-bold shrink-0">
                              {req.employee.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => setSelectedRequest(req)}
                                className="font-bold text-foreground hover:text-[#7B0099] transition-colors text-left"
                              >
                                {req.employee}
                              </button>
                              <span className="text-[11px] text-muted-foreground mt-0.5">{req.branch}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <span className="text-[13px] font-medium text-foreground flex items-center gap-1.5">
                            {req.type}
                            {req.reason && <Info className="w-3.5 h-3.5 text-muted-foreground opacity-50" />}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-[13px] font-medium text-muted-foreground">
                          {req.from}
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-[13px] font-medium text-muted-foreground">
                          {req.to}
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <Badge variant="secondary" className="bg-muted/50 font-medium text-foreground rounded-md px-2 py-0.5">
                            {req.days} {req.days > 1 ? 'Days' : 'Day'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            req.status === "Approved" ? "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                            req.status === "Rejected" ? "bg-rose-100/50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
                            "bg-amber-100/50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}>
                            {req.status === "Approved" || req.status === "Rejected" ? req.status : "Pending"}
                          </span>
                        </TableCell>
                        {canApprove && (
                          <TableCell className="px-5 py-3.5 text-right">
                            {((req.status.startsWith("Pending HOD") && role === "head_of_department") ||
                              (req.status === "Pending Branch Leader" && role === "branch_leader") ||
                              (req.status === "Pending Finance" && role === "finance_manager") ||
                              (req.status === "Pending MD" && role === "managing_director")) ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 rounded p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                  onClick={() => handleAction(req.id, "approve", req.status)}
                                  title="Approve"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 rounded p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                                  onClick={() => handleAction(req.id, "reject", req.status)}
                                  title="Reject"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/60 font-medium italic">No Action</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canApprove ? 7 : 6} className="py-12 text-center">
                        <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">No leave requests found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-none shadow-2xl rounded-[32px] p-0 safe-area-bottom">
          {selectedRequest && (
            <>
              <div className="p-6 bg-gradient-to-br from-[#7B0099] to-[#a855f7] text-white print:hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-white text-xl font-black tracking-tight">
                    <FileText className="h-6 w-6" />
                    Leave Application Detail
                  </DialogTitle>
                  <DialogDescription className="text-white/80 font-bold uppercase text-[10px] tracking-widest">
                    HR Approval Registry • ID: {selectedRequest.id}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div id="leave-form-print" className="p-4 sm:p-6 space-y-4">
                <div className="rounded-[24px] border border-border/50 p-4 sm:p-6 space-y-4 bg-card shadow-sm">
                  <div className="text-center border-b-2 border-foreground/50 dark:border-purple-500/50 pb-4">
                    <h2 className="text-2xl font-black tracking-tighter text-foreground dark:text-purple-400">RAYHAR GROUP</h2>
                    <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-60 dark:text-purple-300">Permohonan Cuti Kakitangan</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-muted-foreground opacity-50">Nama Penuh</span>
                      <p className="border-b pb-1 border-border/40 truncate">{selectedRequest.employee}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-muted-foreground opacity-50">Cawangan</span>
                      <p className="border-b pb-1 border-border/40">{selectedRequest.branch}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-muted-foreground opacity-50">Jenis Cuti</span>
                      <p className="border-b pb-1 border-border/40">{selectedRequest.type}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-muted-foreground opacity-50">Status</span>
                      <p className={`font-black uppercase ${selectedRequest.status === "Rejected" ? "text-rose-600" : "text-[#7B0099]"}`}>
                        {selectedRequest.status}
                        {selectedRequest.status === "Rejected" && selectedRequest.approverRole && (
                          <span className="block text-[8px] text-rose-500 mt-0.5 opacity-60">
                            (by: {formatRole(selectedRequest.approverRole)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30 rounded-[20px] border border-border/50">
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-black text-muted-foreground opacity-50 mb-1">Dari</p>
                      <p className="font-black text-xs sm:text-sm">{selectedRequest.from}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-black text-muted-foreground opacity-50 mb-1">Hingga</p>
                      <p className="font-black text-xs sm:text-sm">{selectedRequest.to}</p>
                    </div>
                    <div className="text-center bg-white dark:bg-slate-900 rounded-[14px] border border-border/50 py-1 shadow-sm flex flex-col justify-center">
                      <p className="text-[9px] uppercase font-black text-[#7B0099]">Hari</p>
                      <p className="font-black text-lg text-[#7B0099] leading-none mt-0.5">{selectedRequest.days}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest">Sebab / Tujuan</p>
                    <p className="rounded-[16px] border border-border/40 p-4 italic text-foreground/80 bg-muted/10 text-xs leading-relaxed">
                      "{getCleanReason(selectedRequest.reason) || "-"}"
                    </p>
                  </div>

                   {/* Conditional Fields: Cuti Ganti */}
                  {(selectedRequest.type === "Replacement Leave" || selectedRequest.type === "Cuti Ganti") && (() => {
                    const rows = parseCutiGantiRows(
                      selectedRequest.reason,
                      selectedRequest.cutiGantiTarikh,
                      selectedRequest.cutiGantiHari,
                      selectedRequest.cutiGantiJam
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
                  {(selectedRequest.type === "Unpaid Leave" || selectedRequest.type === "Cuti Tanpa Gaji") && (
                    <div className="grid grid-cols-2 gap-4 text-[10px] border rounded-[20px] p-4 bg-rose-500/5 border-rose-500/20">
                      <div>
                        <p className="uppercase font-black text-rose-600 opacity-60">No. Tel H/P</p>
                        <p className="font-black mt-0.5">{selectedRequest.cutiTanpaGajiPhone || "-"}</p>
                      </div>
                      <div>
                        <p className="uppercase font-black text-rose-600 opacity-60">Tandatangan</p>
                        <p className="font-black mt-0.5 text-rose-700">
                          {selectedRequest.cutiTanpaGajiSignature ? "✓ DISAHKAN" : "TIADA PENGESAHAN"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Conditional Fields: Cuti Sakit (MC) */}
                  {(selectedRequest.type === "Sick Leave" || selectedRequest.type === "Cuti Sakit") && selectedRequest.mcFileUrl && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-[16px] flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-[#7B0099]" />
                        <span className="text-[10px] font-black text-[#7B0099] uppercase tracking-widest">MC Attachment</span>
                      </div>
                      <a
                        href={`${API_BASE_URL}${selectedRequest.mcFileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] font-black uppercase tracking-widest bg-[#7B0099] text-white px-4 py-2 rounded-xl hover:bg-[#5e0080] transition-colors shadow-lg"
                      >
                        View File
                      </a>
                    </div>
                  )}

                  {/* Maklumat Waris Section */}
                  {ADMIN_VIEW_ROLES.includes(role) && (
                    <div className="pt-4 border-t border-border/50 space-y-4">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-rose-500" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Maklumat Waris (Kecemasan)</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-[20px]">
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-muted-foreground uppercase opacity-50">Nama</span>
                          <p className="text-[11px] font-bold truncate">{selectedRequest.warisNama}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-muted-foreground uppercase opacity-50">Hubungan</span>
                          <p className="text-[11px] font-bold truncate">{selectedRequest.warisHubungan}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-muted-foreground uppercase opacity-50">No. Telefon</span>
                          <p className="text-[11px] font-black text-[#7B0099]">{selectedRequest.warisPhone}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-muted-foreground uppercase opacity-50">Alamat</span>
                          <p className="text-[10px] font-bold text-muted-foreground break-words">{selectedRequest.warisAlamat}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Approval History Timeline */}
                  {selectedRequest.approvalHistory && selectedRequest.approvalHistory.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#7B0099]" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Approval History</h3>
                      </div>
                      <div className="relative space-y-4 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
                        {selectedRequest.approvalHistory.map((history, idx) => (
                          <div key={idx} className="relative flex items-start gap-4">
                            <div className={`absolute left-4 -translate-x-1/2 flex h-2 w-2 items-center justify-center rounded-full border border-white dark:border-slate-900 ${history.status === 'Approved' ? 'bg-emerald-500' : 'bg-rose-500'} z-10`} />
                            <div className="ml-6 flex-1 bg-muted/30 rounded-[16px] p-3 border border-border/40">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${history.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                    {history.status}
                                  </span>
                                  <span className="text-[10px] font-black text-foreground/70">
                                    by {history.approver_name || history.approver_id} ({formatApproverRole(history.approver_role, history.approver_department, history.approver_branch)})
                                  </span>
                                </div>
                                <span className="text-[8px] font-black text-muted-foreground/50">
                                  {new Date(history.created_at).toLocaleDateString('ms-MY')}
                                </span>
                              </div>
                              {history.remarks && (
                                <p className="text-[10px] italic text-muted-foreground bg-white/50 dark:bg-black/20 p-2 rounded-lg mt-1">
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
                      onClick={() => window.print()}
                    >
                      <Printer className="h-4 w-4" />
                      Print Form
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Remarks Dialog */}
      <Dialog open={remarksDialogOpen} onOpenChange={setRemarksDialogOpen}>
        <DialogContent className="sm:max-w-[425px] border-none shadow-2xl rounded-[32px] p-0 overflow-hidden">
          <div className={`p-6 text-white ${pendingAction?.action === 'approve' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-lg font-black tracking-tight">
                {pendingAction?.action === 'approve' ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
                {pendingAction?.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </DialogTitle>
              <DialogDescription className="text-white/80 font-bold uppercase text-[9px] tracking-widest">
                Action Required • Staff Registry
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="remarks" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Remarks / Comments (Optional)</label>
              <textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Type your feedback here..."
                className="w-full min-h-[120px] rounded-[20px] border-border/50 bg-muted/30 focus:border-[#7B0099] focus:ring-[#7B0099] text-sm p-4 transition-all"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button variant="ghost" className="rounded-xl font-black text-[10px] uppercase tracking-widest order-2 sm:order-1" onClick={() => setRemarksDialogOpen(false)}>Cancel</Button>
              <Button
                className={`rounded-xl font-black text-[10px] uppercase tracking-widest px-8 shadow-lg order-1 sm:order-2 ${pendingAction?.action === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                onClick={submitAction}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {pendingAction?.action === 'approve' ? 'Approve Now' : 'Reject Now'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
