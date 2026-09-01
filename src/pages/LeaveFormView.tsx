import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ApprovalHistoryTimeline } from "@/components/leave/ApprovalHistoryTimeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Printer, Loader2, ArrowLeft, PhoneCall, Eye, Calendar, MapPin, Clock, Check, X, Download } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";

import PageActions from "@/components/layout/PageActions";
import { API_BASE_URL } from "../config/api";
import {
  getLeaveFormFileName,
  leaveTypeLabels,
  type LeaveType,
  parseCutiGantiRows,
  getCleanReason,
} from "@/lib/leaveStorage";

const getDisplayStatus = (status: string) => {
  switch (status) {
    case "Pending HOD":
      return "Awaiting HOD Approval";
    case "Pending Operation":
    case "Pending Operation Manager":
    case "Pending Finance":
    case "Pending Finance Manager":
      return "Awaiting Operation Manager Approval";
    case "Pending MD":
      return "Awaiting MD Approval";
    case "Pending Branch Leader":
      return "Awaiting Branch Leader Approval";
    default:
      return status;
  }
};

type LeaveForm = {
  id: number;
  employee: string;
  branch: string;
  phone?: string;
  type: LeaveType;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "Pending HOD" | "Pending Branch Leader" | "Pending Operation Manager" | "Pending Finance" | "Pending MD" | "Approved" | "Rejected" | string;
  appliedAt: string;
  formFileName: string;
  warisNama: string;
  warisPhone: string;
  warisAlamat: string;
  warisHubungan: string;
  approverRole?: string;
  cutiGantiTarikh?: string;
  cutiGantiHari?: string;
  cutiGantiJam?: number;
  balance?: number;
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
  if (!role) return "APPROVER";
  const map: Record<string, string> = {
    branch_leader: "BRANCH LEADER",
    managing_director: "MANAGING DIRECTOR",
    operation_manager: "OPERATION MANAGER",
    finance_manager: "OPERATION MANAGER",
    head_of_department: "HEAD OF DEPARTMENT",
    hr_admin: "HR ADMIN",
    branch_officer: "BRANCH OFFICER",
    employee: "EMPLOYEE",
  };
  const key = role.toLowerCase().trim();
  return map[key] || role.replace(/_/g, ' ').toUpperCase();
};

const formatApproverRole = (role: string, department?: string, branch?: string) => {
  if (!role) return "APPROVER";
  const normalized = role.toLowerCase().trim();
  if (normalized === "head_of_department") {
    return `HEAD OF DEPARTMENT (${department || "N/A"})`;
  }
  if (normalized === "branch_leader") {
    return `BRANCH LEADER (${branch || "N/A"})`;
  }
  if (normalized === "operation_manager" || normalized === "finance_manager") {
    return "OPERATION MANAGER";
  }
  if (normalized === "managing_director") {
    return "MANAGING DIRECTOR";
  }
  if (normalized === "hr_admin") {
    return "HR ADMIN";
  }
  return formatRole(role);
};

const statusVariant = (status: string) => {
  switch (status) {
    case "Approved": return "default" as const;
    case "Rejected": return "destructive" as const;
    default: return "secondary" as const;
  }
};

type FormTabFilter = "pending" | "approved" | "rejected" | "history";

