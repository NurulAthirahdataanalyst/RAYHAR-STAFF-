import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock3, FileText, Plus, XCircle, Calendar } from "lucide-react";
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

const approvalProgress = (status: string) => {
  switch (status) {
    case "Approved": return 100;
    case "Rejected": return 100;
    case "Pending HOD": return 25;
    case "Pending Branch Leader": return 25;
    case "Pending Finance": return 50;
    case "Pending MD": return 75;
    default: return 25;
  }
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
            status: request.status || "Pending HOD",
            reason: request.reason || "",
            appliedAt,
            formFileName: getLeaveFormFileName(appliedAt, type, request.full_name || userName),
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
          const base = Number(data.profile.annual_leave_entitlement) || 14;
          const adj = Number(data.profile.total_adjustment) || 0;
          setCurrentBalances(prev => ({
            ...prev,
            "Annual & Emergency Leave": base + adj
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
      return {
        label: leaveTypeLabels[item.type],
        used: getUsedLeaveDays(filteredLeaveRequests, item.type),
        total: total,
      };
    });
  }, [filteredLeaveRequests, currentBalances]);

  return (
    <div className="space-y-3 sm:space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#7B0099]/10 dark:bg-[#7B0099]/20 rounded-xl text-[#7B0099] dark:text-purple-400">
            <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-responsive-xl font-black text-foreground tracking-tight uppercase">Leave Portal</h1>
            <p className="text-responsive-sm text-muted-foreground font-medium italic">
              Manage your leave applications and check quotas
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[90px] h-10 text-[10px] font-black uppercase tracking-widest rounded-xl border border-[#7B0099]/20 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {YEARS.map(y => (
                <SelectItem key={y} value={y} className="text-[10px] font-black uppercase tracking-widest">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => navigate("/leave/apply")}
            className="gap-2 bg-[#7B0099] text-white hover:bg-[#5e0080] rounded-xl font-black text-[10px] uppercase tracking-widest px-5 py-4 shadow-lg shadow-[#7B0099]/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Apply for Leave
          </Button>
        </div>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 max-w-[960px]">
        {leaveBalances.map((item) => (
          <Card key={item.label} className="relative overflow-hidden border border-border/40 shadow-[0_4px_16px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.12)] bg-white/90 dark:bg-card/80 backdrop-blur-md rounded-xl group hover:shadow-md transition-all duration-300">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#7B0099]" />
            <CardContent className="p-3 sm:p-4 space-y-2 pl-4 sm:pl-4">
              <div className="flex items-center justify-between">
                <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-[#7B0099] dark:text-purple-400 truncate">{item.label}</p>
                <div className="w-5 h-5 rounded-full bg-[#7B0099]/5 flex items-center justify-center">
                  <Calendar className="w-2.5 h-2.5 text-[#7B0099]/40" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-foreground group-hover:scale-105 transition-transform origin-left duration-500">{item.used}</span>
                <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
                  {item.total ? `/ ${item.total} DAYS` : "USED"}
                </span>
              </div>
              <div className="space-y-1">
                <div className="h-1 overflow-hidden rounded-full bg-[#7B0099]/10">
                  <div
                    className="h-full rounded-full bg-[#7B0099] transition-all duration-1000 ease-out"
                    style={{
                      width: item.total
                        ? `${Math.min((item.used / item.total) * 100, 100)}%`
                        : item.used > 0
                          ? "100%"
                          : "0%",
                    }}
                  />
                </div>
                {item.total && (
                  <p className="text-[7px] font-black text-muted-foreground text-right uppercase tracking-widest opacity-60">
                    {item.total - item.used} Days Remaining
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leave Requests Table */}
      <Card className="border-none shadow-[0_18px_42px_rgba(0,0,0,0.04)] dark:shadow-[0_18px_42px_rgba(0,0,0,0.18)] bg-card/80 backdrop-blur-md rounded-[24px] sm:rounded-[28px] overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-3 px-4 sm:px-5">
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Recent Applications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="overflow-x-auto hidden sm:block">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="px-5 py-3.5 text-foreground uppercase text-[10px] font-black tracking-widest whitespace-nowrap">Leave Type</TableHead>
                  <TableHead className="px-5 py-3.5 text-foreground uppercase text-[10px] font-black tracking-widest whitespace-nowrap">From</TableHead>
                  <TableHead className="px-5 py-3.5 text-foreground uppercase text-[10px] font-black tracking-widest whitespace-nowrap">To</TableHead>
                  <TableHead className="px-5 py-3.5 text-foreground uppercase text-[10px] font-black tracking-widest text-center whitespace-nowrap">Days</TableHead>
                  <TableHead className="px-5 py-3.5 text-foreground uppercase text-[10px] font-black tracking-widest text-center whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/50">
                {filteredLeaveRequests.length > 0 ? (
                  filteredLeaveRequests.map((req, i) => (
                    <TableRow key={i} className="hover:bg-[#7B0099]/5 transition-colors group">
                      <TableCell className="px-5 py-3.5 font-black text-[#7B0099] dark:text-purple-400">{leaveTypeLabels[req.type]}</TableCell>
                      <TableCell className="px-5 py-3.5 text-muted-foreground font-bold">{req.from}</TableCell>
                      <TableCell className="px-5 py-3.5 text-muted-foreground font-bold">{req.to}</TableCell>
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
                    <TableCell colSpan={5} className="px-5 py-10 text-center text-xs font-black text-muted-foreground uppercase tracking-widest italic opacity-30">
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
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                      <span>{req.from}</span>
                      <span className="opacity-30">→</span>
                      <span>{req.to}</span>
                    </div>
                    <span className="text-[11px] font-black text-[#7B0099]">{req.days} DAYS</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs font-black text-muted-foreground uppercase tracking-widest italic opacity-30 p-6">
                No leave applications yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Approval Section */}
      <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[24px] sm:rounded-[32px] overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Approval Status Tracker</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {filteredLeaveRequests.length > 0 ? (
            filteredLeaveRequests.map((req) => {
              const fileName = req.formFileName || getLeaveFormFileName(req.appliedAt, req.type, userName);

              return (
                <div
                  key={req.id}
                  className="rounded-[24px] border border-border/50 bg-card/50 p-4 sm:p-6 hover:bg-[#7B0099]/5 hover:border-[#7B0099]/30 transition-all duration-300 cursor-pointer group"
                  onClick={() => navigate("/leave/forms")}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-2xl bg-[#7B0099]/10 flex items-center justify-center text-[#7B0099] group-hover:scale-110 transition-transform duration-300">
                        <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-foreground truncate">{fileName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
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

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {approvalStatusIcon(req.status)}
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Workflow Progress</span>
                      </div>
                      <span className="text-[10px] font-black text-[#7B0099] uppercase">{Math.round(approvalProgress(req.status))}%</span>
                    </div>
                    
                    <div className="relative h-2 rounded-full bg-[#7B0099]/10 overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${
                          req.status === "Rejected" ? "bg-rose-500" :
                          req.status === "Approved" ? "bg-emerald-500" :
                          "bg-[#7B0099] shadow-[0_0_15px_rgba(123,0,153,0.4)]"
                        }`}
                        style={{ width: `${approvalProgress(req.status)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-1 px-1">
                      {["Submit", "HOD", "Finance", "MD"].map((step, idx) => {
                        const progress = approvalProgress(req.status);
                        const thresholds = [0, 25, 50, 75];
                        const isActive = progress >= thresholds[idx];
                        const isRejectedAtStep = req.status === "Rejected" && progress === thresholds[idx];
                        
                        return (
                          <div key={step} className="text-center space-y-1">
                            <div className={`mx-auto w-1 h-1 rounded-full ${isActive ? 'bg-[#7B0099]' : 'bg-muted-foreground/30'}`} />
                            <p className={`text-[8px] font-black uppercase tracking-tighter ${
                              isRejectedAtStep ? 'text-rose-500' :
                              isActive ? 'text-[#7B0099]' : 'text-muted-foreground opacity-40'
                            }`}>
                              {step}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center flex flex-col items-center gap-4 border-2 border-dashed border-border/50 rounded-[24px]">
              <FileText className="h-10 w-10 text-muted-foreground/20" />
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
