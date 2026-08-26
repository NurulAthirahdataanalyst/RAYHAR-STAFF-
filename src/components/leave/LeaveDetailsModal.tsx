import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Printer, PhoneCall, Clock, Check, X } from "lucide-react";
import { parseCutiGantiRows, getCleanReason } from "@/lib/leaveStorage";
import { API_BASE_URL } from "@/config/api";

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

const ADMIN_VIEW_ROLES = ["hr_admin", "branch_leader", "managing_director", "operation_manager", "finance_manager", "head_of_department"];

interface LeaveDetailsModalProps {
  selectedRequest: any;
  onClose: () => void;
  role: string;
}

export function LeaveDetailsModal({ selectedRequest, onClose, role }: LeaveDetailsModalProps) {
  const [bakiLayak, setBakiLayak] = useState<number | string>('-');

  useEffect(() => {
    if (selectedRequest) {
      const typeUpper = (selectedRequest.type || "").toUpperCase();
      let reqBal: number | string | undefined = selectedRequest.balance;
      
      if (reqBal === undefined || reqBal === null) {
        if (['ANNUAL LEAVE', 'ANNUAL & EMERGENCY LEAVE', 'ANNUAL/EMERGENCY LEAVE', 'CUTI TAHUNAN'].includes(typeUpper)) {
          reqBal = selectedRequest.annual_leave_balance;
        } else if (['SICK LEAVE', 'MEDICAL LEAVE', 'CUTI SAKIT'].includes(typeUpper)) {
          reqBal = selectedRequest.medical_leave_balance;
        } else if (['REPLACEMENT LEAVE', 'CUTI GANTI'].includes(typeUpper)) {
          reqBal = selectedRequest.replacement_leave_balance;
        }
      }

      if (reqBal !== undefined && reqBal !== null) {
        setBakiLayak(reqBal);
      } else {
        setBakiLayak("-");
      }

      const userId = selectedRequest.userId || selectedRequest.user_id || "";
      if (userId) {
        fetch(`${API_BASE_URL}/api/profiles/${encodeURIComponent(userId)}/leave-balance`)
          .then(res => res.json())
          .then(data => {
            const balances = data.balances || (data.data ? {
              annual: data.data.annual?.balance,
              medical: data.data.medical?.balance,
              replacement: data.data.replacement?.balance
            } : null);

            if (balances) {
              let balanceToDisplay: string | number = "-";
              
              if (['ANNUAL LEAVE', 'ANNUAL & EMERGENCY LEAVE', 'ANNUAL/EMERGENCY LEAVE', 'CUTI TAHUNAN'].includes(typeUpper)) {
                balanceToDisplay = balances.annual ?? "-";
              } else if (['SICK LEAVE', 'MEDICAL LEAVE', 'CUTI SAKIT'].includes(typeUpper)) {
                balanceToDisplay = balances.medical ?? "-";
              } else if (['REPLACEMENT LEAVE', 'CUTI GANTI'].includes(typeUpper)) {
                balanceToDisplay = balances.replacement ?? "-";
              } else {
                balanceToDisplay = balances.annual ?? "-";
              }
              
              setBakiLayak(balanceToDisplay);
            }
          })
          .catch(err => console.error("Error fetching balance:", err));
      }
    }
  }, [selectedRequest]);

  return (
    <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && onClose()}>
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
                    <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">Nama Penuh</span>
                    <p className="border-b pb-1 border-border/40 truncate">{selectedRequest.employee}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">Cawangan</span>
                    <p className="border-b pb-1 border-border/40">{selectedRequest.branch}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">Jenis Cuti</span>
                    <p className="border-b pb-1 border-border/40">{selectedRequest.type}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">Status</span>
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

                <div className="grid grid-cols-4 gap-3 p-4 bg-muted/30 rounded-[20px] border border-border/50">
                  <div className="text-center flex flex-col justify-center">
                    <p className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50 mb-1">Dari</p>
                    <p className="font-black text-xs sm:text-sm">{selectedRequest.from}</p>
                  </div>
                  <div className="text-center flex flex-col justify-center border-l border-border/50">
                    <p className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50 mb-1">Hingga</p>
                    <p className="font-black text-xs sm:text-sm">{selectedRequest.to}</p>
                  </div>
                  <div className="text-center bg-white dark:bg-slate-900 rounded-[14px] border border-border/50 py-1 shadow-sm flex flex-col justify-center">
                    <p className="text-[9px] uppercase font-black text-[#7B0099]">Hari</p>
                    <p className="font-black text-lg text-[#7B0099] leading-none mt-0.5">{selectedRequest.days}</p>
                  </div>
                  <div className="text-center rounded-[14px] border-2 border-emerald-500 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-center py-1">
                    <p className="text-[9px] uppercase font-black text-emerald-600">Baki Layak</p>
                    <p className="font-black text-sm text-emerald-600 mt-0.5">
                      {bakiLayak} HARI
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase text-slate-950 dark:text-slate-50 tracking-widest">Sebab / Tujuan</p>
                  <p className="rounded-[16px] border border-border/40 p-4 font-bold text-foreground bg-muted/10 text-sm leading-relaxed whitespace-pre-wrap">
                    {getCleanReason(selectedRequest.reason) || "-"}
                  </p>
                </div>

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
                              <TableHead className="py-2.5 px-4 text-[10px]">Tarikh Cuti</TableHead>
                              <TableHead className="py-2.5 px-4 text-[10px]">Tarikh/Hari Cuti Ganti</TableHead>
                              <TableHead className="py-2.5 px-4 text-[10px]">Keterangan / Tugasan</TableHead>
                              <TableHead className="py-2.5 px-4 text-[10px] text-right">Jam Bekerja</TableHead>
                              <TableHead className="py-2.5 px-4 text-[10px] text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-blue-500/10 font-bold text-foreground/80">
                            {rows.map((row, idx) => {
                              const validation = selectedRequest.replacementValidations?.find(
                                (v: any) => {
                                  const repDate = new Date(v.replacement_date).toISOString().split('T')[0];
                                  return repDate === row.tarikhGanti;
                                }
                              );
                              
                              let statusBadge = null;
                              if (validation) {
                                if (validation.validation_status === 'Pending') {
                                  statusBadge = <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
                                } else if (validation.validation_status === 'Validated') {
                                  statusBadge = <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Validated</Badge>;
                                } else {
                                  statusBadge = <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
                                }
                              } else {
                                statusBadge = <Badge variant="outline" className="opacity-50">N/A</Badge>;
                              }

                              return (
                                <TableRow key={idx} className="hover:bg-blue-500/5">
                                  <TableCell className="py-2 px-4">{row.tarikhCuti || "-"}</TableCell>
                                  <TableCell className="py-2 px-4">{row.tarikhGanti || "-"}</TableCell>
                                  <TableCell className="py-2 px-4 whitespace-normal break-words max-w-[200px] text-[11px] text-blue-900/80 font-medium">{row.keterangan || "-"}</TableCell>
                                  <TableCell className="py-2 px-4 text-right">
                                    {validation?.actual_hours !== undefined && validation.actual_hours !== null ? (
                                      <span className="font-bold text-blue-600">{Number(validation.actual_hours).toFixed(1)} / {row.jamGanti || 4} Jam</span>
                                    ) : (
                                      <span>{row.jamGanti || 0} Jam</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-2 px-4 text-center">
                                    {statusBadge}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })()}

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

                {ADMIN_VIEW_ROLES.includes(role) && (
                  <div className="pt-4 border-t border-border/50 space-y-4">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-rose-500" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Maklumat Waris (Kecemasan)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-[20px]">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">Nama</span>
                        <p className="text-[11px] font-bold truncate">{selectedRequest.warisNama}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">Hubungan</span>
                        <p className="text-[11px] font-bold truncate">{selectedRequest.warisHubungan}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">No. Telefon</span>
                        <p className="text-[11px] font-black text-[#7B0099]">{selectedRequest.warisPhone}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">Alamat</span>
                        <p className="text-[11px] font-bold break-words">{selectedRequest.warisAlamat}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedRequest.approvalHistory && selectedRequest.approvalHistory.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#7B0099]" />
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-[#7B0099]">Approval History</h3>
                    </div>

                    <div className="relative space-y-4 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
                      {selectedRequest.approvalHistory?.map((history: any, idx: number) => {
                        const isLast = idx === selectedRequest.approvalHistory.length - 1;
                        const hStatus = (selectedRequest.status === 'Rejected' && isLast) ? 'Rejected' : history.status;
                        return (
                          <div key={idx} className="relative flex items-start gap-4">
                            {hStatus === 'Approved' ? (
                              <div className="flex items-center justify-center w-6 h-6 rounded-full border-[3px] border-emerald-600 bg-white dark:bg-slate-900 shadow-sm z-10 -ml-1">
                                <Check className="w-4 h-4 text-emerald-600" strokeWidth={4} />
                              </div>
                            ) : hStatus === 'Rejected' ? (
                              <div className="flex items-center justify-center w-6 h-6 rounded-full border-[3px] border-rose-600 bg-white dark:bg-slate-900 shadow-sm z-10 -ml-1">
                                <X className="w-4 h-4 text-rose-600" strokeWidth={4} />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center w-6 h-6 rounded-full border-[3px] border-[#7B0099] bg-white dark:bg-slate-900 shadow-sm z-10 -ml-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#7B0099]" />
                              </div>
                            )}
                            <div className="ml-4 flex-1 bg-muted/30 rounded-[16px] p-3 border border-border/40">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${hStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' : hStatus === 'Rejected' ? 'bg-rose-500/10 text-rose-600' : 'bg-[#7B0099]/10 text-[#7B0099]'}`}>
                                    {hStatus}
                                  </span>
                                  <span className="text-[10px] font-black text-foreground/70">
                                    by {history.approver_name || history.approver_id} ({formatApproverRole(history.approver_role, history.approver_department, history.approver_branch)})
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
                        );
                      })}
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
                      const empName = selectedRequest.employee || selectedRequest.name || "UNKNOWN";
                      const branch = selectedRequest.branch || selectedRequest.branch_code || "HQ";
                      document.title = `LEAVE REQUEST ( ${empName.toUpperCase()} - ${branch.toUpperCase()} )`;
                      window.print();
                      setTimeout(() => { document.title = originalTitle; }, 500);
                    }}
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
  );
}