export default function LeaveFormView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId, userName, userBranch } = useRole();
  const [forms, setForms] = useState<LeaveForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<LeaveForm | null>(null);
  const [activeTab, setActiveTab] = useState<FormTabFilter>("pending");

  // Filter forms based on active tab
  const filteredForms = forms.filter((form) => {
    switch (activeTab) {
      case "pending":
        return form.status.startsWith("Pending");
      case "approved":
        return form.status === "Approved";
      case "rejected":
        return form.status === "Rejected";
      case "history":
        return true; // Show all
    }
  });

  const pendingCount = forms.filter((f) => f.status.startsWith("Pending")).length;
  const approvedCount = forms.filter((f) => f.status === "Approved").length;
  const rejectedCount = forms.filter((f) => f.status === "Rejected").length;

  useEffect(() => {
    void fetchForms();
  }, [userId]);

  const fetchForms = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/leave-requests?userId=${encodeURIComponent(userId)}`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch leave forms");
      }

      const formatted = data.leaveRequests.map((request: any) => {
        const type = request.leave_type as LeaveType;
        const appliedAt = request.created_at || new Date().toISOString();

        return {
          id: request.leave_id,
          employee: request.full_name || userName,
          branch: request.branch || userBranch || "HQ",
          type,
          from: formatDate(request.start_date),
          to: formatDate(request.end_date),
          days: Number(request.days || 0),
          reason: request.reason || "-",
          status: request.status || "Pending HOD",
          appliedAt,
          formFileName: getLeaveFormFileName(appliedAt, type, request.full_name || userName),
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
          balance: request.balance !== undefined && request.balance !== null ? Number(request.balance) : (request.annual_leave_balance !== undefined ? Number(request.annual_leave_balance) : undefined),
          phone: request.phone || "N/A",
          approvalHistory: request.approval_history || [],
        };
      });

      setForms(formatted);
    } catch (error) {
      console.error("Leave forms fetch error:", error);
      toast.error("Unable to load leave forms", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-open a specific leave form when navigated with ?leaveId=xxx
  useEffect(() => {
    const leaveId = searchParams.get("leaveId");
    if (leaveId && forms.length > 0) {
      const match = forms.find((f) => f.id === Number(leaveId));
      if (match) {
        setSelectedForm(match);
        // Switch tab to match the status
        if (match.status === "Approved") {
          setActiveTab("approved");
        } else if (match.status === "Rejected") {
          setActiveTab("rejected");
        } else if (match.status.startsWith("Pending")) {
          setActiveTab("pending");
        }
      }
    }
  }, [searchParams, forms]);

  // Fetch leave balance for selected form if missing
  useEffect(() => {
    if (selectedForm && (selectedForm.balance === undefined || selectedForm.balance === null) && userId) {
      fetch(`${API_BASE_URL}/api/profiles/${encodeURIComponent(userId)}/leave-balance`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            const leaveType = selectedForm.type;
            let bal = data.data.annual?.balance ?? 0;
            if (["Sick Leave", "Medical Leave", "Cuti Sakit"].includes(leaveType)) {
              bal = data.data.medical?.balance ?? 0;
            } else if (["Replacement Leave", "Cuti Ganti"].includes(leaveType)) {
              bal = data.data.replacement?.balance ?? 0;
            }
            setSelectedForm((prev) => (prev ? { ...prev, balance: bal } : null));
          }
        })
        .catch((err) => console.error("Error fetching fallback leave balance:", err));
    }
  }, [selectedForm?.id, userId]);

  const handleExport = () => {
    if (filteredForms.length === 0) {
      toast.error("No records to export");
      return;
    }
    const headers = ["Leave Type", "From", "To", "Days", "Status", "Applied At"];
    const rows = filteredForms.map(f => [
      leaveTypeLabels[f.type] || f.type,
      f.from,
      f.to,
      f.days,
      getDisplayStatus(f.status),
      new Date(f.appliedAt).toLocaleDateString()
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leave_requests_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">

        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 gap-2 px-0 text-foreground hover:bg-transparent hover:text-[#7B0099] transition-colors touch-target no-global-hover"
            onClick={() => navigate("/leave")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Back to Leave Overview
            </span>
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleExport}
              className="gap-2 bg-card border border-border/50 text-foreground hover:bg-muted rounded-xl font-black text-[10px] uppercase tracking-widest px-4 shadow-sm transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
            <Button
              onClick={() => navigate("/leave/apply")}
              className="gap-2 bg-[#7B0099] text-white hover:bg-[#5e0080] rounded-xl font-black text-[10px] uppercase tracking-widest px-4 shadow-sm transition-all active:scale-95"
            >
              <FileText className="w-3.5 h-3.5" />
              New Application
            </Button>
          </div>
        </div>

      <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[24px] sm:rounded-[32px] overflow-hidden">
        <CardContent className="p-0">
          <div className="px-6 pt-6 border-b border-border/50 bg-muted/10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div className="flex gap-6 overflow-x-auto w-full sm:w-auto scrollbar-none">
              {([
                { key: "history" as FormTabFilter, label: "History", count: forms.length },
                { key: "pending" as FormTabFilter, label: "Pending", count: pendingCount },
                { key: "approved" as FormTabFilter, label: "Approved", count: approvedCount },
                { key: "rejected" as FormTabFilter, label: "Rejected", count: rejectedCount }
              ]).map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  onClick={() => setActiveTab(tab.key)}
                  className={`text-sm font-black uppercase tracking-widest pb-3 -mb-[1px] transition-colors border-b-[3px] whitespace-nowrap ${
                    activeTab === tab.key 
                      ? (tab.key === "history" ? "text-[#7B0099] border-[#7B0099]" :
                         tab.key === "pending" ? "text-amber-500 border-amber-500" :
                         tab.key === "approved" ? "text-emerald-500 border-emerald-500" :
                         "text-red-500 border-red-500")
                      : "text-foreground border-slate-200 dark:border-slate-700 hover:text-yellow-500 hover:border-yellow-500"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                      activeTab === tab.key 
                        ? (tab.key === "history" ? "bg-[#7B0099] text-white" :
                           tab.key === "pending" ? "bg-amber-500 text-white" :
                           tab.key === "approved" ? "bg-emerald-500 text-white" :
                           "bg-red-500 text-white")
                        : "bg-muted-foreground/20 text-foreground transition-colors group-hover:bg-yellow-500 group-hover:text-white"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            <div className="pb-3 flex items-center gap-3 w-full sm:w-auto justify-end">
              <Badge variant="outline" className="font-black text-[10px] px-3 py-1 bg-white/50 dark:bg-black/20 border-border/50 text-foreground">
                {filteredForms.length} {activeTab === "pending" ? "PENDING" : activeTab === "approved" ? "APPROVED" : activeTab === "rejected" ? "REJECTED" : "TOTAL"}
              </Badge>
            </div>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#7B0099]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground animate-pulse">Syncing History...</p>
            </div>
          ) : filteredForms.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="overflow-x-auto hidden sm:block">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="px-6 py-4 text-[10px]">Leave Type</TableHead>
                      <TableHead className="px-6 py-4 text-[10px]">From</TableHead>
                      <TableHead className="px-6 py-4 text-[10px]">To</TableHead>
                      <TableHead className="px-6 py-4 text-[10px] text-center">Days</TableHead>
                      <TableHead className="px-6 py-4 text-[10px] text-center">Status</TableHead>
                      <TableHead className="px-6 py-4 text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/50">
                    {filteredForms.map((form) => (
                      <TableRow 
                        key={form.id} 
                        className="hover:bg-[#7B0099]/5 transition-colors group cursor-pointer"
                        onClick={() => {
                          setSelectedForm(form);
                          if (form.status === "Approved") setActiveTab("approved");
                          else if (form.status === "Rejected") setActiveTab("rejected");
                          else if (form.status.startsWith("Pending")) setActiveTab("pending");
                        }}
                      >
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-black text-[#7B0099] dark:text-purple-400">{leaveTypeLabels[form.type]}</span>
                            <span className="text-[10px] font-bold text-foreground uppercase tracking-widest mt-0.5">{form.appliedAt.slice(0, 10)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-foreground font-bold">{form.from}</TableCell>
                        <TableCell className="px-6 py-4 text-foreground font-bold">{form.to}</TableCell>
                        <TableCell className="px-6 py-4 text-center font-black text-foreground">{form.days}</TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <Badge
                            className={`text-[10px] font-black px-2.5 py-1 h-auto shadow-sm whitespace-nowrap ${
                              form.status === "Approved" ? "bg-emerald-500 text-white hover:bg-emerald-600" :
                              form.status === "Rejected" ? "bg-rose-600 text-white hover:bg-rose-700" :
                              "bg-[#C2410C] text-white hover:bg-[#A3370A]"
                            }`}
                            style={form.status !== "Approved" && form.status !== "Rejected" ? { backgroundColor: "#C2410C", color: "white" } : {}}
                          >
                            {getDisplayStatus(form.status).toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground hover:text-[#7B0099] hover:bg-[#7B0099]/10">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-3 p-4 sm:hidden">
                {filteredForms.map((form) => (
                  <div
                    key={form.id}
                    className="group relative rounded-[20px] border border-border/50 bg-card/50 p-4 hover:bg-[#7B0099]/5 hover:border-[#7B0099]/30 transition-all duration-300 cursor-pointer touch-target"
                    onClick={() => {
                      setSelectedForm(form);
                      if (form.status === "Approved") setActiveTab("approved");
                      else if (form.status === "Rejected") setActiveTab("rejected");
                      else if (form.status.startsWith("Pending")) setActiveTab("pending");
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-[14px] bg-[#7B0099]/10 flex items-center justify-center text-[#7B0099] group-hover:scale-110 transition-transform duration-300 shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-black text-foreground truncate group-hover:text-[#7B0099] transition-colors">
                            {leaveTypeLabels[form.type]}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-foreground uppercase tracking-widest">
                            <span>{form.appliedAt.slice(0, 10)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-foreground mt-1 bg-muted/40 w-fit px-2 py-0.5 rounded-lg">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 opacity-50" />
                              {form.from} → {form.to}
                            </span>
                            <span className="text-foreground font-black">
                              {form.days} DAYS
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge
                          className={`text-[9px] font-black px-2 py-1 h-auto shadow-sm whitespace-nowrap ${
                            form.status === "Approved" ? "bg-emerald-500 text-white" :
                            form.status === "Rejected" ? "bg-rose-600 text-white" :
                            "bg-[#C2410C] text-white"
                          }`}
                          style={form.status !== "Approved" && form.status !== "Rejected" ? { backgroundColor: "#C2410C", color: "white" } : {}}
                        >
                          {getDisplayStatus(form.status).toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-20 text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 rounded-[32px] bg-muted/30 flex items-center justify-center border-2 border-dashed border-border/50 group hover:border-[#7B0099]/30 transition-colors">
                <FileText className="h-10 w-10 text-foreground/30 group-hover:text-[#7B0099]/30 transition-colors" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-foreground uppercase tracking-widest">
                  {activeTab === "pending" ? "No Pending Applications" : activeTab === "approved" ? "No Approved Applications" : activeTab === "rejected" ? "No Rejected Applications" : "No Leave Registry Found"}
                </p>
                <p className="text-[10px] font-medium text-foreground italic">
                  {activeTab === "pending" ? "All your applications have been processed" : activeTab === "approved" ? "No applications approved yet" : activeTab === "rejected" ? "No applications rejected" : "You haven't submitted any leave applications yet"}
                </p>
              </div>
              {activeTab === "history" && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/leave/apply")}
                  className="mt-2 rounded-xl border-[#7B0099] text-[#7B0099] hover:bg-[#7B0099]/5 font-black text-[10px] uppercase tracking-widest"
                >
                  Start New Application
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave Form Dialog (Print/PDF View) */}
      <Dialog open={!!selectedForm} onOpenChange={(open) => !open && setSelectedForm(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-none shadow-2xl rounded-[32px] p-0 safe-area-bottom">
          {selectedForm && (
            <>
              <div className="p-6 bg-gradient-to-br from-[#7B0099] to-[#a855f7] text-white print:hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-white text-xl font-black tracking-tight">
                    <FileText className="h-6 w-6" />
                    Leave Application Form
                  </DialogTitle>
                  <DialogDescription className="text-white/80 font-bold uppercase text-[10px] tracking-widest">
                    Your Personal Registry • ID: {selectedForm.id}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div id="leave-form-print" className="p-4 sm:p-8 print:p-2 space-y-6 print:space-y-2">
                <div className="rounded-[24px] border border-border/50 p-6 sm:p-8 print:p-4 space-y-6 print:space-y-3 bg-card shadow-sm print:shadow-none print:border-none">
                  <div className="text-center border-b-2 border-foreground/50 dark:border-purple-500/50 pb-4 print:pb-2">
                    <h2 className="text-3xl print:text-2xl font-black tracking-tighter text-foreground dark:text-purple-400">RAYHAR GROUP</h2>
                    <p className="text-[20px] print:text-[14px] font-black tracking-[0.3em] uppercase opacity-60 dark:text-purple-300">Permohonan Cuti Kakitangan</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">Nama Penuh</span>
                      <p className="border-b pb-1 border-border/40 break-words font-bold">{selectedForm.employee}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">Cawangan</span>
                      <p className="border-b pb-1 border-border/40">{selectedForm.branch}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">No. Telefon</span>
                      <p className="border-b pb-1 border-border/40 font-black text-[#7B0099]">{selectedForm.phone || (selectedForm as any).applicant_phone || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">Jenis Cuti</span>
                      <p className="border-b pb-1 border-border/40">{selectedForm.type}</p>
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">Status</span>
                      <p className={`font-black uppercase ${selectedForm.status === "Rejected" ? "text-rose-600" : "text-[#7B0099]"}`}>
                        {selectedForm.status}
                        {selectedForm.status === "Rejected" && selectedForm.approverRole && (
                          <span className="block text-[8px] text-rose-500 mt-0.5 opacity-60">
                            (by: {formatRole(selectedForm.approverRole)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className={`grid ${!(selectedForm.type === "Replacement Leave" || selectedForm.type === "Cuti Ganti") ? 'grid-cols-4' : 'grid-cols-3'} gap-3 p-4 bg-muted/30 rounded-[20px] border border-border/50`}>
                    <div className="text-center flex flex-col justify-center">
                      <p className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50 mb-1">Dari</p>
                      <p className="font-black text-xs sm:text-sm">{selectedForm.from}</p>
                    </div>
                    <div className="text-center flex flex-col justify-center border-l border-border/50">
                      <p className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50 mb-1">Hingga</p>
                      <p className="font-black text-xs sm:text-sm">{selectedForm.to}</p>
                    </div>
                    <div className="text-center bg-white dark:bg-slate-900 rounded-[14px] border border-border/50 py-1 shadow-sm flex flex-col justify-center">
                      <p className="text-[9px] uppercase font-black text-[#7B0099]">Hari</p>
                      <p className="font-black text-lg text-[#7B0099] leading-none mt-0.5">{selectedForm.days}</p>
                    </div>
                    {!(selectedForm.type === "Replacement Leave" || selectedForm.type === "Cuti Ganti") && (
                    <div className="text-center rounded-[14px] border-2 border-emerald-500 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-center py-1">
                      <p className="text-[9px] uppercase font-black text-emerald-600">Baki Layak</p>
                      <p className="font-black text-sm text-emerald-600 mt-0.5">
                        {selectedForm.balance ?? "-"} HARI
                      </p>
                    </div>
                    )}
                  </div>

                  {!(selectedForm.type === "Replacement Leave" || selectedForm.type === "Cuti Ganti") && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase text-slate-950 dark:text-slate-50 tracking-widest">Sebab / Tujuan</p>
                    <div className="rounded-[16px] border border-border/40 p-4 font-bold text-foreground bg-muted/10 text-sm leading-relaxed whitespace-pre-wrap break-words min-h-[50px] max-h-[100px] overflow-y-auto print:max-h-none print:overflow-visible print:p-2">
                      {getCleanReason(selectedForm.reason) || "-"}
                    </div>
                  </div>
                  )}

                   {/* Conditional Fields: Cuti Ganti */}
                  {(selectedForm.type === "Replacement Leave" || selectedForm.type === "Cuti Ganti") && (() => {
                    const rows = parseCutiGantiRows(
                      selectedForm.reason,
                      selectedForm.cutiGantiTarikh,
                      selectedForm.cutiGantiHari,
                      selectedForm.cutiGantiJam
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
                              {rows.map((row, idx) => {
                                let actualHours: number | null = null;
                                let hasCalculated = false;
                                if (selectedForm.replacementValidations && selectedForm.replacementValidations.length > 0) {
                                  const val = selectedForm.replacementValidations.find((v: any) => {
                                    const valDateStr = String(v.replacement_date).substring(0, 10);
                                    let rowDateStr = row.tarikhGanti;
                                    if (rowDateStr.includes("/")) {
                                       const parts = rowDateStr.split("/");
                                       if (parts.length === 3) {
                                          rowDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                                       }
                                    }
                                    return valDateStr === rowDateStr;
                                  });
                                  if (val) {
                                    if (val.validation_status === "Validated" || val.validation_status === "Failed" || val.validation_status === "Completed" || (val.actual_hours !== null && val.actual_hours > 0)) {
                                      actualHours = val.actual_hours;
                                      hasCalculated = true;
                                    }
                                  }
                                }
                                return (
                                <TableRow key={idx} className="hover:bg-blue-500/5">
                                  <TableCell className="py-2 px-4">{row.tarikhCuti || "-"}</TableCell>
                                  <TableCell className="py-2 px-4">{row.tarikhGanti || "-"}</TableCell>
                                  <TableCell className="py-2 px-4 whitespace-normal break-words max-w-[200px] text-[11px] text-blue-900/80 font-medium">{row.keterangan || "-"}</TableCell>
                                  <TableCell className="py-2 px-4 text-right">{hasCalculated ? `${actualHours} Jam` : "-- Jam"}</TableCell>
                                </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Conditional Fields: Cuti Tanpa Gaji */}
                  {(selectedForm.type === "Unpaid Leave" || selectedForm.type === "Cuti Tanpa Gaji") && (
                    <div className="grid grid-cols-2 gap-4 text-[10px] border rounded-[20px] p-4 bg-rose-500/5 border-rose-500/20">
                      <div>
                        <p className="uppercase font-black text-rose-600 opacity-60">No. Tel H/P</p>
                        <p className="font-black mt-0.5">{selectedForm.cutiTanpaGajiPhone || "-"}</p>
                      </div>
                      <div>
                        <p className="uppercase font-black text-rose-600 opacity-60">Tandatangan</p>
                        <p className="font-black mt-0.5 text-rose-700">
                          {selectedForm.cutiTanpaGajiSignature ? "✓ DISAHKAN" : "TIADA PENGESAHAN"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Conditional Fields: Cuti Sakit (MC) */}
                  {(selectedForm.type === "Sick Leave" || selectedForm.type === "Cuti Sakit") && selectedForm.mcFileUrl && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-[16px] flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-[#7B0099]" />
                        <span className="text-[10px] font-black text-[#7B0099] uppercase tracking-widest">MC Attachment</span>
                      </div>
                      <a
                        href={`${API_BASE_URL}${selectedForm.mcFileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] font-black uppercase tracking-widest bg-[#7B0099] text-white px-4 py-2 rounded-xl hover:bg-[#5e0080] transition-colors shadow-lg"
                      >
                        View File
                      </a>
                    </div>
                  )}

                  {/* Waris Section */}
                  <div className="pt-4 border-t border-border/50 space-y-4 print:space-y-2 print:pt-2">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-rose-500" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Maklumat Waris (Kecemasan)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 print:gap-2 bg-muted/20 p-4 print:p-2 rounded-[20px] print:rounded-none">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">Nama</span>
                        <p className="text-[11px] font-bold truncate">{selectedForm.warisNama}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">Hubungan</span>
                        <p className="text-[11px] font-bold truncate">{selectedForm.warisHubungan}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">No. Telefon</span>
                        <p className="text-[11px] font-black text-[#7B0099]">{selectedForm.warisPhone}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">Alamat</span>
                        <p className="text-[11px] font-bold break-words">{selectedForm.warisAlamat}</p>
                      </div>
                    </div>
                  </div>

                  {/* Approval History Timeline (Vertical Flow) */}
                  <div className="space-y-4 print:space-y-2 pt-4 print:pt-2 border-t border-border/50">
                    <ApprovalHistoryTimeline 
                      status={selectedForm.status} 
                      approverRole={selectedForm.approverRole || "HR Admin"} 
                      approvalHistory={selectedForm.approvalHistory}
                      branch={selectedForm.branch || "HQ"} 
                      pendingApproverName={selectedForm.pending_approver_name}
                    />
                    
                    {/* Render remarks below the timeline if they exist */}
                    {selectedForm.approvalHistory && selectedForm.approvalHistory.length > 0 && selectedForm.approvalHistory.some(h => h.remarks) && (
                      <div className="mt-4 space-y-2">
                        {selectedForm.approvalHistory.filter(h => h.remarks).map((history, idx) => (
                          <div key={idx} className="bg-muted/30 rounded-xl p-3 border border-border/40">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-black text-foreground/70">
                                Remark by {history.approver_name || history.approver_id}
                              </span>
                              <span className="text-[8px] font-black text-foreground/50">
                                {new Date(history.created_at).toLocaleDateString('ms-MY')}
                              </span>
                            </div>
                            <p className="text-[10px] italic text-foreground bg-white/50 dark:bg-black/20 p-2 rounded-lg mt-1">
                              "{history.remarks}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  

                  
                  <div className="hidden print:block pt-6 pb-2">
                    <div className="grid grid-cols-2 gap-16">
                      <div className="border-t border-foreground pt-2 text-center">
                        <p className="text-[10px] font-bold uppercase">Tandatangan Kakitangan</p>
                      </div>
                      <div className="border-t border-foreground pt-2 text-center">
                        <p className="text-[10px] font-bold uppercase">Kelulusan Pengurus / HR</p>
                      </div>
                    </div>
                    <p className="text-[9px] text-center italic mt-4 text-foreground">
                      Borang ini sah digunakan sebagai bukti rasmi cuti kakitangan setelah mendapat kelulusan pihak pengurusan.
                    </p>
                  </div>

                  <div className="pt-4 flex justify-end gap-3 print:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 border-[#7B0099] text-[#7B0099] hover:bg-[#7B0099]/5 rounded-xl font-black text-[10px] uppercase tracking-widest px-6"
                      onClick={() => {
                        const originalTitle = document.title;
                        const empName = selectedForm?.employee || (selectedForm as any)?.name || userName || "UNKNOWN";
                        const branchCode = selectedForm?.branch || userBranch || "HQ";
                        document.title = `LEAVE REQUEST ( ${empName.toUpperCase()} - ${branchCode.toUpperCase()} )`;
                        window.print();
                        setTimeout(() => { document.title = originalTitle; }, 500);
                      }}
                    >
                      <Printer className="h-4 w-4" />
                      Export to PDF
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
