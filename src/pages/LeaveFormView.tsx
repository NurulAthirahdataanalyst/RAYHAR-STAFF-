import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FileText, Printer, Loader2, ArrowLeft, PhoneCall, Eye, Calendar, MapPin } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import {
  getLeaveFormFileName,
  leaveTypeLabels,
  type LeaveType,
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
  status: "Pending HOD" | "Pending Finance" | "Pending MD" | "Approved" | "Rejected";
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

export default function LeaveFormView() {
  const navigate = useNavigate();
  const { userId, userName, userBranch } = useRole();
  const [forms, setForms] = useState<LeaveForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<LeaveForm | null>(null);

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
        `http://localhost:5000/api/leave-requests?userId=${encodeURIComponent(userId)}`
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
          formFileName: getLeaveFormFileName(appliedAt, type),
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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">
              Leave Form Application
            </h1>
            <p className="text-sm text-muted-foreground">
              View and print your submitted leave application forms
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/leave/apply")}
          className="gap-2 bg-[#601b8a] text-white hover:bg-[#4b1470] hover:text-white"
        >
          <FileText className="w-4 h-4" />
          New Application
        </Button>
      </div>

      {/* Form Cards */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">My Submitted Forms</CardTitle>
            <Badge variant="outline" className="font-mono">
              {forms.length} Total
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : forms.length > 0 ? (
            <div className="space-y-3">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="group rounded-2xl border border-border/60 bg-white/80 p-5 shadow-sm hover:shadow-md hover:border-[#601b8a]/30 transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedForm(form)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedForm(form);
                    }
                  }}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="rounded-xl bg-purple-50 p-3 text-[#601b8a] group-hover:bg-[#601b8a] group-hover:text-white transition-colors duration-300">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground group-hover:text-[#601b8a] transition-colors">
                          {form.formFileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {leaveTypeLabels[form.type]} • Submitted on {form.appliedAt.slice(0, 10)}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {form.from} → {form.to}
                          </span>
                          <span className="font-bold text-foreground">
                            {form.days} {form.days === 1 ? "Day" : "Days"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant={statusVariant(form.status)}
                        className="text-[10px] font-semibold"
                      >
                        {form.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-[#601b8a] opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedForm(form);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <div className="bg-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-[#601b8a]/50" />
              </div>
              <p className="text-sm font-bold text-muted-foreground">
                No leave forms submitted yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "New Application" to submit your first leave request.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave Form Dialog (Print/PDF View) */}
      <Dialog open={!!selectedForm} onOpenChange={(open) => !open && setSelectedForm(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedForm && (
            <>
              <DialogHeader className="print:hidden">
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Leave Application Form
                </DialogTitle>
                <DialogDescription>
                  Your submitted leave application. You can print or save as PDF.
                </DialogDescription>
              </DialogHeader>

              <div id="leave-form-print" className="rounded-lg border p-6 space-y-6 bg-white shadow-sm">
                {/* Company Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    RAYHAR GROUP
                  </h2>
                  <p className="text-sm font-bold tracking-widest uppercase">
                    Permohonan Cuti Kakitangan
                  </p>
                </div>

                {/* Employee Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Nama Penuh
                    </span>
                    <p className="font-semibold border-b pb-1 border-slate-100">
                      {selectedForm.employee}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Cawangan
                    </span>
                    <p className="font-semibold border-b pb-1 border-slate-100">
                      {selectedForm.branch}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Jenis Cuti
                    </span>
                    <p className="font-semibold border-b pb-1 border-slate-100">
                      {selectedForm.type}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Status Permohonan
                    </span>
                    <p className={`font-bold border-b pb-1 border-slate-100 uppercase ${selectedForm.status === "Rejected" ? "text-red-600" : "text-primary"}`}>
                      {selectedForm.status}
                      {selectedForm.status === "Rejected" && selectedForm.approverRole && (
                        <span className="block text-[10px] text-red-500 mt-0.5">
                          (by: {formatRole(selectedForm.approverRole)})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Tarikh Permohonan
                    </span>
                    <p className="font-semibold border-b pb-1 border-slate-100">
                      {selectedForm.appliedAt.slice(0, 10)}
                    </p>
                  </div>
                </div>

                {/* Date Duration */}
                <div className="grid grid-cols-3 gap-4 text-sm border rounded-xl p-4 bg-muted/20">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">
                      Tarikh Mula
                    </p>
                    <p className="font-bold text-base">{selectedForm.from}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">
                      Tarikh Akhir
                    </p>
                    <p className="font-bold text-base">{selectedForm.to}</p>
                  </div>
                  <div className="text-center bg-white rounded-lg border flex flex-col justify-center py-1">
                    <p className="text-[10px] uppercase font-bold text-primary">
                      Bilangan Hari
                    </p>
                    <p className="font-black text-lg text-primary">
                      {selectedForm.days} Hari
                    </p>
                  </div>
                </div>

                {/* Reason */}
                <div className="text-sm">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Tujuan / Sebab Cuti
                  </p>
                  <p className="rounded-lg border p-3 italic text-slate-700 bg-slate-50/50">
                    "{selectedForm.reason || "-"}"
                  </p>
                </div>

                {/* Conditional Fields: Cuti Ganti */}
                {selectedForm.type === "Cuti Ganti" && (
                  <div className="grid grid-cols-3 gap-4 text-sm border rounded-xl p-4 bg-blue-50/50 border-blue-100">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-blue-600">Tarikh Cuti</p>
                      <p className="font-bold text-base text-slate-900">{selectedForm.cutiGantiTarikh || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-blue-600">Tarikh/Hari Cuti Ganti</p>
                      <p className="font-bold text-base text-slate-900">{selectedForm.cutiGantiHari || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-blue-600">Jam Ganti</p>
                      <p className="font-bold text-base text-slate-900">{selectedForm.cutiGantiJam || 0} Jam</p>
                    </div>
                  </div>
                )}

                {/* Conditional Fields: Cuti Tanpa Gaji */}
                {selectedForm.type === "Cuti Tanpa Gaji" && (
                  <div className="grid grid-cols-2 gap-4 text-sm border rounded-xl p-4 bg-rose-50/50 border-rose-100">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-rose-600">No. Tel H/P</p>
                      <p className="font-bold text-base text-slate-900">{selectedForm.cutiTanpaGajiPhone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-rose-600">Tandatangan Pengesahan</p>
                      <p className="font-bold text-base text-slate-900">
                        {selectedForm.cutiTanpaGajiSignature ? "✓ Disahkan" : "Tiada Pengesahan"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Conditional Fields: Cuti Sakit (MC) */}
                {selectedForm.type === "Cuti Sakit" && selectedForm.mcFileUrl && (
                  <div className="text-sm p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-purple-600 mb-2">Lampiran MC</p>
                    <a href={`http://localhost:5000${selectedForm.mcFileUrl}`} target="_blank" rel="noopener noreferrer" className="text-purple-700 underline font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      View MC Attachment
                    </a>
                  </div>
                )}

                {/* Waris Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <PhoneCall className="w-4 h-4 text-red-600" />
                    <h3 className="text-sm font-black uppercase tracking-tight">
                      Maklumat Waris (Kecemasan)
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Nama Waris
                      </label>
                      <p className="text-sm font-semibold text-slate-900 border-b border-dotted pb-1">
                        {selectedForm.warisNama}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Hubungan
                      </label>
                      <p className="text-sm font-semibold text-slate-900 border-b border-dotted pb-1">
                        {selectedForm.warisHubungan}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        No. Telefon
                      </label>
                      <p className="text-sm font-semibold text-slate-900 border-b border-dotted pb-1">
                        {selectedForm.warisPhone}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Alamat Waris
                      </label>
                      <p className="text-sm font-semibold text-slate-900 border-b border-dotted pb-1">
                        {selectedForm.warisAlamat}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signature section (visible on print only) */}
                <div className="hidden print:grid grid-cols-2 gap-16 pt-12 pb-4">
                  <div className="border-t border-slate-900 pt-2 text-center">
                    <p className="text-[10px] font-bold uppercase">
                      Tandatangan Kakitangan
                    </p>
                  </div>
                  <div className="border-t border-slate-900 pt-2 text-center">
                    <p className="text-[10px] font-bold uppercase">
                      Kelulusan Pengurus / HR
                    </p>
                  </div>
                </div>

                {/* Action buttons (hidden on print) */}
                <div className="pt-4 flex justify-end gap-3 print:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 text-muted-foreground"
                    onClick={() => setSelectedForm(null)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 border-primary text-primary hover:bg-primary/5"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4" />
                    Print / Save as PDF
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
