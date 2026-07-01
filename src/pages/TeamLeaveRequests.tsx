import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, CalendarClock, CalendarX2, Building2, FileText, Printer, PhoneCall, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseCutiGantiRows, getCleanReason } from "@/lib/leaveStorage";

const formatDate = (value: string) => (value ? value.slice(0, 10) : "");

export default function TeamLeaveRequests() {
  const { role, userBranch, userDepartment } = useRole();
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  const formatRole = (r: string) => r.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  const getDisplayStatus = (status: string) => {
    switch (status) {
      case "Pending HOD":
        return "Awaiting HOD Approval";
      case "Pending Finance":
      case "Pending Finance Manager":
        return "Awaiting Finance Approval";
      case "Pending MD":
        return "Awaiting MD Approval";
      case "Pending Branch Leader":
        return "Awaiting Branch Leader Approval";
      default:
        return status;
    }
  };

  const formatApproverRole = (approverRole: string | undefined, approverDepartment: string | undefined, approverBranch: string | undefined) => {
    if (!approverRole) return "Admin";
    if (approverRole === "hr_admin") return "HR Admin";
    if (approverRole === "managing_director") return "Managing Director";
    if (approverRole === "finance_manager") return "Finance Manager";
    if (approverRole === "branch_leader") return `Branch Leader (${approverBranch || 'HQ'})`;
    if (approverRole === "head_of_department") return `HOD (${approverDepartment || 'General'})`;
    return formatRole(approverRole);
  };

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          role: role || "",
          branch: userBranch || "",
          department: userDepartment || "",
        });

        const response = await fetch(`${API_BASE_URL}/api/leave-requests?${params}`);
        const data = await response.json();

        if (data.success) {
          // If HOD, extra safe filter to ensure only same branch & department
          let filtered = data.leaveRequests;
          if (role === 'head_of_department') {
             filtered = filtered.filter((r: any) => r.department === userDepartment && r.branch === userBranch);
          }
          
          const formatted = filtered.map((request: any) => ({
            id: request.leave_id,
            employee: request.full_name || request.user_id,
            user_id: request.user_id,
            branch: request.branch || "HQ",
            department: request.department || "N/A",
            type: request.leave_type,
            from: formatDate(request.start_date),
            to: formatDate(request.end_date),
            days: Number(request.days || 0),
            reason: request.reason || "-",
            status: request.status || "Pending HOD",
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

          setLeaveRequests(formatted);
        }
      } catch (error) {
        console.error("Error fetching team leave requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [role, userBranch, userDepartment]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate metrics
  const pendingCount = leaveRequests.filter(r => r.status?.startsWith("Pending")).length;
  const approvedCount = leaveRequests.filter(r => r.status === "Approved").length;
  const rejectedCount = leaveRequests.filter(r => r.status === "Rejected").length;

  const filteredList = leaveRequests.filter(r => 
    (r.employee)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.user_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-end items-start md:items-center mb-6 gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-sm font-medium border-primary/20 bg-primary/5">
              <Building2 className="w-4 h-4 mr-2 text-primary" />
              {role === 'hr_admin' ? 'All Branches' : userBranch || 'HQ'}
            </Badge>
            {role === 'head_of_department' && (
              <Badge variant="outline" className="text-sm font-medium border-primary/20 bg-primary/5">
                <Users className="w-4 h-4 mr-2 text-primary" />
                {userDepartment || 'All Departments'}
              </Badge>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <CalendarClock className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                <h3 className="text-3xl font-bold mt-1 text-orange-600 dark:text-orange-400">{pendingCount}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CalendarClock className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved Leaves</p>
                <h3 className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">{approvedCount}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <CalendarX2 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected Leaves</p>
                <h3 className="text-3xl font-bold mt-1 text-red-600 dark:text-red-400">{rejectedCount}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg">Team Leave Requests Log</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No team leave requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredList.map((req) => (
                      <TableRow 
                        key={req.id} 
                        className="cursor-pointer hover:bg-muted/50" 
                        onClick={() => setSelectedRequest(req)}
                      >
                        <TableCell className="font-medium">
                          <div>{req.employee}</div>
                          <div className="text-xs text-muted-foreground">{req.user_id}</div>
                        </TableCell>
                        <TableCell>{req.type}</TableCell>
                        <TableCell>{req.from}</TableCell>
                        <TableCell>{req.to}</TableCell>
                        <TableCell>{req.days}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              req.status === "Approved" ? "default" : 
                              req.status === "Rejected" ? "destructive" : 
                              "default"
                            } 
                            className={
                              req.status === "Approved" ? "bg-green-500 hover:bg-green-600" : 
                              req.status === "Rejected" ? "" :
                              "bg-[#C2410C] hover:bg-[#A3370A] text-white border-none"
                            }
                            style={req.status !== "Approved" && req.status !== "Rejected" ? { backgroundColor: "#C2410C", color: "white" } : {}}
                          >
                            {getDisplayStatus(req.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>

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
                        {getDisplayStatus(selectedRequest.status)}
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
                              {rows.map((row: any, idx: number) => (
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

                  {/* Approval History Timeline */}
                  {selectedRequest.approvalHistory && selectedRequest.approvalHistory.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#7B0099]" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Approval History</h3>
                      </div>
                      <div className="relative space-y-4 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
                        {selectedRequest.approvalHistory.map((history: any, idx: number) => (
                          <div key={idx} className="relative flex items-start gap-4">
                            <div className={`absolute left-4 -translate-x-1/2 flex h-2 w-2 items-center justify-center rounded-full border border-white dark:border-slate-900 ${history.status === 'Approved' ? 'bg-emerald-500' : 'bg-rose-500'} z-10`} />
                            <div className="ml-6 flex-1 bg-muted/30 rounded-[16px] p-3 border border-border/40">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${history.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
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
    </div>
  );
}
