import { useEffect, useMemo, useState } from "react";
import { ApprovalStatusTracker } from "@/components/leave/ApprovalStatusTracker";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApprovalStatusTracker } from "@/components/leave/ApprovalStatusTracker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import PageActions from "@/components/layout/PageActions";
import { YearPopover } from "@/components/shared/YearPopover";
import { Check, X, CheckCircle2, Clock3, FileText, Plus, XCircle, Calendar } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { API_BASE_URL } from "../config/api";
import {
  getLeaveFormFileName,
  getLeaveRequests,
  getUsedLeaveDays,
  leaveTypeLabels,
  type LeaveRequest,
  type LeaveType,
  
} from "@/lib/leaveStorage";

const leaveTypes: Array<{ type: LeaveType; total?: number }> = [
  { type: "Annual/Emergency Leave", total: 14 },
  { type: "Replacement Leave" },
  { type: "Unpaid Leave" },
  { type: "Sick Leave" },
];

const statusVariant = (status: string) => {
  switch (status) {
    case "Approved": return "default";
    case "Rejected": return "destructive";
    default: return "secondary";
  }
};

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

const approvalProgress = (status: string, approverRole?: string) => {
  const role = String(approverRole || "").toLowerCase();
  let step = 0;
  if (role.includes("branch") || role.includes("hod")) step = 1;
  else if (role.includes("operation") || role.includes("finance")) step = 2;
  else if (role.includes("md") || role.includes("managing")) step = 3;
  
  if (status === "Approved") return 100;
  if (status === "Rejected") {
    if (step === 1) return 33;
    if (step === 2) return 66;
    if (step === 3) return 100;
    return 33; // Fallback
  }
  
  // Pending
  if (step === 1) return 33;
  if (step === 2) return 66;
  if (step === 3) return 100;
  return 33; // Fallback
};

const approvalStatusIcon = (status: string) => {
  switch (status) {
    case "Approved": return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case "Rejected": return <XCircle className="h-4 w-4 text-red-600" />;
    default: return <Clock3 className="h-4 w-4 text-amber-600" />;
  }
};

const formatDate = (value: string) => value ? value.slice(0, 10) : "";
const YEARS = ["2027", "2026", "2025", "2024"];

