import { useEffect, useState } from "react";
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
import { Check, X, Users, MapPin, Info, Loader2, FileText, Printer, PhoneCall, Clock } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";

type LeaveRequest = {
  id: number;
  employee: string;
  branch: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "Pending HOD" | "Pending Finance" | "Pending MD" | "Approved" | "Rejected";
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

// Roles that can approve/reject leave requests
const APPROVER_ROLES = ["managing_director", "finance_manager", "head_of_department"];
// Roles that can see the leave admin panel (view + approve or view only)
const ADMIN_VIEW_ROLES = ["hr_admin", "branch_leader", ...APPROVER_ROLES];

export default function LeaveAdmin() {
  const { role, userBranch, userId } = useRole();
  const canApprove = APPROVER_ROLES.includes(role);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  
  // Remarks Modal State
  const [remarksDialogOpen, setRemarksDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{id: number, action: "approve" | "reject", status: string} | null>(null);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetchRequests();
  }, [role, userBranch]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        role,
        branch: userBranch || "",
      });

      const response = await fetch(`https://rayhar-staff-production.up.railway.app/api/leave-requests?${params}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch leave requests");
      }

      const formatted = data.leaveRequests.map((request: any) => ({
        id: request.leave_id,
        employee: request.full_name || request.employee_id,
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
      const response = await fetch(`https://rayhar-staff-production.up.railway.app/api/leave-requests/${id}/status`, {
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
      } else {
        toast.error("Application Rejected", { description: "Status updated accordingly." });
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Leave Approval Panel</h1>
          <p className="text-sm text-muted-foreground">
            {canApprove ? "Manage and review employee leave requests" : "View employee leave requests (View Only)"}
          </p>
        </div>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Applications</CardTitle>
            <Badge variant="outline" className="font-mono">
              {requests.filter((r) => r.status.startsWith("Pending")).length} Pending
            </Badge>
          </div>
          <CardDescription>Review details before making a decision.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto rounded-lg border">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] font-bold">
                  <tr>
                    <th className="px-4 py-4">Employee & Branch</th>
                    <th className="px-4 py-4">Leave Type</th>
                    <th className="px-4 py-4">Duration</th>
                    <th className="px-4 py-4">Reason</th>
                    <th className="px-4 py-4">Status</th>
                    {canApprove && <th className="px-4 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.length > 0 ? (
                    requests.map((req) => (
                      <tr key={req.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(req)}
                            className="font-semibold text-foreground hover:text-primary hover:underline text-left"
                          >
                            {req.employee}
                          </button>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3" /> {req.branch}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-medium text-primary">{req.type}</td>
                        <td className="px-4 py-4 text-xs font-mono">
                          {req.from} <br /> {req.to} <br />
                          <span className="text-foreground font-bold italic">({req.days} Days)</span>
                        </td>
                        <td className="px-4 py-4 max-w-[200px]">
                          <div className="flex items-start gap-2 text-muted-foreground italic text-xs">
                            <Info className="w-3 h-3 mt-0.5 shrink-0" />
                            "{req.reason}"
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            variant={
                              req.status === "Approved"
                                ? "default"
                                : req.status === "Rejected"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {req.status}
                          </Badge>
                        </td>
                        {canApprove && (
                          <td className="px-4 py-4 text-right">
                            {((req.status === "Pending HOD" && role === "head_of_department") ||
                              (req.status === "Pending Finance" && role === "finance_manager") ||
                              (req.status === "Pending MD" && role === "managing_director")) ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 border-green-200"
                                  onClick={() => handleAction(req.id, "approve", req.status)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 border-red-200"
                                  onClick={() => handleAction(req.id, "reject", req.status)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">
                                {req.status === "Approved" || req.status === "Rejected" ? "Processed" : "Waiting for other approver"}
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={canApprove ? 6 : 5} className="px-4 py-10 text-center text-sm font-medium text-muted-foreground">
                        No leave applications found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader className="print:hidden">
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Leave Application Form
                </DialogTitle>
                <DialogDescription>Submitted application details for HR review.</DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border p-6 space-y-6 bg-white shadow-sm">
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">RAYHAR GROUP</h2>
                  <p className="text-sm font-bold tracking-widest uppercase">Permohonan Cuti Kakitangan</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Nama Penuh</span>
                    <p className="font-semibold border-b pb-1 border-slate-100">{selectedRequest.employee}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Cawangan</span>
                    <p className="font-semibold border-b pb-1 border-slate-100">{selectedRequest.branch}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Jenis Cuti</span>
                    <p className="font-semibold border-b pb-1 border-slate-100">{selectedRequest.type}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Status</span>
                    <p className={`font-bold border-b pb-1 border-slate-100 uppercase ${selectedRequest.status === "Rejected" ? "text-red-600" : "text-primary"}`}>
                      {selectedRequest.status}
                      {selectedRequest.status === "Rejected" && selectedRequest.approverRole && (
                        <span className="block text-[10px] text-red-500 mt-0.5">
                          (by: {formatRole(selectedRequest.approverRole)})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm border rounded-xl p-4 bg-muted/20">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Tarikh Mula</p>
                    <p className="font-bold text-base">{selectedRequest.from}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Tarikh Akhir</p>
                    <p className="font-bold text-base">{selectedRequest.to}</p>
                  </div>
                  <div className="text-center bg-white rounded-lg border flex flex-col justify-center py-1">
                    <p className="text-[10px] uppercase font-bold text-primary">Bilangan Hari</p>
                    <p className="font-black text-lg text-primary">{selectedRequest.days} Hari</p>
                  </div>
                </div>

                <div className="text-sm">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Tujuan / Sebab Cuti</p>
                  <p className="rounded-lg border p-3 italic text-slate-700 bg-slate-50/50">
                    "{selectedRequest.reason || "-"}"
                  </p>
                </div>

                {/* Conditional Fields: Cuti Ganti */}
                {selectedRequest.type === "Cuti Ganti" && (
                  <div className="grid grid-cols-3 gap-4 text-sm border rounded-xl p-4 bg-blue-50/50 border-blue-100">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-blue-600">Tarikh Cuti</p>
                      <p className="font-bold text-base text-slate-900">{selectedRequest.cutiGantiTarikh || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-blue-600">Tarikh/Hari Cuti Ganti</p>
                      <p className="font-bold text-base text-slate-900">{selectedRequest.cutiGantiHari || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-blue-600">Jam Ganti</p>
                      <p className="font-bold text-base text-slate-900">{selectedRequest.cutiGantiJam || 0} Jam</p>
                    </div>
                  </div>
                )}

                {/* Conditional Fields: Cuti Tanpa Gaji */}
                {selectedRequest.type === "Cuti Tanpa Gaji" && (
                  <div className="grid grid-cols-2 gap-4 text-sm border rounded-xl p-4 bg-rose-50/50 border-rose-100">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-rose-600">No. Tel H/P</p>
                      <p className="font-bold text-base text-slate-900">{selectedRequest.cutiTanpaGajiPhone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-rose-600">Tandatangan Pengesahan</p>
                      <p className="font-bold text-base text-slate-900">
                        {selectedRequest.cutiTanpaGajiSignature ? "✓ Disahkan" : "Tiada Pengesahan"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Conditional Fields: Cuti Sakit (MC) */}
                {selectedRequest.type === "Cuti Sakit" && selectedRequest.mcFileUrl && (
                  <div className="text-sm p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-purple-600 mb-2">Lampiran MC</p>
                    <a href={`https://rayhar-staff-production.up.railway.app${selectedRequest.mcFileUrl}`} target="_blank" rel="noopener noreferrer" className="text-purple-700 underline font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      View MC Attachment
                    </a>
                  </div>
                )}

                {/* Maklumat Waris Section */}
                {ADMIN_VIEW_ROLES.includes(role) && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <PhoneCall className="w-4 h-4 text-red-600" />
                      <h3 className="text-sm font-black uppercase tracking-tight">Maklumat Waris (Kecemasan)</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Nama Waris</label>
                        <p className="text-sm font-semibold text-slate-900 border-b border-dotted pb-1">
                          {selectedRequest.warisNama}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Hubungan</label>
                        <p className="text-sm font-semibold text-slate-900 border-b border-dotted pb-1">
                          {selectedRequest.warisHubungan}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">No. Telefon</label>
                        <p className="text-sm font-bold text-primary border-b border-dotted pb-1">
                          {selectedRequest.warisPhone}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Alamat Waris</label>
                        <p className="text-xs leading-relaxed text-slate-700 border-b border-dotted pb-1">
                          {selectedRequest.warisAlamat}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Approval History Timeline */}
                {selectedRequest.approvalHistory && selectedRequest.approvalHistory.length > 0 && (
                  <div className="space-y-4 pt-4 border-t print:hidden">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#601b8a]" />
                      <h3 className="text-sm font-black uppercase tracking-tight">Approval History</h3>
                    </div>
                    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                      {selectedRequest.approvalHistory.map((history, idx) => (
                        <div key={idx} className="relative flex items-start gap-4 group">
                          <div className={`absolute left-5 -translate-x-1/2 flex h-3 w-3 items-center justify-center rounded-full border-2 bg-white ${history.status === 'Approved' ? 'border-emerald-500' : 'border-rose-500'} z-10`} />
                          <div className="ml-8 flex-1 bg-slate-50/50 rounded-2xl p-4 border border-slate-100 hover:border-[#601b8a]/20 transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${history.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {history.status}
                                </span>
                                <span className="text-xs font-bold text-slate-700">by {history.approver_name || history.approver_id}</span>
                                <Badge variant="outline" className="text-[9px] uppercase font-bold text-slate-400 border-slate-200">
                                  {formatRole(history.approver_role)}
                                </Badge>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">
                                {new Date(history.created_at).toLocaleString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {history.remarks && (
                              <p className="text-xs italic text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-100/50">
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
                  <div className="border-t border-slate-900 pt-2 text-center">
                    <p className="text-[10px] font-bold uppercase">Tandatangan Kakitangan</p>
                  </div>
                  <div className="border-t border-slate-900 pt-2 text-center">
                    <p className="text-[10px] font-bold uppercase">Kelulusan Pengurus / HR</p>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 print:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 border-primary text-primary hover:bg-primary/5"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4" />
                    Print Form
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Remarks Dialog */}
      <Dialog open={remarksDialogOpen} onOpenChange={setRemarksDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingAction?.action === 'approve' ? <Check className="w-5 h-5 text-emerald-500" /> : <X className="w-5 h-5 text-rose-500" />}
              {pendingAction?.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.action === 'approve' 
                ? 'Are you sure you want to approve this request? It will be routed to the next stage.' 
                : 'Please provide a reason for rejecting this leave request.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="remarks" className="text-xs font-bold uppercase text-slate-400">Remarks / Comments (Optional)</label>
              <textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Type your remarks here..."
                className="w-full min-h-[100px] rounded-xl border-slate-200 focus:border-[#601b8a] focus:ring-[#601b8a] text-sm p-3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRemarksDialogOpen(false)}>Cancel</Button>
            <Button 
              className={pendingAction?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
              onClick={submitAction}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {pendingAction?.action === 'approve' ? 'Approve Request' : 'Reject Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}