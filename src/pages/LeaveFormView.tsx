import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Printer, Loader2, ArrowLeft, PhoneCall, Eye, Calendar, MapPin, Clock } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { API_BASE_URL } from "../config/api";
import {
  getLeaveFormFileName,
  leaveTypeLabels,
  type LeaveType,
  parseCutiGantiRows,
  getCleanReason,
} from "@/lib/leaveStorage";

type LeaveForm = {
  id: number;
  employee: string;
  branch: string;
  type: LeaveType;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "Pending HOD" | "Pending Branch Leader" | "Pending Finance" | "Pending MD" | "Approved" | "Rejected" | string;
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
  }[];
};

const formatDate = (value: string) => (value ? value.slice(0, 10) : "");

const formatRole = (role: string) => {
  return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#7B0099]/10 dark:bg-[#7B0099]/20 rounded-xl text-[#7B0099] dark:text-purple-400">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-responsive-xl font-black text-foreground tracking-tight uppercase">My Leave Registry</h1>
            <p className="text-responsive-sm text-muted-foreground font-medium italic">
              Registry of your submitted leave application forms
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/leave/apply")}
          className="gap-2 bg-[#7B0099] text-white hover:bg-[#5e0080] rounded-xl font-black text-[10px] uppercase tracking-widest px-6 py-5 shadow-lg shadow-[#7B0099]/20 transition-all active:scale-95"
        >
          <FileText className="w-4 h-4" />
          New Application
        </Button>
      </div>

      {/* Form List */}
      <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[24px] sm:rounded-[32px] overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-0 px-4 sm:px-6">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg font-black text-foreground">Submitted Forms</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60">
                Track your leave application status
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-black text-[10px] px-3 py-1 bg-[#7B0099]/10 text-[#7B0099] border-none">
              {filteredForms.length} {activeTab === "pending" ? "PENDING" : activeTab === "approved" ? "APPROVED" : activeTab === "rejected" ? "REJECTED" : "TOTAL"}
            </Badge>
          </div>
          {/* Tab Navigation */}
          <div className="flex gap-0 border-b-0">
            {([
              { key: "pending" as FormTabFilter, label: "Pending", count: pendingCount },
              { key: "approved" as FormTabFilter, label: "Approved", count: approvedCount },
              { key: "rejected" as FormTabFilter, label: "Rejected", count: rejectedCount },
              { key: "history" as FormTabFilter, label: "History", count: forms.length },
            ]).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 sm:px-6 py-3 text-[11px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.key
                    ? "text-[#7B0099]"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full transition-colors duration-300 ${activeTab === tab.key
                      ? "bg-[#7B0099] text-white"
                      : "bg-muted text-muted-foreground"
                    }`}>
                    {tab.count}
                  </span>
                )}
                {/* Animated underline */}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-[#7B0099] rounded-full animate-in fade-in slide-in-from-bottom-1 duration-300" />
                )}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#7B0099]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Syncing History...</p>
            </div>
          ) : filteredForms.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {filteredForms.map((form) => (
                <div
                  key={form.id}
                  className="group relative rounded-[20px] border border-border/50 bg-card/50 p-4 sm:p-5 hover:bg-[#7B0099]/5 hover:border-[#7B0099]/30 transition-all duration-300 cursor-pointer touch-target"
                  onClick={() => setSelectedForm(form)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-2xl bg-[#7B0099]/10 flex items-center justify-center text-[#7B0099] group-hover:scale-110 transition-transform duration-300">
                        <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-black text-foreground truncate group-hover:text-[#7B0099] transition-colors">
                          {form.formFileName}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          <span className="text-[#7B0099]/80">{leaveTypeLabels[form.type]}</span>
                          <span className="opacity-30">•</span>
                          <span>{form.appliedAt.slice(0, 10)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground mt-1 bg-muted/40 w-fit px-2 py-0.5 rounded-lg">
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
                        className={`text-[10px] font-black px-2.5 py-1 h-auto shadow-sm whitespace-nowrap ${form.status === "Approved" ? "bg-emerald-500 text-white" :
                            form.status === "Rejected" ? "bg-rose-600 text-white" :
                              form.status === "Pending Finance" ? "bg-orange-500 text-white" :
                                form.status === "Pending MD" ? "bg-blue-600 text-white" :
                                  form.status === "Pending HOD" ? "bg-violet-500 text-white" :
                                    form.status === "Pending Branch Leader" ? "bg-violet-500 text-white" :
                                      "bg-amber-500 text-white"
                          }`}
                      >
                        {form.status.replace('Pending ', '').toUpperCase()}
                      </Badge>
                      <div className="p-1.5 rounded-full bg-[#7B0099]/5 text-[#7B0099] opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 rounded-[32px] bg-muted/30 flex items-center justify-center border-2 border-dashed border-border/50 group hover:border-[#7B0099]/30 transition-colors">
                <FileText className="h-10 w-10 text-muted-foreground/30 group-hover:text-[#7B0099]/30 transition-colors" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-foreground uppercase tracking-widest">
                  {activeTab === "pending" ? "No Pending Applications" : activeTab === "approved" ? "No Approved Applications" : activeTab === "rejected" ? "No Rejected Applications" : "No Leave Registry Found"}
                </p>
                <p className="text-[10px] font-medium text-muted-foreground italic">
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

              <div id="leave-form-print" className="p-4 sm:p-8 space-y-6">
                <div className="rounded-[24px] border border-border/50 p-6 sm:p-8 space-y-6 bg-card shadow-sm">
                  <div className="text-center border-b-2 border-foreground/50 dark:border-purple-500/50 pb-4">
                    <h2 className="text-3xl font-black tracking-tighter text-foreground dark:text-purple-400">RAYHAR GROUP</h2>
                    <p className="text-[20px] font-black tracking-[0.3em] uppercase opacity-60 dark:text-purple-300">Permohonan Cuti Kakitangan</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-muted-foreground opacity-50">Nama Penuh</span>
                      <p className="border-b pb-1 border-border/40 truncate">{selectedForm.employee}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-muted-foreground opacity-50">Cawangan</span>
                      <p className="border-b pb-1 border-border/40">{selectedForm.branch}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-muted-foreground opacity-50">Jenis Cuti</span>
                      <p className="border-b pb-1 border-border/40">{selectedForm.type}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-muted-foreground opacity-50">Status</span>
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

                  <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30 rounded-[20px] border border-border/50">
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-black text-muted-foreground opacity-50 mb-1">Dari</p>
                      <p className="font-black text-xs sm:text-sm">{selectedForm.from}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-black text-muted-foreground opacity-50 mb-1">Hingga</p>
                      <p className="font-black text-xs sm:text-sm">{selectedForm.to}</p>
                    </div>
                    <div className="text-center bg-white dark:bg-slate-900 rounded-[14px] border border-border/50 py-1 shadow-sm flex flex-col justify-center">
                      <p className="text-[9px] uppercase font-black text-[#7B0099]">Hari</p>
                      <p className="font-black text-lg text-[#7B0099] leading-none mt-0.5">{selectedForm.days}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest">Sebab / Tujuan</p>
                    <p className="rounded-[16px] border border-border/40 p-4 italic text-foreground/80 bg-muted/10 text-xs leading-relaxed">
                      "{getCleanReason(selectedForm.reason) || "-"}"
                    </p>
                  </div>

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
                          <table className="w-full text-left text-[10px]">
                            <thead>
                              <tr className="bg-blue-500/10 text-blue-700 font-black uppercase border-b border-blue-500/20">
                                <th className="py-2.5 px-4">Tarikh Cuti</th>
                                <th className="py-2.5 px-4">Tarikh/Hari Cuti Ganti</th>
                                <th className="py-2.5 px-4 text-right">Jam Bekerja</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-500/10 font-bold text-foreground/80">
                              {rows.map((row, idx) => (
                                <tr key={idx}>
                                  <td className="py-2 px-4">{row.tarikh || "-"}</td>
                                  <td className="py-2 px-4">{row.hari || "-"}</td>
                                  <td className="py-2 px-4 text-right">{row.jam || 0} Jam</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
                  <div className="pt-4 border-t border-border/50 space-y-4">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-rose-500" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Maklumat Waris (Kecemasan)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-[20px]">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-muted-foreground uppercase opacity-50">Nama</span>
                        <p className="text-[11px] font-bold truncate">{selectedForm.warisNama}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-muted-foreground uppercase opacity-50">Hubungan</span>
                        <p className="text-[11px] font-bold truncate">{selectedForm.warisHubungan}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-muted-foreground uppercase opacity-50">No. Telefon</span>
                        <p className="text-[11px] font-black text-[#7B0099]">{selectedForm.warisPhone}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-muted-foreground uppercase opacity-50">Alamat</span>
                        <p className="text-[10px] font-bold text-muted-foreground break-words">{selectedForm.warisAlamat}</p>
                      </div>
                    </div>
                  </div>

                  {/* Approval History Timeline */}
                  {selectedForm.approvalHistory && selectedForm.approvalHistory.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-border/50 print:hidden">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#7B0099]" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Approval History</h3>
                      </div>
                      <div className="relative space-y-4 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
                        {selectedForm.approvalHistory.map((history, idx) => (
                          <div key={idx} className="relative flex items-start gap-4">
                            <div className={`absolute left-4 -translate-x-1/2 flex h-2 w-2 items-center justify-center rounded-full border border-white dark:border-slate-900 ${history.status === 'Approved' ? 'bg-emerald-500' : 'bg-rose-500'} z-10`} />
                            <div className="ml-6 flex-1 bg-muted/30 rounded-[16px] p-3 border border-border/40">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${history.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                    {history.status}
                                  </span>
                                  <span className="text-[10px] font-black text-foreground/70">by {history.approver_name || history.approver_id}</span>
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
                      Print / Save as PDF
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
