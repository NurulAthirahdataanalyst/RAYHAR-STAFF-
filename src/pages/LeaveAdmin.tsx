import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { TableScrollTopButton } from "@/components/shared/TableScrollTopButton";

import PageActions from "@/components/layout/PageActions";
import { exportToCSV } from "@/utils/export";
import { LeaveDetailsModal } from "@/components/leave/LeaveDetailsModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthPicker } from "@/components/shared/MonthPicker";
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
import { Check, X, Users, MapPin, Info, Loader2, FileText, Printer, PhoneCall, Clock, CheckCircle2, XCircle, ChevronRight, ChevronLeft, ClipboardList, Download, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { parseCutiGantiRows, getCleanReason } from "@/lib/leaveStorage";
import { API_BASE_URL } from "../config/api";

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

type LeaveRequest = {
  id: number;
  employee: string;
  branch: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "Pending HOD" | "Pending Branch Leader" | "Pending Operation Manager" | "Pending Finance" | "Pending MD" | "Approved" | "Rejected";
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
  replacementValidations?: {
    id: number;
    replacement_date: string;
    required_hours: string | number;
    actual_hours: string | number | null;
    validation_status: "Pending" | "Validated" | "Failed";
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

// Roles that can approve/reject leave requests
const APPROVER_ROLES = ["managing_director", "operation_manager", "finance_manager", "head_of_department", "branch_leader"];
// Roles that can see the leave admin panel (view + approve or view only)
const ADMIN_VIEW_ROLES = ["hr_admin", "branch_leader", ...APPROVER_ROLES];

type TabFilter = "pending" | "approved" | "rejected" | "history";

export default function LeaveAdmin() {
  const { role, userBranch, userDepartment, userId } = useRole();
  const canApprove = APPROVER_ROLES.includes(role);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const tableRef = useRef<HTMLTableElement>(null);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [bakiLayak, setBakiLayak] = useState<number | string>('-');
  const [activeTab, setActiveTab] = useState<TabFilter>("history");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>("all");

  const months = [
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

  const uniqueLeaveTypes = Array.from(new Set(requests.map(r => r.type))).filter(Boolean).sort();

  // First, filter by month
  const requestsByMonth = requests.filter((req) => {
    if (selectedMonth === "all") return true;
    return req.from.substring(5, 7) === selectedMonth;
  });

  // Then, filter by active tab
  const filteredRequestsByTab = requestsByMonth.filter((req) => {
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

  // Then filter by leave type
  const filteredRequests = filteredRequestsByTab.filter((req) => {
    if (selectedLeaveType === "all") return true;
    return req.type === selectedLeaveType;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedLeaveType, activeTab]);

  const currentData = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const pendingCount = requestsByMonth.filter((r) => r.status.startsWith("Pending")).length;
  const approvedCount = requestsByMonth.filter((r) => r.status === "Approved").length;
  const rejectedCount = requestsByMonth.filter((r) => r.status === "Rejected").length;

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    void fetchRequests();

    const sse = new EventSource(`${API_BASE_URL}/api/presence/stream`);
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'leave-status' || data.type === 'leave-request' || data.type === 'refresh') {
          void fetchRequests();
        }
      } catch (e) {}
    };

    return () => sse.close();
  }, [role, userBranch, userDepartment]);

  // Handle URL query parameters (tab and leaveId)
  useEffect(() => {
    let updated = false;
    const newParams = new URLSearchParams(searchParams);

    const tabParam = searchParams.get("tab");
    if (tabParam) {
      const cleanTab = tabParam.toLowerCase() as TabFilter;
      if (["pending", "approved", "rejected", "history"].includes(cleanTab)) {
        setActiveTab(cleanTab);
        newParams.delete("tab");
        updated = true;
      }
    }

    const leaveId = searchParams.get("leaveId");
    if (leaveId && requests.length > 0) {
      const match = requests.find(r => r.id === parseInt(leaveId, 10));
      if (match) {
        if (match.status === "Pending HOD" || match.status === "Pending Finance" || match.status === "Pending MD" || (match.status as string) === "Pending HR") {
          setActiveTab("pending");
        } else if (match.status === "Approved") {
          setActiveTab("approved");
        } else if (match.status === "Rejected") {
          setActiveTab("rejected");
        } else {
          setActiveTab("history");
        }
        setSelectedRequest(match);
        newParams.delete("leaveId");
        updated = true;
      }
    }

    if (updated) {
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, requests, selectedRequest, setSearchParams]);

  // Fetch bakiLayak when selectedRequest changes
  useEffect(() => {
    if (selectedRequest) {
      const typeUpper = (selectedRequest.type || "").toUpperCase();
      let reqBal: number | string | undefined = (selectedRequest as any).balance;
      
      if (reqBal === undefined || reqBal === null) {
        if (['ANNUAL LEAVE', 'ANNUAL & EMERGENCY LEAVE', 'ANNUAL/EMERGENCY LEAVE', 'CUTI TAHUNAN'].includes(typeUpper)) {
          reqBal = (selectedRequest as any).annual_leave_balance;
        } else if (['SICK LEAVE', 'MEDICAL LEAVE', 'CUTI SAKIT'].includes(typeUpper)) {
          reqBal = (selectedRequest as any).medical_leave_balance;
        } else if (['REPLACEMENT LEAVE', 'CUTI GANTI'].includes(typeUpper)) {
          reqBal = (selectedRequest as any).replacement_leave_balance;
        }
      }

      if (reqBal !== undefined && reqBal !== null) {
        setBakiLayak(reqBal);
      } else {
        setBakiLayak("-");
      }

      const userId = (selectedRequest as any).userId || (selectedRequest as any).user_id || "";
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
        userId: request.user_id,
        employee: request.full_name || request.user_id,
        branch: request.branch || "HQ",
        type: request.leave_type,
        from: formatDate(request.start_date),
        to: formatDate(request.end_date),
        days: Number(request.days || 0),
        phone: request.phone || request.applicant_phone || "-",
        balance: request.balance !== undefined && request.balance !== null ? Number(request.balance) : (request.annual_leave_balance !== undefined ? Number(request.annual_leave_balance) : undefined),
        annual_leave_balance: request.annual_leave_balance,
        medical_leave_balance: request.medical_leave_balance,
        replacement_leave_balance: request.replacement_leave_balance,
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
        replacementValidations: request.replacement_validations || [],
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {[
          { title: "Total Leaves", count: requestsByMonth.length, bg: "bg-emerald-500", icon: CheckCircle2 },
          { title: "Approved Leaves", count: approvedCount, bg: "bg-pink-500", icon: FileText },
          { title: "Rejected Leaves", count: rejectedCount, bg: "bg-amber-500", icon: XCircle },
          { title: "Pending Requests", count: pendingCount, bg: "bg-cyan-500", icon: Clock },
        ].map((stat, i) => (
          <div key={i} className={`bg-card border border-gray-200 dark:border-slate-800/80 shadow-sm hover:-translate-y-1 hover:shadow-lg${stat.bg.replace('bg-', 'border-l-')} rounded-lg overflow-hidden flex relative h-[100px] hover:shadow-md transition-shadow`}>
            <div className={`w-[85px] ${stat.bg} flex items-center justify-center relative shrink-0`}>
              <stat.icon className="text-white w-8 h-8 z-10" />
              <div className="absolute -right-[20px] top-0 bottom-0 w-[40px] bg-card transform skew-x-[-20deg]" />
            </div>
            <div className="flex-1 flex flex-col justify-center items-end pr-3 sm:pr-5 relative z-10 min-w-0">
              <div className="text-[12px] sm:text-[13px] font-medium text-foreground text-right leading-tight break-words">{stat.title}</div>
              <div className="text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight">{stat.count}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1"></div>
        <div className="flex flex-wrap items-center justify-end gap-2.5">
            <MonthPicker
              monthYear={selectedMonth === "all" ? `${selectedYear}-all` : `${selectedYear}-${selectedMonth}`}
              onSelectMonthYear={(val) => {
                if (val) {
                  const [year, month] = val.split('-');
                  setSelectedYear(year);
                  if (month === 'all') {
                    setSelectedMonth("all");
                  } else {
                    setSelectedMonth(month);
                  }
                } else {
                  setSelectedMonth("all");
                }
              }}
              className="appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-[11px] font-black uppercase tracking-widest rounded-md shadow-sm outline-none cursor-pointer h-10 gap-3 hover:border-[#942392]/40 min-w-[140px]"
            />

            <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
              <SelectTrigger className="w-[160px] h-9 text-xs font-medium rounded-md bg-transparent">
                <SelectValue placeholder="All Leave Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Leave Types</SelectItem>
                {uniqueLeaveTypes.map(type => (
                  <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

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

            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 px-3 border-dashed text-xs"
              onClick={() => {
                setSelectedMonth("all");
                setSelectedYear(new Date().getFullYear().toString());
                setSelectedLeaveType("all");
                setActiveTab("history");
              }}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-2" />
              Reset
            </Button>

            <ExportDropdown 
              onExportCSV={() => exportToCSV(filteredRequests, 'Leave_Requests')} 
              onExportPDF={() => window.print()} 
            />
          </div>
      </div>

      <Card className="border border-slate-100 dark:border-slate-700 bg-white dark:bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] overflow-hidden">
        {/* Table Content */}
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#942392]" />
              <p className="text-xs font-bold uppercase tracking-wider text-foreground animate-pulse">Loading Leaves...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table ref={tableRef}>
                <TableHeader className="bg-muted/20 border-b border-border/40">
                  <TableRow>
                    <TableHead className="px-3 py-4 text-[10px]">Employee</TableHead>
                    <TableHead className="px-3 py-4 text-[10px]">Leave Type</TableHead>
                    <TableHead className="px-3 py-4 text-[10px]">From</TableHead>
                    <TableHead className="px-3 py-4 text-[10px]">To</TableHead>
                    <TableHead className="px-3 py-4 text-[10px]">Days</TableHead>
                    <TableHead className="px-3 py-4 text-[10px]">Status</TableHead>
                    {canApprove && <TableHead className="px-3 py-4 text-[10px] text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {currentData.length > 0 ? (
                    currentData.map((req) => (
                      <TableRow 
                        key={req.id} 
                        className="hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => setSelectedRequest(req)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedRequest(req);
                          }
                        }}
                      >
                        <TableCell className="px-3 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-[#942392]/10 text-[#942392] flex items-center justify-center text-xs font-bold shrink-0">
                              {req.employee.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span
                                className="font-bold text-foreground group-hover:text-[#942392] transition-colors text-left"
                              >
                                {req.employee}
                              </span>
                              <span className="text-[11px] text-foreground mt-0.5">{req.branch}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3.5">
                          <span className="text-[12px] font-medium text-foreground flex items-center gap-1.5">
                            {req.type}
                            {req.reason && <Info className="w-3.5 h-3.5 text-slate-950 dark:text-slate-50" />}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-[12px] font-medium text-foreground">
                          {req.from}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-[12px] font-medium text-foreground">
                          {req.to}
                        </TableCell>
                        <TableCell className="px-3 py-3.5">
                          <Badge variant="secondary" className="bg-muted/50 font-medium text-foreground rounded-md px-2 py-0.5">
                            {req.days} {req.days > 1 ? 'Days' : 'Day'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-3.5">
                          <span 
                            className={`inline-flex justify-center items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider whitespace-normal text-center leading-tight max-w-[140px] ${
                              req.status === "Approved" ? "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                              req.status === "Rejected" ? "bg-rose-100/50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
                              "bg-[#C2410C] text-white"
                            }`}
                            style={req.status !== "Approved" && req.status !== "Rejected" ? { backgroundColor: "#C2410C", color: "white" } : {}}
                          >
                            {getDisplayStatus(req.status)}
                          </span>
                        </TableCell>
                        {canApprove && (
                          <TableCell className="px-3 py-3.5 text-right">
                            {((req.status.trim().startsWith("Pending HOD") && role === "head_of_department") ||
                              (req.status.trim() === "Pending Branch Leader" && role === "branch_leader") ||
                              ((req.status.trim() === "Pending Operation" || req.status.trim() === "Pending Operation Manager" || req.status.trim() === "Pending Finance" || req.status.trim() === "Pending Finance Manager") && (role === "operation_manager" || (role as string) === "finance_manager")) ||
                              (req.status.trim() === "Pending MD" && role === "managing_director")) ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-10 w-10 rounded-md p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-500 shadow-sm transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAction(req.id, "approve", req.status);
                                  }}
                                  title="Approve"
                                >
                                  <Check className="h-6 w-6" strokeWidth={3} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-10 w-10 rounded-md p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-2 border-rose-200 hover:border-rose-500 shadow-sm transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAction(req.id, "reject", req.status);
                                  }}
                                  title="Reject"
                                >
                                  <X className="h-6 w-6" strokeWidth={3} />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-foreground/60 font-medium italic">No Action</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canApprove ? 7 : 6} className="h-32 text-center text-foreground">
                        No leave requests found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && filteredRequests.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                  <span>TOTAL SHOWING {((currentPage - 1) * itemsPerPage) + 1} TO {Math.min(currentPage * itemsPerPage, filteredRequests.length)} OF {filteredRequests.length} ENTRIES</span>
                  <div className="flex items-center gap-2">
                    <span>Show</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
                      <SelectTrigger className="h-7 text-[10px] font-bold rounded border-border w-[60px]">
                        <SelectValue placeholder={itemsPerPage.toString()}>{itemsPerPage}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                    <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[10px] font-bold rounded"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  {"<"}
                </Button>
                <div className="flex items-center gap-1 overflow-x-auto max-w-[150px] sm:max-w-none scrollbar-hide">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-7 w-7 p-0 text-[10px] font-bold rounded ${currentPage === pageNum ? 'bg-[#942392] text-white hover:bg-[#680082]' : 'text-foreground'}`}
                    >
                      {pageNum}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[10px] font-bold rounded"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  {">"}
                </Button>
              </div>
            </div>
          )}
          <TableScrollTopButton entriesPerPage={itemsPerPage} threshold={50} tableRef={tableRef} />
        </CardContent>
      </Card>

          </div>
        </CardContent>
      </Card>

      <LeaveDetailsModal
        selectedRequest={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        role={role}
      />

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
              <label htmlFor="remarks" className="text-[10px] font-black uppercase text-foreground tracking-widest px-1">Remarks / Comments (Optional)</label>
              <textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Type your feedback here..."
                className="w-full min-h-[120px] rounded-[20px] border-border/50 bg-muted/30 focus:border-[#942392] focus:ring-[#942392] text-sm p-4 transition-all"
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