export default function LeaveOverview() {
  const navigate = useNavigate();
  const { userId, userName } = useRole();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [refreshKey, setRefreshKey] = useState(0);

  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests.filter(req => {
      if (!req.from) return false;
      return req.from.startsWith(selectedYear);
    });
  }, [leaveRequests, selectedYear]);

  useEffect(() => {
    const fetchLeaveRequests = async () => {
      if (!userId) {
        setLeaveRequests(getLeaveRequests());
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/leave-requests?userId=${encodeURIComponent(userId)}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load leave requests");
        }

        const formattedRequests = data.leaveRequests.map((request: any) => {
          const type = request.leave_type as LeaveType;
          const appliedAt = request.created_at || new Date().toISOString();

          return {
            id: String(request.leave_id),
            type,
            from: formatDate(request.start_date),
            to: formatDate(request.end_date),
            days: Number(request.days || 0),
            branch: request.branch || "HQ",
            status: request.status || "Pending HOD",
            approverRole: request.approver_role,
            reason: request.reason || "",
            appliedAt,
            formFileName: getLeaveFormFileName(appliedAt, type, request.full_name || userName),
            replacement_validations: request.replacement_validations || [],
          };
        });

        setLeaveRequests(formattedRequests);
      } catch (error) {
        console.error("Unable to fetch leave requests:", error);
        setLeaveRequests(getLeaveRequests());
      }
    };

    void fetchLeaveRequests();

    const sse = new EventSource(`${API_BASE_URL}/api/presence/stream`);
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'leave-status' || data.type === 'leave-request' || data.type === 'refresh') {
          void fetchLeaveRequests();
        }
      } catch (e) {}
    };

    // BroadcastChannel and storage event listeners for cross-tab sync
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("rayhar_leave_refresh");
      bc.onmessage = () => {
        setRefreshKey(prev => prev + 1);
        void fetchLeaveRequests();
      };
    } catch (e) {}

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "rayhar_employee_leave_balances") {
        setRefreshKey(prev => prev + 1);
        void fetchLeaveRequests();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      sse.close();
      window.removeEventListener("storage", handleStorageChange);
      if (bc) bc.close();
    };
  }, [userId, userName]);

  const [currentBalances, setCurrentBalances] = useState({ 
    "Annual & Emergency Leave": 14, 
    "Sick Leave (MC)": 14, 
    "Replacement Leave": 0, 
    "Unpaid Leave": 0 
  });

  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/user-details/${encodeURIComponent(userId)}`);
        const data = await res.json();
        if (data.success && data.profile) {
            const annualBase = Number(data.profile.annual_leave_entitlement) || 14;
            const annualAdj = Number(data.profile.annual_adj || data.profile.total_adjustment) || 0;
            const medicalBase = Number(data.profile.medical_leave_entitlement) || 14;
            const medicalAdj = Number(data.profile.medical_adj) || 0;
            const replAdj = Number(data.profile.replacement_adj) || 0;
            setCurrentBalances(prev => ({
              ...prev,
              "Annual & Emergency Leave": annualBase + annualAdj,
              "Sick Leave (MC)": medicalBase + medicalAdj,
              "Replacement Leave": replAdj
            }));
        }
      } catch (err) {
        console.error("Failed to fetch user details for leave balances:", err);
      }
    };
    void fetchProfile();
  }, [userId, refreshKey]);

  const mapTypeToBalanceKey = (type: LeaveType): "Annual & Emergency Leave" | "Replacement Leave" | "Sick Leave (MC)" | "Unpaid Leave" => {
    if (type === "Annual/Emergency Leave" || type === "Cuti Tahunan") {
      return "Annual & Emergency Leave";
    }
    if (type === "Sick Leave" || type === "Cuti Sakit") {
      return "Sick Leave (MC)";
    }
    if (type === "Replacement Leave" || type === "Cuti Ganti") {
      return "Replacement Leave";
    }
    return "Unpaid Leave";
  };

  const leaveBalances = useMemo(() => {
    return leaveTypes.map((item) => {
      const balanceKey = mapTypeToBalanceKey(item.type);
      const total = currentBalances[balanceKey];
      const apps = filteredLeaveRequests.filter(
        r => (r.type === item.type || leaveTypeLabels[r.type] === leaveTypeLabels[item.type])
      ).length;
      return {
        label: leaveTypeLabels[item.type],
        used: getUsedLeaveDays(filteredLeaveRequests, item.type),
        total: total,
        applications: apps,
      };
    });
  }, [filteredLeaveRequests, currentBalances]);

  return (
    <div className="space-y-3 sm:space-y-5 animate-in fade-in duration-500">
      <PageActions>
        <div className="flex items-center gap-2.5">
          <YearPopover 
            year={selectedYear} 
            onSelectYear={setSelectedYear} 
            className="appearance-none flex items-center justify-between px-3 py-1.5 h-9 w-[90px] bg-card border border-[#7B0099]/20 text-foreground text-[10px] font-black rounded-xl shadow-sm outline-none cursor-pointer uppercase tracking-widest gap-2"
          />
          <Button
            onClick={() => navigate("/leave/apply")}
            className="gap-2 bg-[#7B0099] text-white hover:bg-[#5e0080] rounded-xl font-black text-[10px] uppercase tracking-widest px-4 h-9 shadow-lg shadow-[#7B0099]/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Apply for Leave
          </Button>
        </div>
      </PageActions>


      {/* Leave Balance Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 w-full">
        {leaveBalances.map((item) => {
          const isUnpaid = item.label === 'UNPAID LEAVE';
          const isReplacement = item.label === 'REPLACEMENT LEAVE';
          const isNoEntitlement = isUnpaid || isReplacement;

          return (
          <Card key={item.label} className="relative overflow-hidden border border-border/40 shadow-[0_4px_16px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.12)] bg-white/90 dark:bg-card/80 backdrop-blur-md rounded-xl group hover:shadow-md transition-all duration-300">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#7B0099]" />
            <CardContent className="p-3 sm:p-4 space-y-2 pl-4 sm:pl-4 flex flex-col h-full justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-[#7B0099] dark:text-purple-400 truncate">{item.label}</p>
                  <div className="w-5 h-5 rounded-full bg-[#7B0099]/5 flex items-center justify-center">
                    <Calendar className="w-2.5 h-2.5 text-[#7B0099]/40" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-foreground group-hover:scale-105 transition-transform origin-left duration-500">{item.used}</span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-foreground uppercase">
                    {isReplacement
                      ? `/ ${item.total || 0} DAYS TAKEN`
                      : isUnpaid
                      ? "Days Taken"
                      : `/ ${item.total || 0} DAYS`}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="h-1 overflow-hidden rounded-full bg-[#7B0099]/10">
                    <div
                      className="h-full rounded-full bg-[#7B0099] transition-all duration-1000 ease-out"
                      style={{
                        width: isNoEntitlement
                          ? (item.used > 0 ? "100%" : "0%")
                          : (item.total ? `${Math.min((item.used / item.total) * 100, 100)}%` : (item.used > 0 ? "100%" : "0%")),
                      }}
                    />
                  </div>
                  {!isNoEntitlement && item.total > 0 ? (
                    <p className="text-[7px] font-black text-foreground text-right uppercase tracking-widest mt-1">
                      {Math.max(item.total - item.used, 0)} DAYS REMAINING
                    </p>
                  ) : isNoEntitlement ? (
                    <p className="text-[7px] font-black text-foreground uppercase tracking-widest mt-1">
                      {item.applications} Application
                    </p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leave Requests Table */}
      <Card className="border-none shadow-[0_18px_42px_rgba(0,0,0,0.04)] dark:shadow-[0_18px_42px_rgba(0,0,0,0.18)] bg-card/80 backdrop-blur-md rounded-[24px] sm:rounded-[28px] overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-3 px-4 sm:px-5">
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Recent Applications</CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <YearPopover 
              year={selectedYear} 
              onSelectYear={setSelectedYear} 
              className="appearance-none flex items-center justify-between px-3 py-1.5 h-10 w-[90px] bg-card border border-[#7B0099]/20 text-foreground text-[10px] font-black rounded-xl shadow-sm outline-none cursor-pointer uppercase tracking-widest gap-2"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="overflow-x-auto hidden sm:block">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="px-5 py-3.5 text-[10px]">Leave Type</TableHead>
                  <TableHead className="px-5 py-3.5 text-[10px]">From</TableHead>
                  <TableHead className="px-5 py-3.5 text-[10px]">To</TableHead>
                  <TableHead className="px-5 py-3.5 text-[10px] text-center">Days</TableHead>
                  <TableHead className="px-5 py-3.5 text-[10px] text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/50">
                {filteredLeaveRequests.length > 0 ? (
                  filteredLeaveRequests.map((req, i) => (
                    <TableRow key={i} className="hover:bg-[#7B0099]/5 transition-colors group">
                      <TableCell className="px-5 py-3.5 font-black text-[#7B0099] dark:text-purple-400">{leaveTypeLabels[req.type]}</TableCell>
                      <TableCell className="px-5 py-3.5 text-foreground font-bold">{req.from}</TableCell>
                      <TableCell className="px-5 py-3.5 text-foreground font-bold">{req.to}</TableCell>
                      <TableCell className="px-5 py-3.5 text-center font-black text-foreground">{req.days}</TableCell>
                      <TableCell className="px-5 py-3.5 text-center">
                        <Badge
                          className={`text-[11px] font-black px-3 py-1 h-auto shadow-sm whitespace-nowrap ${
                            req.status === "Approved" ? "bg-emerald-500 text-white hover:bg-emerald-600" :
                            req.status === "Rejected" ? "bg-rose-600 text-white hover:bg-rose-700" :
                            "bg-[#C2410C] text-white hover:bg-[#A3370A]"
                          }`}
                          style={req.status !== "Approved" && req.status !== "Rejected" ? { backgroundColor: "#C2410C", color: "white" } : {}}
                        >
                          {getDisplayStatus(req.status).toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="px-5 py-10 text-center text-xs font-black text-foreground uppercase tracking-widest italic opacity-30">
                      No leave applications found in registry
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden divide-y divide-border/50">
            {filteredLeaveRequests.length > 0 ? (
              filteredLeaveRequests.map((req, i) => (
                <div key={i} className="p-4 active:bg-[#7B0099]/5 transition-colors space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-foreground">{leaveTypeLabels[req.type]}</span>
                    <Badge
                      className={`text-[10px] font-black h-auto py-1 px-2.5 whitespace-nowrap ${
                        req.status === "Approved" ? "bg-emerald-500 text-white" :
                        req.status === "Rejected" ? "bg-rose-600 text-white" :
                        "bg-[#C2410C] text-white"
                      }`}
                      style={req.status !== "Approved" && req.status !== "Rejected" ? { backgroundColor: "#C2410C", color: "white" } : {}}
                    >
                      {getDisplayStatus(req.status).toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between bg-muted/20 p-2 rounded-xl">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-foreground uppercase tracking-tight">
                      <span>{req.from}</span>
                      <span className="opacity-30">→</span>
                      <span>{req.to}</span>
                    </div>
                    <span className="text-[11px] font-black text-[#7B0099]">{req.days} DAYS</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs font-black text-foreground uppercase tracking-widest italic opacity-30 p-6">
                No leave applications yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Approval Section */}
      <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[24px] sm:rounded-[32px] overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Approval History</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {filteredLeaveRequests.length > 0 ? (
            filteredLeaveRequests.map((req) => {
              const fileName = req.formFileName || getLeaveFormFileName(req.appliedAt, req.type, userName);

              return (
                <div
                  key={req.id}
                  className="rounded-[24px] border border-border/50 bg-card/50 p-4 sm:p-6 hover:bg-[#7B0099]/5 hover:border-[#7B0099]/30 transition-all duration-300 cursor-pointer group"
                  onClick={() => navigate(`/leave/forms?leaveId=${req.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-2xl bg-[#7B0099]/10 flex items-center justify-center text-[#7B0099] group-hover:scale-110 transition-transform duration-300">
                        <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-foreground truncate">{fileName}</p>
                        <p className="text-[10px] font-bold text-foreground uppercase tracking-widest mt-0.5">
                          {leaveTypeLabels[req.type]} • {req.appliedAt.slice(0, 10)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={`text-[9px] font-black px-2.5 h-5 w-fit shadow-sm sm:self-center ${
                        req.status === "Approved" ? "bg-emerald-500" :
                        req.status === "Rejected" ? "bg-rose-500" :
                        "bg-[#C2410C] text-white border-none"
                      }`}
                      style={req.status !== "Approved" && req.status !== "Rejected" ? { backgroundColor: "#C2410C", color: "white" } : {}}
                    >
                      {getDisplayStatus(req.status).toUpperCase()}
                    </Badge>
                  </div>

                  
  <div className="mt-6 space-y-4 pt-4 pb-2">
    <ApprovalStatusTracker status={req.status} approverRole={req.approverRole} branch={(req as any).branch || "HQ"} />
  </div>

                </div>
              );
            })
          ) : (
            <div className="py-12 text-center flex flex-col items-center gap-4 border-2 border-dashed border-border/50 rounded-[24px]">
              <FileText className="h-10 w-10 text-foreground/20" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-950 dark:text-slate-50">
                No active approval requests
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


