import { sanitizeUrl, safeFileUrl, downloadUploadedFile, getMcAttachmentUrl, preloadImage, isPdfUrl } from '@/utils/security';
import { formatBranchName } from '@/utils/branchUtils';
import { useRole } from "@/contexts/RoleContext";
import { useCompany } from "@/modules/multi-company/contexts/CompanyContext";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, CalendarClock, CalendarX2, Building2, FileText, Printer, PhoneCall, Clock, X, Download, MessageSquare, User } from 'lucide-react';

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApprovalHistoryTimeline, LeaveStatusDecisionBy } from "@/components/leave/ApprovalHistoryTimeline";
import { LeaveDiscussionCard } from "@/components/leave/LeaveDiscussionCard";
import { parseCutiGantiRows, getCleanReason } from "@/lib/leaveStorage";
import { formatLeaveBalance, formatLeaveDays, formatNullableLeaveDays, getCompactSessionBadge, getLeaveSessionLabel } from "@/utils/leaveFormat";

const formatDate = (value: string) => (value ? value.slice(0, 10) : "");

const formatDisplayDate = (value?: string) => {
  if (!value) return "-";
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const formatPrintText = (value?: string | null) => {
  if (!value) return "-";
  const s = String(value).trim();
  if (!s) return "-";
  if (s === s.toUpperCase() && /[A-Z]/.test(s)) {
    return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s;
};

export default function TeamLeaveRequests() {
  const { role, scopeType, userId, userBranch, userDepartment } = useRole();
  const { activeCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [mcBlobUrl, setMcBlobUrl] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    if (selectedRequest?.mcFileUrl && !isPdfUrl(selectedRequest.mcFileUrl)) {
      const url = getMcAttachmentUrl(selectedRequest.mcFileUrl);
      const fallback = safeFileUrl(selectedRequest.mcFileUrl);
      if (url) {
        preloadImage(url, fallback).then((dataUrl) => {
          if (active && dataUrl) {
            setMcBlobUrl(dataUrl);
          }
        }).catch(() => {});
      }
    } else {
      setMcBlobUrl(null);
    }
    return () => {
      active = false;
    };
  }, [selectedRequest?.mcFileUrl]);

  const formatRole = (r: string) => {
    if (!r) return "APPROVER";
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
    const key = r.toLowerCase().trim();
    return map[key] || r.replace(/_/g, " ").toUpperCase();
  };

  const getDisplayStatus = (status: string, branch?: string, companyName?: string) => {
    const isRayRent = 
      (branch && branch.toUpperCase() === "RAYRENT") || 
      (companyName && companyName.toLowerCase().includes("rayrent"));

    const isRayharVacation = 
      (branch && branch.toUpperCase().includes("RV")) || 
      (companyName && companyName.toLowerCase().includes("vacation"));

    if (isRayRent && (status === "Pending MD" || status === "Pending Managing Director")) {
      return "Awaiting Branch Leader Approval";
    }

    if (isRayharVacation && (
      status === "Pending Travel Consultant" || 
      status === "Pending Travel Consultant Approval" || 
      status === "Pending MD" || 
      status === "Pending Managing Director" || 
      status === "Pending HOD"
    )) {
      return "Awaiting Administrative Assistant Approval";
    }

    switch (status) {
      case "Pending HOD":
      case "Pending Head of Department":
        return "Awaiting Head of Department Approval";
      case "Pending Operation":
      case "Pending Operation Manager":
      case "Pending Finance":
      case "Pending Finance Manager":
        return "Awaiting Operation Manager Approval";
      case "Pending MD":
      case "Pending Managing Director":
        return "Awaiting Managing Director Approval";
      case "Pending Branch Leader":
        return "Awaiting Branch Leader Approval";
      case "Pending Assure Leader":
      case "Pending Assure":
        return "Awaiting Assure Leader Approval";
      default:
        if (status && status.startsWith("Pending ")) {
          const rolePart = status.replace(/^Pending\s+/, "");
          return `Awaiting ${rolePart} Approval`;
        }
        return status;
    }
  };

  const formatApproverRole = (approverRole: string | undefined, approverDepartment: string | undefined, approverBranch: string | undefined) => {
    if (!approverRole) return "APPROVER";
    if (approverRole === "hr_admin") return "HR ADMIN";
    if (approverRole === "managing_director") return "MANAGING DIRECTOR";
    if (approverRole === "operation_manager" || approverRole === "finance_manager") return "OPERATION MANAGER";
    if (approverRole === "assure_leader" || approverRole?.toLowerCase()?.includes("assure")) return "ASSURE LEADER";
    if (approverRole === "branch_leader") return `BRANCH LEADER (${approverBranch || 'HQ'})`;
    if (approverRole === "head_of_department") return `HEAD OF DEPARTMENT (${approverDepartment || 'General'})`;
    return formatRole(approverRole);
  };

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const isAllCompanyAccess =
          ["hr_admin", "hr", "admin", "managing_director", "md", "operation_manager", "finance_manager", "assure_leader", "superadmin"].includes(
            String(role || "").toLowerCase().trim().replace(/\s+/g, "_")
          ) ||
          scopeType === "Parent Group Data" ||
          scopeType === "Company Staff Data";
        const params = new URLSearchParams({
          role: role || "",
          branch: isAllCompanyAccess ? "" : (userBranch || ""),
          department: isAllCompanyAccess ? "" : (userDepartment || ""),
          company_id: String(activeCompany?.id || 1),
          viewerId: userId || "",
          scope_type: scopeType || "",
        });

        const response = await fetch(`${API_BASE_URL}/api/leave-requests?${params}`, {
          headers: {
            'x-company-id': String(activeCompany?.id || 1)
          }
        });
        const data = await response.json();

        if (data.success) {
          // Filter by activeCompany
          const currentCompanyId = activeCompany?.id || 1;
          let filtered = (data.leaveRequests || []).filter((r: any) => {
            const bUpper = String(r.branch || "").toUpperCase();
            const cId = r.company_id || (bUpper.startsWith('RV') ? 3 : bUpper === 'RAYRENT' ? 2 : 1);
            return cId === currentCompanyId;
          });
          // If HOD, extra safe filter to ensure only same branch & department
          if (role === 'head_of_department') {
             filtered = filtered.filter((r: any) => r.department === userDepartment && r.branch === userBranch);
          }
          
          const formatted = filtered.map((request: any) => ({
            id: request.leave_id,
            employee: request.full_name || request.user_id,
            user_id: request.user_id,
            created_by: request.created_by || request.user_id,
            employee_id: request.employee_id || request.user_id,
            branch: request.branch || "HQ",
            company_name: request.company_name || (request.branch === "RAYRENT" ? "RayRent" : "Rayhar Travels"),
            department: request.department || "N/A",
            type: request.leave_type,
            from: formatDate(request.start_date),
            to: formatDate(request.end_date),
            days: Number(request.days || 0),
            leaveSession: request.leave_session,
            startSession: request.start_session,
            endSession: request.end_session,
            balance: request.balance !== undefined && request.balance !== null ? Number(request.balance) : (request.annual_leave_balance !== undefined ? Number(request.annual_leave_balance) : undefined),
            reason: request.reason || "-",
            status: request.status || "Pending HOD",
            warisNama: request.waris_nama || "N/A",
            warisPhone: request.waris_phone || "N/A",
            warisAlamat: request.waris_alamat || "N/A",
            warisHubungan: request.waris_hubungan || "N/A",
            approverRole: request.approver_role,
            pendingApproverName: request.pending_approver_name,
            cutiGantiTarikh: request.cuti_ganti_tarikh ? formatDate(request.cuti_ganti_tarikh) : undefined,
            cutiGantiHari: request.cuti_ganti_hari,
            cutiGantiJam: request.cuti_ganti_jam,
            cutiTanpaGajiPhone: request.cuti_tanpa_gaji_phone,
            cutiTanpaGajiSignature: request.cuti_tanpa_gaji_signature,
            mcFileUrl: request.mc_file_url,
            approvalHistory: request.approval_history || [],
            workflowSteps: request.workflow_steps || [],
            discussionCount: Number(request.discussion_count || 0),
            unreadDiscussionCount: Number(request.unread_discussion_count || 0),
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
  }, [role, userId, userBranch, userDepartment, activeCompany?.id]);

  if (loading) {
    return (
      <div className="space-y-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="p-5 space-y-2.5">
              <Skeleton className="h-3.5 w-28 rounded" />
              <Skeleton className={`h-8 ${idx % 2 === 0 ? "w-16" : "w-20"} rounded-lg`} />
              <Skeleton className="h-3 w-24 rounded" />
            </Card>
          ))}
        </div>
        <Card className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between py-3 border-b border-border/50">
              <div className="space-y-1.5">
                <Skeleton className={`h-4 ${idx % 2 === 0 ? "w-40" : "w-32"} rounded`} />
                <Skeleton className="h-2.5 w-24 rounded" />
              </div>
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </Card>
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
      <div className="w-full py-6">
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
                <p className="text-sm font-medium text-foreground">Pending Requests</p>
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
                <p className="text-sm font-medium text-foreground">Approved Leaves</p>
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
                <p className="text-sm font-medium text-foreground">Rejected Leaves</p>
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
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-foreground" />
              <Input
                placeholder="Search employee..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground z-10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
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
                    <TableHead>Company</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-foreground">
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
                          <div className="text-xs text-foreground">{req.user_id}</div>
                        </TableCell>
                        <TableCell>{req.type}</TableCell>
                        <TableCell>{req.from}</TableCell>
                        <TableCell>{req.to}</TableCell>
                        <TableCell>
                          <div className="inline-flex flex-col items-start gap-0.5">
                            <span className="font-bold">{formatLeaveBalance(req.days)}</span>
                            {getCompactSessionBadge(req) && (
                              <span className="px-1.5 py-0 rounded bg-[#942392]/10 text-[#942392] text-[8px] font-black uppercase tracking-wider">
                                {getCompactSessionBadge(req)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <Badge 
                              variant={
                                req.status === "Approved" ? "default" : 
                                req.status === "Rejected" ? "destructive" : 
                                "default"
                              } 
                              className={
                                req.status === "Approved" ? "bg-[#228b22] text-white hover:bg-[#1a661a]" : 
                                req.status === "Rejected" ? "" :
                                "bg-[#C2410C] hover:bg-[#A3370A] text-white border-none"
                              }
                              style={req.status !== "Approved" && req.status !== "Rejected" ? { backgroundColor: "#C2410C", color: "white" } : {}}
                            >
                              {getDisplayStatus(req.status, req.branch, req.company_name)}
                            </Badge>
                            {(req.unreadDiscussionCount ?? 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#942392] text-white">
                                <MessageSquare className="w-3 h-3" />
                                {req.unreadDiscussionCount} New
                              </span>
                            ) : (req.discussionCount ?? 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border/50">
                                <MessageSquare className="w-3 h-3" />
                                {req.discussionCount}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            (req.company_name || "").toLowerCase().includes("rayrent") || req.branch?.toUpperCase() === "RAYRENT"
                              ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
                              : "bg-[#942392]/10 text-[#942392] dark:text-[#f3a8f1] border-[#942392]/25"
                          }`}>
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span>{req.company_name || (req.branch?.toUpperCase() === "RAYRENT" ? "RayRent" : "Rayhar Travels")}</span>
                          </span>
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
        <DialogContent
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const el = e.currentTarget as HTMLElement;
            el.focus({ preventScroll: true });
            el.scrollTop = 0;
          }}
          className="max-w-3xl max-h-[90vh] overflow-y-auto border-none shadow-2xl rounded-[32px] p-0 safe-area-bottom"
        >
          {selectedRequest && (
            <>
              <div className="p-6 bg-gradient-to-br from-[#942392] to-[#a855f7] text-white print:hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-white text-xl font-black tracking-tight">
                    <FileText className="h-6 w-6" />
                    Leave Application Detail
                  </DialogTitle>
                  <DialogDescription className="text-white/80 font-bold uppercase text-[8px] print:text-[13px] tracking-widest">
                    HR Approval Registry • ID: {selectedRequest.id}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div id="leave-form-print" className="p-4 sm:p-6 print:p-0 space-y-4">
                <div className="rounded-[24px] border border-border/50 p-4 sm:p-6 space-y-4 print:space-y-0 bg-card shadow-sm">
                  <div className="text-center border-b-2 border-foreground/50 dark:border-purple-500/50 pb-4 print:border-[#111] print:pb-3">
                    <h2 className="text-2xl print:text-[30px] print:leading-tight font-black tracking-tighter print:tracking-tight text-foreground dark:text-purple-400">RAYHAR GROUP</h2>
                    <p className="text-[10px] print:text-[13px] font-black print:font-bold tracking-[0.2em] print:tracking-[0.38em] uppercase opacity-60 print:opacity-100 print:text-[#666] print:mt-1 dark:text-purple-300">Permohonan Cuti Kakitangan</p>
                  </div>

                  <div className="space-y-4 print:space-y-0">
                    <div className="flex items-center gap-2 print:mb-4">
                      <User className="w-4 h-4 text-[#942392] print:hidden" />
                      <h3 className="text-[10px] print:text-[12px] font-black print:font-extrabold uppercase tracking-[0.1em] print:tracking-[0.15em]">Maklumat Kakitangan</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 print:gap-y-5 print:gap-x-8 text-xs font-bold">
                      <div className="space-y-1 print:space-y-1">
                        <span className="text-[9px] print:text-[11px] print:normal-case uppercase font-black print:font-bold text-slate-950 dark:text-slate-50">Nama Penuh</span>
                        <p className="break-words font-bold print:font-normal print:text-[12.5px]">{formatPrintText(selectedRequest.employee)}</p>
                      </div>
                      <div className="space-y-1 print:space-y-1">
                        <span className="text-[9px] print:text-[11px] print:normal-case uppercase font-black print:font-bold text-slate-950 dark:text-slate-50">Cawangan</span>
                        <p className="font-bold print:font-normal print:text-[12.5px]">{formatBranchName(selectedRequest.branch)}</p>
                      </div>
                      <div className="space-y-1 print:space-y-1">
                        <span className="text-[9px] print:text-[11px] print:normal-case uppercase font-black print:font-bold text-slate-950 dark:text-slate-50">No. Telefon</span>
                        <p className="font-bold print:font-normal print:text-[12.5px] text-foreground">{selectedRequest.phone || (selectedRequest as any).applicant_phone || "-"}</p>
                      </div>
                      <div className="space-y-1 print:space-y-1">
                        <span className="text-[9px] print:text-[11px] print:normal-case uppercase font-black print:font-bold text-slate-950 dark:text-slate-50">Jenis Cuti</span>
                        <p className="font-bold print:font-normal print:text-[12.5px]">{selectedRequest.type}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 print:space-y-8">
                    <div className="grid grid-cols-2 gap-4 print:gap-x-8 text-xs font-bold">
                      {!(selectedRequest.type === "Replacement Leave" || selectedRequest.type === "Cuti Ganti") && (
                      <div className="space-y-2 print:space-y-1">
                        <p className="text-[9px] print:text-[11px] print:normal-case uppercase font-black print:font-bold text-slate-950 dark:text-slate-50">Sebab / Tujuan</p>
                        <div className="rounded-[16px] border border-border/40 print:border-none print:border-0 print:border-transparent print:bg-transparent p-4 font-bold print:font-normal text-foreground bg-muted/10 text-xs print:text-[12.5px] leading-relaxed whitespace-pre-wrap break-words min-h-[50px] print:min-h-0 print:p-0">
                          {formatPrintText(getCleanReason(selectedRequest.reason) || "-")}
                        </div>
                      </div>
                      )}
                      <div className="space-y-1 col-start-2">
                        <span className="text-[9px] print:text-[11px] print:normal-case uppercase font-black print:font-bold text-slate-950 dark:text-slate-50">Status</span>
                        <div className={`font-black print:font-bold uppercase print:normal-case print:text-[12.5px] print:text-[#111] ${
                          selectedRequest.status === "Rejected" ? "text-rose-600" :
                          selectedRequest.status === "Approved" ? "text-emerald-600" :
                          "text-[#942392]"
                        }`}>
                          {getDisplayStatus(selectedRequest.status, selectedRequest.branch, selectedRequest.company_name)}
                          <LeaveStatusDecisionBy
                            status={selectedRequest.status}
                            approvalHistory={selectedRequest.approvalHistory}
                            approverRole={selectedRequest.approverRole}
                            branch={selectedRequest.branch}
                            department={selectedRequest.department}
                          />
                        </div>
                      </div>
                    </div>

                    {!(selectedRequest.type === "Replacement Leave" || selectedRequest.type === "Cuti Ganti") ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-4 print:gap-x-6 text-xs font-bold">
                        <div className="space-y-1 print:space-y-1">
                          <span className="text-[9px] print:text-[11px] print:normal-case uppercase font-black print:font-bold text-slate-950 dark:text-slate-50">Dari</span>
                          <p className="font-bold print:font-normal print:text-[12.5px] text-foreground">{formatDisplayDate(selectedRequest.from)}</p>
                        </div>
                        <div className="space-y-1 print:space-y-1">
                          <span className="text-[9px] print:text-[11px] print:normal-case uppercase font-black print:font-bold text-slate-950 dark:text-slate-50">Hingga</span>
                          <p className="font-bold print:font-normal print:text-[12.5px] text-foreground">{formatDisplayDate(selectedRequest.to)}</p>
                        </div>
                        <div className="space-y-1 print:space-y-1">
                          <span className="text-[9px] print:text-[11px] print:normal-case uppercase font-black print:font-bold text-slate-950 dark:text-slate-50">Bilangan Hari</span>
                          <p className="font-bold print:font-normal print:text-[12.5px] text-foreground">
                            {formatLeaveDays(selectedRequest.days)} Days
                            {getLeaveSessionLabel(selectedRequest) ? (
                              <span className="block text-[10px] text-[#942392] font-black">{getLeaveSessionLabel(selectedRequest)}</span>
                            ) : null}
                          </p>
                        </div>
                        <div className="space-y-1 print:space-y-1">
                          <span className="text-[9px] print:text-[11px] print:normal-case uppercase font-black print:font-bold text-slate-950 dark:text-slate-50">Baki Layak</span>
                          <p className="font-bold print:font-normal print:text-[12.5px] text-foreground">
                            {selectedRequest.balance !== undefined && selectedRequest.balance !== null
                              ? `${formatNullableLeaveDays(selectedRequest.balance)} Days`
                              : "-"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-[20px] border border-border/50">
                        <span className="text-[10px] print:text-[13px] font-black uppercase text-slate-950 dark:text-slate-50 tracking-wider pl-2">Jumlah Hari Cuti Ganti</span>
                        <div className="text-center bg-white dark:bg-slate-900 rounded-[14px] border border-border/50 px-6 py-1.5 shadow-sm flex flex-col justify-center">
                          <p className="text-[9px] print:text-[13px] uppercase font-black text-[#942392]">Days</p>
                          <p className="font-black text-lg text-[#942392] leading-none mt-0.5">{formatLeaveDays(selectedRequest.days)}</p>
                        </div>
                      </div>
                    )}
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
                        <p className="text-[10px] print:text-[13px] font-black uppercase text-blue-600 opacity-80 tracking-widest px-1">Butiran Cuti Ganti</p>
                        <div className="border border-blue-500/20 rounded-[20px] overflow-hidden bg-blue-500/5">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-blue-500/10 hover:bg-blue-500/10 border-b border-blue-500/20">
                                <TableHead className="py-2.5 px-4 text-[8px] print:text-[13px]">Tarikh Cuti</TableHead>
                                <TableHead className="py-2.5 px-4 text-[8px] print:text-[13px]">Tarikh/Hari Cuti Ganti</TableHead>
                                <TableHead className="py-2.5 px-4 text-[8px] print:text-[13px]">Keterangan / Tugasan</TableHead>
                                <TableHead className="py-2.5 px-4 text-[8px] print:text-[13px] text-right">Jam Bekerja</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-blue-500/10 font-bold text-foreground/80">
                              {rows.map((row: any, idx: number) => (
                                <TableRow key={idx} className="hover:bg-blue-500/5">
                                  <TableCell className="py-2 px-4">{row.tarikhCuti || "-"}</TableCell>
                                  <TableCell className="py-2 px-4">{row.tarikhGanti || "-"}</TableCell>
                                  <TableCell className="py-2 px-4 whitespace-normal break-words max-w-[200px] text-[9px] print:text-[13px] text-blue-900/80 font-medium">{row.keterangan || "-"}</TableCell>
                                  <TableCell className="py-2 px-4 text-right">{row.jamGanti || 0} Jam</TableCell>
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
                    <div className="grid grid-cols-2 gap-4 print:gap-y-6 print:gap-x-8 text-[8px] print:text-[13px] p-4 print:px-0">
                      <div>
                        <p className="uppercase font-black text-slate-950 dark:text-slate-50">No. Tel H/P</p>
                        <p className="font-black mt-0.5">{selectedRequest.cutiTanpaGajiPhone || "-"}</p>
                      </div>
                      <div>
                        <p className="uppercase font-black text-slate-950 dark:text-slate-50">Tandatangan</p>
                        <p className="font-black mt-0.5 text-slate-950 dark:text-slate-50 flex items-center gap-1.5">
                          {selectedRequest.cutiTanpaGajiSignature ? (
                            "✓ DISAHKAN"
                          ) : (
                            "TIADA PENGESAHAN"
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Conditional Fields: Cuti Sakit (MC) */}
                  {(selectedRequest.type === "Sick Leave" || selectedRequest.type === "Cuti Sakit") && selectedRequest.mcFileUrl && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-[16px] flex items-center justify-between group print:hidden">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-[#942392]" />
                        <span className="text-[10px] print:text-[13px] font-black text-[#942392] uppercase tracking-widest">MC Attachment</span>
                      </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={sanitizeUrl(getMcAttachmentUrl(selectedRequest.mcFileUrl) || safeFileUrl(selectedRequest.mcFileUrl, "about:blank"))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] print:text-[13px] font-black uppercase tracking-widest bg-[#942392] text-white px-4 py-2 rounded-xl hover:bg-[#5e0080] transition-colors shadow-lg"
                      >
                        View File
                      </a>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            const empName = selectedRequest.employee || selectedRequest.full_name || "UNKNOWN";
                            const branchName = selectedRequest.branch || "HQ";
                            const leaveType = selectedRequest.type || "MC";
                            
                            let originalExt = "pdf";
                            if (selectedRequest.mcFileUrl) {
                              const match = selectedRequest.mcFileUrl.match(/\.([a-zA-Z0-9]+)$/);
                              if (match) {
                                originalExt = match[1];
                              }
                            }
                            const filename = `${empName} - ${branchName} - ${leaveType}.${originalExt}`;
                            
                            await downloadUploadedFile(selectedRequest.mcFileUrl, filename);
                          } catch (err) {
                            import("react-hot-toast").then(({ toast }) => toast.error("Failed to download file"));
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-[#942392]/20 text-[#942392] hover:bg-[#942392] hover:text-white transition-colors"
                        title="Download File"
                      >
                        <Download className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline-block">Download File</span>
                      </button>
                    </div>
                    </div>
                  )}

                  <div className="hidden print:block border-t border-[#111]" />

                  {/* Maklumat Waris Section */}
                  <div className="pt-4 border-t border-border/50 print:border-t-0 print:pt-0 space-y-4 print:space-y-0">
                    <div className="flex items-center gap-2 print:mb-4">
                      <PhoneCall className="w-4 h-4 text-rose-500 print:hidden" />
                      <h3 className="text-[10px] print:text-[12px] font-black print:font-extrabold uppercase tracking-[0.1em] print:tracking-[0.15em]">Maklumat Waris (Kecemasan)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 print:gap-y-5 print:gap-x-8">
                      <div className="space-y-1 print:space-y-1">
                        <span className="text-[10px] print:text-[11px] print:normal-case font-black print:font-bold text-slate-950 dark:text-slate-50 uppercase">Nama</span>
                        <p className="text-xs print:text-[12.5px] font-bold print:font-normal truncate">{formatPrintText(selectedRequest.warisNama)}</p>
                      </div>
                      <div className="space-y-1 print:space-y-1">
                        <span className="text-[10px] print:text-[11px] print:normal-case font-black print:font-bold text-slate-950 dark:text-slate-50 uppercase">Hubungan</span>
                        <p className="text-xs print:text-[12.5px] font-bold print:font-normal truncate">{formatPrintText(selectedRequest.warisHubungan)}</p>
                      </div>
                      <div className="space-y-1 print:space-y-1">
                        <span className="text-[10px] print:text-[11px] print:normal-case font-black print:font-bold text-slate-950 dark:text-slate-50 uppercase">No. Telefon</span>
                        <p className="text-xs print:text-[12.5px] font-bold print:font-normal text-foreground">{selectedRequest.warisPhone}</p>
                      </div>
                      <div className="space-y-1 print:space-y-1">
                        <span className="text-[10px] print:text-[11px] print:normal-case font-black print:font-bold text-slate-950 dark:text-slate-50 uppercase">Alamat</span>
                        <p className="text-xs print:text-[12.5px] font-bold print:font-normal break-words leading-relaxed">{formatPrintText(selectedRequest.warisAlamat)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="hidden print:block border-t border-[#111]" />

                  {/* Approval History Timeline (Vertical Flow) */}
                  <div className="space-y-4 print:space-y-0 pt-4 border-t border-border/50 print:border-t-0 print:pt-0">
                    <ApprovalHistoryTimeline 
                      status={selectedRequest.status} 
                      approverRole={selectedRequest.approverRole || (selectedRequest.approvalHistory && selectedRequest.approvalHistory.length > 0 ? selectedRequest.approvalHistory[selectedRequest.approvalHistory.length - 1].approver_role : "")} 
                      approvalHistory={selectedRequest.approvalHistory}
                      branch={selectedRequest.branch || "HQ"} 
                      department={selectedRequest.department || ""}
                      pendingApproverName={selectedRequest.pendingApproverName || selectedRequest.pending_approver_name}
                    />
                    
                    {/* Render remarks below the timeline if they exist */}
                    {selectedRequest.approvalHistory && selectedRequest.approvalHistory.length > 0 && selectedRequest.approvalHistory.some((h: any) => h.remarks) && (
                      <div className="mt-4 space-y-2">
                        {selectedRequest.approvalHistory.filter((h: any) => h.remarks).map((history: any, idx: number) => (
                          <div key={idx} className="bg-muted/30 rounded-xl p-3 border border-border/40">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] print:text-[13px] font-black text-foreground/70">
                                Remark by {history.approver_name || history.approver_id}
                              </span>
                              <span className="text-[10px] print:text-[13px] font-black text-foreground/50">
                                {new Date(history.created_at).toLocaleDateString('ms-MY')}
                              </span>
                            </div>
                            <p className="text-[8px] print:text-[13px] italic text-foreground bg-white/50 dark:bg-black/20 p-2 rounded-lg mt-1">
                              "{history.remarks}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Leave Discussion (Separate from Approval Comments) */}
                  <LeaveDiscussionCard
                    leaveRequest={selectedRequest}
                    role={role}
                    onMarkedRead={(leaveId) => {
                      setLeaveRequests((prev) =>
                        prev.map((r) => (r.id === leaveId ? { ...r, unreadDiscussionCount: 0 } : r))
                      );
                    }}
                  />

                  <div className="hidden print:grid grid-cols-2 gap-12 pt-6 text-center">
                    <div className="border-t border-[#111] pt-2">
                      <p className="text-[12px] font-bold uppercase">Tandatangan Kakitangan</p>
                    </div>
                    <div className="border-t border-[#111] pt-2">
                      <p className="text-[12px] font-bold uppercase">Kelulusan Pengurus / HR</p>
                    </div>
                  </div>

                  <p className="hidden print:block text-[11px] text-center italic text-[#444]">
                    Borang ini sah digunakan sebagai bukti rasmi cuti kakitangan setelah mendapat kelulusan pihak pengurusan.
                  </p>

                  <p className="text-[8px] print:text-[13px] text-center italic text-muted-foreground pt-4 print:hidden">
                    Borang ini sah digunakan sebagai bukti rasmi cuti kakitangan setelah mendapat kelulusan pihak pengurusan.
                  </p>

                  <div className="pt-5 mt-2 border-t border-border/50 flex justify-end gap-3 print:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPrinting}
                      className="group h-10 gap-2 border-2 border-[#942392]/35 bg-[#942392]/5 text-[#942392] dark:text-[#f3a8f1] hover:bg-[#942392] hover:text-white hover:border-[#942392] rounded-xl font-black text-[11px] print:text-[13px] uppercase tracking-wider px-5 shadow-xs hover:shadow-md hover:shadow-[#942392]/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
                      onClick={async () => {
                        setIsPrinting(true);
                        try {
                          const originalTitle = document.title;
                          const empName = selectedRequest.employee || selectedRequest.name || "UNKNOWN";
                          const branch = selectedRequest.branch || "HQ";
                          document.title = `LEAVE REQUEST ( ${empName.toUpperCase()} - ${branch.toUpperCase()} )`;
                          if (selectedRequest.mcFileUrl && !isPdfUrl(selectedRequest.mcFileUrl) && !mcBlobUrl) {
                            const directUrl = getMcAttachmentUrl(selectedRequest.mcFileUrl);
                            const fallbackUrl = safeFileUrl(selectedRequest.mcFileUrl);
                            const loaded = await preloadImage(directUrl, fallbackUrl);
                            if (loaded) {
                              setMcBlobUrl(loaded);
                            }
                            await new Promise((r) => setTimeout(r, 300));
                          }
                          window.print();
                          setTimeout(() => { document.title = originalTitle; }, 500);
                        } finally {
                          setIsPrinting(false);
                        }
                      }}
                    >
                      {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />}
                      {isPrinting ? "Preparing..." : "Print Form"}
                    </Button>
                  </div>
                </div>

                </div>
                {/* Print-only MC Document Page */}
                {(selectedRequest.type === "Sick Leave" || selectedRequest.type === "Cuti Sakit") && selectedRequest.mcFileUrl && (
                  <div 
                    className="opacity-0 h-0 w-0 overflow-hidden absolute print:static print:opacity-100 print:h-auto print:w-full print:break-before-page print:pt-6 print:border-2 print:border-black print:p-6 print:mt-6 print:overflow-visible"
                    style={{
                      pageBreakBefore: "always",
                      breakBefore: "page",
                      pageBreakInside: "avoid",
                      breakInside: "avoid"
                    }}
                  >
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold uppercase tracking-widest text-black border-b-2 border-black inline-block pb-2">MC DOCUMENT</h2>
                    </div>
                    {isPdfUrl(selectedRequest.mcFileUrl) ? (
                      <div className="p-8 border-2 border-slate-300 rounded-xl text-center my-6 space-y-3 bg-slate-50/50">
                        <FileText className="w-12 h-12 mx-auto text-[#942392]" />
                        <p className="font-black text-sm uppercase text-slate-800 tracking-wider">Lampiran Sijil Cuti Sakit (Format PDF)</p>
                        <p className="text-xs text-slate-600 font-mono break-all">{selectedRequest.mcFileUrl.split('/').pop()}</p>
                        <p className="text-xs text-slate-500 italic mt-2">Dokumen ini telah dilampirkan dalam format PDF. Sila guna butang &quot;View File&quot; atau &quot;Download File&quot; dalam portal untuk melihat fail asal.</p>
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-center max-h-[750px]">
                        <img 
                          src={sanitizeUrl(mcBlobUrl || getMcAttachmentUrl(selectedRequest.mcFileUrl) || safeFileUrl(selectedRequest.mcFileUrl, "about:blank"))} 
                          alt="MC Attachment" 
                          className="max-w-full max-h-[750px] object-contain block mx-auto"
                          onError={(e) => {
                            const currentSrc = e.currentTarget.src;
                            if (currentSrc.includes('supabase.co')) {
                              e.currentTarget.src = sanitizeUrl(safeFileUrl(selectedRequest.mcFileUrl, "about:blank"));
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
