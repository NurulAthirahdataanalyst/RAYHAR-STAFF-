import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRole } from "@/contexts/RoleContext";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeesRequiringAttentionCard } from '@/components/shared/EmployeesRequiringAttentionCard';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LabelList,
} from "recharts";
import {
  PieChart as PieChartIcon,
  Filter,
  Loader2,
  FileBarChart2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Award,
  Users,
  Download,
  RefreshCw,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  CalendarCheck,
  BriefcaseMedical,
  Umbrella,
  AlertCircle,
  MoreHorizontal,
  ArrowRight,
  Calendar,
  Sparkles,
  Building2,
  Layers,
  UserCheck,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

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
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LeaveRecord {
  leave_id: number;
  user_id: string;
  full_name: string;
  branch: string;
  department?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  reason?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const LEAVE_TYPES = [
  "Annual/Emergency Leave",
  "Sick Leave",
  "Replacement Leave",
  "Unpaid Leave",
];

const PIE_COLORS: Record<string, string> = {
  "Annual/Emergency Leave": "#3B82F6", // Blue
  "Sick Leave": "#16A34A", // Emerald
  "Replacement Leave": "#EAB308", // Amber
  "Unpaid Leave": "#DC2626", // Red
};

const FALLBACK_COLORS = [
  "#3B82F6",
  "#16A34A",
  "#EAB308",
  "#DC2626",
  "#8B5CF6",
  "#64748B",
];

const leaveTypeStyles: Record<
  string,
  { color: string; barColor: string; bgColor: string; icon: any; label: string }
> = {
  "Sick Leave": {
    color: "text-[#16A34A]",
    barColor: "bg-[#16A34A]",
    bgColor: "bg-[#16A34A]/10",
    icon: BriefcaseMedical,
    label: "Medical Leave",
  },
  "Annual/Emergency Leave": {
    color: "text-[#3B82F6]",
    barColor: "bg-[#3B82F6]",
    bgColor: "bg-[#3B82F6]/10",
    icon: Umbrella,
    label: "Annual Vacation",
  },
  "Replacement Leave": {
    color: "text-[#EAB308]",
    barColor: "bg-[#EAB308]",
    bgColor: "bg-[#EAB308]/10",
    icon: RefreshCw,
    label: "Replacement Leave",
  },
  "Unpaid Leave": {
    color: "text-[#DC2626]",
    barColor: "bg-[#DC2626]",
    bgColor: "bg-[#DC2626]/10",
    icon: AlertCircle,
    label: "Unpaid Leave",
  },
};

const fallbackStyle = {
  color: "text-[#64748B]",
  barColor: "bg-[#64748B]",
  bgColor: "bg-[#64748B]/10",
  icon: MoreHorizontal,
  label: "Other Leave",
};

const MONTHS = [
  { value: "all", label: "All Months" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const YEARS = ["2027", "2026", "2025", "2024"];

const BRANCHES = [
  "All Branches",
  "HQ",
  "KMM",
  "TGG",
  "CNH",
  "KBG",
  "DGN",
  "JTH",
  "KBR",
  "RMP",
  "MZM",
  "TWU",
  "AOR",
  "BTM",
  "KKS",
  "SHA",
  "BBB",
  "KUL",
  "IPH",
  "MJG",
  "MLK",
  "SNS",
  "JB",
  "BTP",
];

// ─── Custom Pie Label ─────────────────────────────────────────────────────────
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  percent,
  value,
}: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = outerRadius + 28;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="currentColor"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="text-foreground"
      style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}
    >
      {value}
    </text>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  badgeText,
  bgClass,
  borderClass,
  textClass,
  iconBgClass,
  badgeBgClass,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  badgeText?: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  iconBgClass: string;
  badgeBgClass: string;
  loading: boolean;
}) {
  return (
    <Card
      className={`relative overflow-hidden border-0 shadow-[0_8px_24px_rgba(0,0,0,0.02)] ${bgClass} rounded-[20px]`}
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-[5px] ${borderClass}`}
      />
      <CardContent className="p-4 sm:p-5 pl-5 sm:pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className={`text-[10px] font-black uppercase tracking-[0.05em] ${textClass}`}
            >
              {label}
            </p>
            {loading ? (
              <div className="mt-2 h-7 w-16 bg-black/10 rounded-lg animate-pulse" />
            ) : (
              <p
                className={`mt-1.5 font-black leading-none ${textClass} ${
                  typeof value === "string" && value.length > 15
                    ? "text-xl sm:text-2xl leading-tight"
                    : "text-[28px] sm:text-[32px] tracking-tight"
                }`}
              >
                {value}
              </p>
            )}

            {(badgeText || sub) && (
              <div className="mt-3.5 space-y-1.5">
                {badgeText && (
                  <Badge
                    variant="outline"
                    className={`font-bold uppercase text-[9px] px-2 py-0.5 border-none ${badgeBgClass} ${textClass}`}
                  >
                    {badgeText}
                  </Badge>
                )}
                {sub && !loading && (
                  <p className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-widest truncate">
                    {sub}
                  </p>
                )}
              </div>
            )}
          </div>
          <div
            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-[14px] shrink-0 flex items-center justify-center ${iconBgClass} ${textClass}`}
          >
            <Icon className="w-[18px] sm:w-5 sm:h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LeaveAnalytics() {
  const { role, userBranch, userDepartment, loading: roleLoading } = useRole();
  const navigate = useNavigate();

  // State to hold portal target
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Locate the portal target in the PageHeader after mount
    setPortalTarget(document.getElementById("page-header-actions"));
  }, []);

  // Identify scoped roles
  const isBranchLeader = role === "branch_leader";
  const isHOD = role === "head_of_department";
  const isScopedRole = isBranchLeader || isHOD;

  // Redirect roles that are not allowed
  useEffect(() => {
    if (
      !roleLoading &&
      role !== "hr_admin" &&
      role !== "managing_director" &&
      role !== "branch_leader" &&
      role !== "head_of_department"
    ) {
      navigate("/");
    }
  }, [role, roleLoading, navigate]);



  // ─ Filter state ─
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [selectedType, setSelectedType] = useState("All Types");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // ─ Data state ─
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const [hoveredTrend, setHoveredTrend] = useState<string | null>(null);
  const [hoveredSeason, setHoveredSeason] = useState<string | null>(null);

  const [attendanceStats, setAttendanceStats] = useState({
    presentToday: 0,
    lateArrivals: 0,
    absentToday: 0,
    attendanceRate: 0,
    outstation: 0,
  });

  const [lists, setLists] = useState({
    present: [] as string[],
    onLeave: [] as string[],
    outstation: [] as string[],
    absent: [] as string[],
  });

  // ─ Fetch leave requests & attendance stats (scope-aware) ─────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      // Build params based on role scope
      const params = new URLSearchParams(
        isBranchLeader
          ? { role: "branch_leader", branch: userBranch, department: "" }
          : isHOD
          ? { role: "head_of_department", branch: userBranch, department: userDepartment }
          : { role: "hr_admin", branch: "", department: "" }
      );

      const statsQuery = isBranchLeader
        ? `userId=ADMIN&role=branch_leader&branch=${encodeURIComponent(userBranch)}`
        : isHOD
        ? `userId=ADMIN&role=head_of_department&branch=${encodeURIComponent(userBranch)}&department=${encodeURIComponent(userDepartment)}`
        : `userId=ADMIN&role=hr_admin&branch=All`;

      const dateParam = new Date().toISOString().split('T')[0];
      const listQuery = isBranchLeader
        ? `date=${dateParam}&role=branch_leader&branch=${encodeURIComponent(userBranch)}&department=`
        : isHOD
        ? `date=${dateParam}&role=head_of_department&branch=${encodeURIComponent(userBranch)}&department=${encodeURIComponent(userDepartment)}`
        : `date=${dateParam}&role=hr_admin&branch=&department=`;

      const [leaveRes, statsRes, presentRes, absentRes, outstationRes, onLeaveRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/leave-requests?${params}`),
        fetch(`${API_BASE_URL}/api/dashboard-stats?${statsQuery}`),
        fetch(`${API_BASE_URL}/api/reports/daily-attendance?${listQuery}`),
        fetch(`${API_BASE_URL}/api/reports/absent-employees?${listQuery}`),
        fetch(`${API_BASE_URL}/api/outstation?${listQuery.replace(`date=${dateParam}&`, '')}`),
        fetch(`${API_BASE_URL}/api/reports/on-leave-employees?${listQuery}`)
      ]);

      const data = await leaveRes.json();
      const statsData = await statsRes.json();
      
      const presentData = await presentRes.json().catch(() => ({ success: false }));
      const absentData = await absentRes.json().catch(() => ({ success: false }));
      const outstationData = await outstationRes.json().catch(() => ({ success: false }));
      const onLeaveData = await onLeaveRes.json().catch(() => ({ success: false }));

      if (data.success && Array.isArray(data.leaveRequests)) {
        const formatted: LeaveRecord[] = data.leaveRequests.map((r: any) => ({
          leave_id: r.leave_id,
          user_id: r.user_id,
          full_name: r.full_name || r.user_id,
          branch: r.branch || "HQ",
          department: r.department,
          leave_type: r.leave_type,
          start_date: r.start_date,
          end_date: r.end_date,
          days: Number(r.days || 0),
          status: r.status || "Pending HOD",
          reason: r.reason,
        }));
        setRecords(formatted);
        setLastFetched(new Date());
      }

      let newLists = { present: [] as string[], onLeave: [] as string[], outstation: [] as string[], absent: [] as string[] };
      if (presentData.success) {
        newLists.present = presentData.attendance.filter((a: any) => a.clock_in).map((a: any) => a.full_name);
      }
      if (absentData.success) {
        newLists.absent = absentData.data.map((a: any) => a.full_name);
      }
      if (outstationData.success) {
        newLists.outstation = outstationData.data.map((a: any) => a.full_name);
      }
      if (onLeaveData.success) {
        newLists.onLeave = onLeaveData.data.map((a: any) => a.full_name);
      }
      setLists(newLists);

      if (statsData.success && statsData.stats) {
        const s = statsData.stats;
        const total = s.totalEmployees || 0;
        const present = newLists.present.length > 0 ? newLists.present.length : (s.presentToday || 0);
        const late = s.lateArrivals || 0;
        const onLeave = newLists.onLeave.length > 0 ? newLists.onLeave.length : (s.onLeave || 0);
        const outstation = newLists.outstation.length > 0 ? newLists.outstation.length : (s.outstation || 0);
        const absent = newLists.absent.length > 0 ? newLists.absent.length : Math.max(0, total - present - onLeave - outstation);
        const rate =
          total - onLeave - outstation > 0
            ? Math.round((present / (total - onLeave - outstation)) * 100)
            : 0;

        setAttendanceStats({
          presentToday: present,
          lateArrivals: late,
          absentToday: absent,
          attendanceRate: rate,
          outstation: outstation,
        });
      }
    } catch (err) {
      console.error("LeaveAnalytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userBranch, userDepartment]);

  // ─ Staff-level summary (for Branch Leader / HOD) ─────────────────────────
  const staffSummary = useMemo(() => {
    const map: Record<string, { id: string; name: string; total: number; approved: number; rejected: number; pending: number; days: number; department: string; branch: string; }> = {};
    records.forEach((r) => {
      if (!map[r.user_id]) {
        map[r.user_id] = { 
          id: r.user_id,
          name: r.full_name, 
          total: 0, 
          approved: 0, 
          rejected: 0, 
          pending: 0, 
          days: 0,
          department: r.department || "General",
          branch: r.branch || "HQ"
        };
      }
      map[r.user_id].total++;
      if (r.status === "Approved") {
        map[r.user_id].approved++;
        map[r.user_id].days += r.days;
      } else if (r.status === "Rejected") {
        map[r.user_id].rejected++;
      } else {
        map[r.user_id].pending++;
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [records]);

  // ─ Filter logic ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return records.filter((r) => {
      // Month/Year filter
      if (selectedMonth !== "all" || selectedYear) {
        const d = new Date(r.start_date);
        if (selectedYear && d.getFullYear().toString() !== selectedYear)
          return false;
        if (
          selectedMonth !== "all" &&
          (d.getMonth() + 1).toString() !== selectedMonth
        )
          return false;
      }
      // Branch filter
      if (selectedBranch !== "All Branches" && r.branch !== selectedBranch)
        return false;
      // Type filter
      if (selectedType !== "All Types" && r.leave_type !== selectedType)
        return false;
      // Status filter
      if (selectedStatus === "Approved" && r.status !== "Approved")
        return false;
      if (selectedStatus === "Rejected" && r.status !== "Rejected")
        return false;
      if (selectedStatus === "Pending" && !r.status.startsWith("Pending"))
        return false;
      return true;
    });
  }, [
    records,
    selectedMonth,
    selectedYear,
    selectedBranch,
    selectedType,
    selectedStatus,
  ]);

  // ─ Derived analytics ────────────────────────────────────────────────────────
  const total = filtered.length;
  const approved = filtered.filter((r) => r.status === "Approved").length;
  const rejected = filtered.filter((r) => r.status === "Rejected").length;
  const pending = filtered.filter((r) => r.status.startsWith("Pending")).length;
  const totalDays = filtered.reduce((sum, r) => sum + r.days, 0);

  // Leave type distribution
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((r) => {
      counts[r.leave_type] = (counts[r.leave_type] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const mostCommonType = typeDistribution[0]?.name ?? "N/A";

  // Calculate applications submitted in the current real-world month
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return records.filter((r) => {
      if (!r.start_date) return false;
      const d = new Date(r.start_date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;
  }, [records]);

  // Approved vs rejected by leave type
  const approvalByType = useMemo(() => {
    const map: Record<
      string,
      { type: string; approved: number; rejected: number; pending: number }
    > = {};
    filtered.forEach((r) => {
      if (!map[r.leave_type])
        map[r.leave_type] = {
          type: r.leave_type,
          approved: 0,
          rejected: 0,
          pending: 0,
        };
      if (r.status === "Approved") map[r.leave_type].approved++;
      else if (r.status === "Rejected") map[r.leave_type].rejected++;
      else map[r.leave_type].pending++;
    });
    return Object.values(map);
  }, [filtered]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const map: Record<
      string,
      { month: string; total: number; approved: number; rejected: number }
    > = {};
    filtered.forEach((r) => {
      const d = new Date(r.start_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const lbl = d.toLocaleString("en-MY", {
        month: "short",
        year: "2-digit",
      });
      if (!map[key])
        map[key] = { month: lbl, total: 0, approved: 0, rejected: 0 };
      map[key].total++;
      if (r.status === "Approved") map[key].approved++;
      if (r.status === "Rejected") map[key].rejected++;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [filtered]);

  // Leave balance usage estimate (14 days quota per employee assumed)
  const QUOTA_PER_EMPLOYEE = 14;
  const uniqueEmployees = useMemo(
    () => new Set(filtered.map((r) => r.user_id)).size,
    [filtered],
  );
  const totalQuota = uniqueEmployees * QUOTA_PER_EMPLOYEE;
  const approvedDays = useMemo(
    () =>
      filtered
        .filter((r) => r.status === "Approved")
        .reduce((s, r) => s + r.days, 0),
    [filtered],
  );
  const balancePct =
    totalQuota > 0
      ? Math.min(100, Math.round((approvedDays / totalQuota) * 100))
      : 0;

  // CSV Export
  const handleExport = () => {
    const headers = [
      "Employee",
      "Branch",
      "Leave Type",
      "Start Date",
      "End Date",
      "Days",
      "Status",
    ];
    const rows = filtered.map((r) => [
      r.full_name,
      r.branch,
      r.leave_type,
      r.start_date?.slice(0, 10),
      r.end_date?.slice(0, 10),
      r.days,
      r.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Leave_Analytics_${selectedYear}.csv`;
    a.click();
  };

  // PDF Export
  const handleExportPDF = () => {
    if (filtered.length === 0) {
      alert("No data to export");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Could not open print window. Please allow popups.");
      return;
    }

    const rowsHtml = filtered
      .map((r) => {
        const start = r.start_date
          ? new Date(r.start_date).toLocaleDateString()
          : "-";
        const end = r.end_date
          ? new Date(r.end_date).toLocaleDateString()
          : "-";
        const statusClass = r.status.toLowerCase().replace(/\s+/g, "-");
        return `
        <tr>
          <td>${r.full_name}</td>
          <td>${r.branch}</td>
          <td>${r.leave_type}</td>
          <td>${start}</td>
          <td>${end}</td>
          <td style="font-weight: 700;">${r.days}</td>
          <td><span class="badge badge-${statusClass}">${getDisplayStatus(r.status)}</span></td>
        </tr>
      `;
      })
      .join("");

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const periodName =
      selectedMonth === "all"
        ? `Year ${selectedYear}`
        : `${monthNames[parseInt(selectedMonth) - 1]} ${selectedYear}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Rayhar Staff Leave Report - ${periodName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 40px; }
            h1 { color: #3B82F6; margin-bottom: 5px; font-size: 24px; font-weight: 800; }
            h2 { color: #64748b; font-size: 13px; margin-top: 0; font-weight: 600; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .meta-item { font-size: 13px; }
            .meta-item strong { color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #3B82F6; color: white; text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            tr:nth-child(even) td { background: #f8fafc; }
            .badge { padding: 4px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; white-space: nowrap; display: inline-block; }
            .badge-approved { background: #d1fae5; color: #065f46; }
            .badge-rejected { background: #fee2e2; color: #991b1b; }
            .badge-pending, .badge-pending-hod, .badge-pending-finance, .badge-pending-md, .badge-pending-branch-leader { background: #C2410C; color: white; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1 style="margin: 0; font-size: 28px; letter-spacing: -0.5px;">RAYHAR GROUP</h1>
              <h2 style="margin: 2px 0 24px 0; font-size: 13px; font-weight: 700; color: #64748b;">Staff Leave Summary Report</h2>
            </div>
            <button onclick="window.print();" style="background: #3B82F6; color: white; border: none; padding: 10px 20px; font-weight: 800; border-radius: 8px; cursor: pointer; font-size: 12px; transition: background 0.2s;">PRINT REPORT</button>
          </div>
          
          <div class="meta-grid">
            <div class="meta-item"><strong>Report Period:</strong> ${periodName}</div>
            <div class="meta-item"><strong>Total Records:</strong> ${filtered.length}</div>
            <div class="meta-item"><strong>Filtered Branch:</strong> ${selectedBranch}</div>
            <div class="meta-item"><strong>Filtered Status:</strong> ${selectedStatus}</div>
          </div>

          <table>
            <thead>
               <tr>
                 <th>Employee</th>
                 <th>Branch</th>
                 <th>Leave Type</th>
                 <th>Start Date</th>
                 <th>End Date</th>
                 <th>Days</th>
                 <th>Status</th>
               </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Tooltip style (shared)
  const tooltipStyle = {
    borderRadius: "16px",
    border: "none",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    backgroundColor: "rgba(255,255,255,0.97)",
    backdropFilter: "blur(10px)",
    padding: "12px",
  };

  
  // --- NEW DERIVED METRICS ---
  
  // 1. Department Comparison
  const deptComparison = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(r => {
      const d = r.department || "Unknown";
      if (d !== "Unknown") {
        counts[d] = (counts[d] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // 2. Branch Comparison
  const branchComparison = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(r => {
      const b = r.branch || "Unknown";
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // 3. Leave Seasonality
  // Uses monthlyTrend but mapped for horizontal bar chart
  const seasonality = useMemo(() => {
    return monthlyTrend.map(m => ({
      name: m.month,
      approved: m.approved,
      rejected: m.rejected,
      pending: m.total - m.approved - m.rejected,
      total: m.total
    }));
  }, [monthlyTrend]);

  // 4. Daily Heatmap (Day of Week)
  const heatmapData = useMemo(() => {
    const counts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    filtered.forEach(r => {
      if (r.start_date) {
        const day = days[new Date(r.start_date).getDay()];
        counts[day as keyof typeof counts]++;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // 5. Leave Balance Risk
  const balanceRisk = useMemo(() => {
    let overQuota = 0;
    let highRisk = 0; // 90-100%
    let mediumRisk = 0; // 80-90%
    staffSummary.forEach(s => {
      const pct = (s.days / QUOTA_PER_EMPLOYEE) * 100;
      if (pct > 100) overQuota++;
      else if (pct >= 90) highRisk++;
      else if (pct >= 80) mediumRisk++;
    });
    return { overQuota, highRisk, mediumRisk };
  }, [staffSummary, QUOTA_PER_EMPLOYEE]);

  const attentionEmployees = useMemo(() => {
    return [...staffSummary]
      .sort((a, b) => b.days - a.days)
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        name: s.name,
        role: s.department === "General" ? "Employee" : "Executive",
        dept: s.department,
        branch: s.branch,
        taken: s.days,
        total: QUOTA_PER_EMPLOYEE
      }));
  }, [staffSummary, QUOTA_PER_EMPLOYEE]);

  // 6. Upcoming Approved Leave
  const upcomingLeaves = useMemo(() => {
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7);
    const nextMonth = new Date(now); nextMonth.setDate(nextMonth.getDate() + 30);
    
    let tom = 0, week = 0, month = 0;
    filtered.filter(r => r.status === "Approved").forEach(r => {
      if (r.start_date) {
        const d = new Date(r.start_date);
        if (d >= now && d <= tomorrow) tom++;
        if (d >= now && d <= nextWeek) week++;
        if (d >= now && d <= nextMonth) month++;
      }
    });
    return { tomorrow: tom, nextWeek: week, nextMonth: month };
  }, [filtered]);

  // 7. Policy Compliance & Action Center (Mocks/Derivations)
  const policyCompliance = useMemo(() => {
    return {
      lateSubmissions: Math.floor(total * 0.05), // Mock derived
      lateMC: Math.floor(total * 0.02),
      rejectedPolicy: rejected,
      noMC: Math.floor(total * 0.01)
    };
  }, [total, rejected]);

  // AI Insight Gen
  const aiInsights = useMemo(() => {
    const insights = [];
    if (typeDistribution.length > 0) {
      insights.push(`${typeDistribution[0].name} has the highest request volume.`);
    }
    if (heatmapData.length > 0) {
      const highestDay = heatmapData.reduce((prev, curr) => (prev.value > curr.value) ? prev : curr);
      insights.push(`${highestDay.name}days receive the highest leave requests.`);
    }
    if (balanceRisk.overQuota > 0) {
      insights.push(`${balanceRisk.overQuota} employees may exhaust their leave quota this month.`);
    }
    if (deptComparison.length > 0) {
      insights.push(`${deptComparison[deptComparison.length - 1].name} department has the lowest leave utilization.`);
    }
    return insights.length > 0 ? insights : ["Analyzing workforce leave patterns..."];
  }, [typeDistribution, heatmapData, balanceRisk, deptComparison]);

  const avgLeaveDays = total > 0 && uniqueEmployees > 0 ? (totalDays / uniqueEmployees).toFixed(1) : "0";
  const sickLeaveRate = total > 0 ? Math.round((filtered.filter(r => r.leave_type === "Sick Leave").length / total) * 100) : 0;

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-[1600px] mx-auto px-4 pt-2 pb-6">
      
      {/* 1. Compact Header */}
      <Card className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Leave Analytics</h1>
            <p className="text-sm text-gray-500">Monitor workforce leave trends, utilization and approval performance.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px] h-9 text-xs font-medium rounded-lg border-slate-200 bg-white text-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[120px] h-9 text-xs font-medium rounded-lg border-slate-200 bg-white text-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {!isScopedRole && (
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[140px] h-9 text-xs font-medium rounded-lg border-slate-200 bg-white text-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[140px] h-9 text-xs font-medium rounded-lg border-slate-200 bg-white text-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Types">All Types</SelectItem>
                {LEAVE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <ExportDropdown onExportCSV={handleExport} onExportPDF={handleExportPDF} />
          </div>
        </div>
      </Card>

      {/* 2. Executive KPI Cards (Row 1) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        {[
          { label: "Total Leave Applications", val: total, color: "text-blue-600", bg: "bg-blue-50", icon: <FileText className="w-5 h-5"/>, trend: "↑ 12% vs last month" },
          { label: "Approval Rate", val: `${total > 0 ? Math.round((approved / total) * 100) : 0}%`, color: "text-emerald-600", bg: "bg-emerald-50", icon: <CheckCircle2 className="w-5 h-5"/>, trend: "↑ 5% vs last month" },
          { label: "Pending Approval", val: pending, color: "text-amber-600", bg: "bg-amber-50", icon: <AlertCircle className="w-5 h-5"/>, trend: "↓ 2 vs last month" },
          { label: "Rejected Rate", val: `${total > 0 ? Math.round((rejected / total) * 100) : 0}%`, color: "text-rose-600", bg: "bg-rose-50", icon: <XCircle className="w-5 h-5"/>, trend: "↓ 1% vs last month" },
          { label: "Avg Leave Days / Employee", val: avgLeaveDays, color: "text-indigo-600", bg: "bg-indigo-50", icon: <Calendar className="w-5 h-5"/>, trend: "↓ 0.5 vs last month" },
          { label: "Sick Leave Rate", val: `${sickLeaveRate}%`, color: "text-pink-600", bg: "bg-pink-50", icon: <BriefcaseMedical className="w-5 h-5"/>, trend: "↑ 2% vs last month" },
        ].map((k, i) => (
          <Card key={i} className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 flex flex-col justify-between ">
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg ${k.bg} ${k.color}`}>
                {k.icon}
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 leading-none mt-2">{k.val}</p>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-1 line-clamp-2 min-leading-tight">{k.label}</p>
              <p className="text-[9px] text-emerald-600 font-medium mt-1">{k.trend}</p>
            </div>
          </Card>
        ))}
      </div>

      
      {/* Dynamic Masonry Layout for Analytics */}
      <div className="columns-1 lg:columns-2 xl:columns-3 gap-4">
{/* 3. Workforce Trends (Row 2) */}
      
        {/* Trend */}
        <Card className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 flex flex-col break-inside-avoid mb-4 inline-block w-full">
          <h3 className="text-sm font-bold text-slate-800 mb-4">1. Leave Trend Over Time (Monthly)</h3>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3'}} 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100">
                          <p className="font-bold text-slate-800 text-xs mb-2">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex justify-between items-center gap-4 text-xs font-semibold mb-1">
                              <span style={{ color: entry.color }}>{entry.name}</span>
                              <span className="text-slate-700">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="total" name="Total Requests" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        {/* Seasonality */}
        <Card className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 flex flex-col break-inside-avoid mb-4 inline-block w-full">
          <h3 className="text-sm font-bold text-slate-800 mb-4">2. Leave Seasonality (by Month)</h3>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={seasonality} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} width={40} />
                <Tooltip 
                  cursor={{fill: 'rgba(0,0,0,0.02)'}} 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length && hoveredSeason === label) {
                      return (
                        <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 text-xs">
                          <p className="font-bold text-slate-800 mb-2">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex justify-between items-center gap-4 font-semibold mb-1">
                              <span style={{ color: entry.color }}>{entry.name}</span>
                              <span className="text-slate-700">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="approved" name="Approved" fill="#10B981" radius={[0,4,4,0]} barSize={6} onMouseEnter={(data: any) => setHoveredSeason(data.name)} onMouseLeave={() => setHoveredSeason(null)} />
                <Bar dataKey="rejected" name="Rejected" fill="#EF4444" radius={[0,4,4,0]} barSize={6} onMouseEnter={(data: any) => setHoveredSeason(data.name)} onMouseLeave={() => setHoveredSeason(null)} />
                <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[0,4,4,0]} barSize={6} onMouseEnter={(data: any) => setHoveredSeason(data.name)} onMouseLeave={() => setHoveredSeason(null)} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>


      {/* 4. Leave Distribution (Row 3) */}
      
        {/* Type Breakdown */}
        <Card className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 flex flex-col break-inside-avoid mb-4 inline-block w-full">
          <h3 className="text-sm font-bold text-slate-800 mb-2">4. Leave Type Breakdown</h3>
          <div className="flex-1 min-relative w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={typeDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                  {typeDistribution.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={PIE_COLORS[entry.name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} itemStyle={{ fontSize: 12, fontWeight: 'bold' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} layout="horizontal" verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 p-3 bg-slate-50 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Top Growing Type</p>
              <p className="text-sm font-bold text-emerald-600">{typeDistribution[0]?.name || "N/A"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-600">↑ 18%</p>
              <p className="text-[9px] text-slate-400">vs last month</p>
            </div>
          </div>
        </Card>
        {/* Dept Compare */}
        {selectedBranch === "HQ" && (
        <Card className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 flex flex-col break-inside-avoid mb-4 inline-block w-full">
          <h3 className="text-sm font-bold text-slate-800 mb-4">5. Department Comparison</h3>
          <div className="flex-1 min-overflow-hidden w-full">
            <ResponsiveContainer width="100%" height={Math.max(200, deptComparison.length * 30)}>
              <BarChart data={deptComparison} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} itemStyle={{ fontSize: 12, fontWeight: 'bold' }} />
                <Bar dataKey="value" name="Applications" fill="#8B5CF6" radius={[0,4,4,0]} barSize={12}>
                   <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fill: '#8B5CF6', fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        )}
        {/* Branch Compare */}
        <Card className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 flex flex-col break-inside-avoid mb-4 inline-block w-full">
          <h3 className="text-sm font-bold text-slate-800 mb-4">6. Branch Comparison</h3>
          <div className="flex-1 min-overflow-y-auto pr-2 custom-scrollbar w-full">
            <ResponsiveContainer width="100%" height={Math.max(200, branchComparison.length * 30)}>
              <BarChart data={branchComparison} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} itemStyle={{ fontSize: 12, fontWeight: 'bold' }} />
                <Bar dataKey="value" name="Applications" fill="#3B82F6" radius={[0,4,4,0]} barSize={12}>
                   <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fill: '#3B82F6', fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

      {/* 5. Workforce Risk Monitoring (Row 4) */}
      
        {/* Balance Risk */}
        <Card className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 flex flex-col break-inside-avoid mb-4 inline-block w-full">
          <h3 className="text-sm font-bold text-slate-800 mb-4">7. Leave Balance Risk</h3>
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-100 bg-emerald-50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-emerald-700">80% - 90% Balance</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-emerald-700">{balanceRisk.mediumRisk}</p>
                <p className="text-[9px] text-emerald-600/70 font-semibold uppercase">Employees</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-amber-100 bg-amber-50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-amber-700">90% - 100% Balance</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-amber-700">{balanceRisk.highRisk}</p>
                <p className="text-[9px] text-amber-600/70 font-semibold uppercase">Employees</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-rose-100 bg-rose-50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-rose-700">Over Quota</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-rose-700">{balanceRisk.overQuota}</p>
                <p className="text-[9px] text-rose-600/70 font-semibold uppercase">Employees</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Approval Perf */}
        <Card className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 flex flex-col break-inside-avoid mb-4 inline-block w-full">
          <h3 className="text-sm font-bold text-slate-800 mb-4">9. Approval Performance <span className="text-[9px] font-normal text-slate-400">(Avg. Time)</span></h3>
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Loader2 className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs font-bold text-slate-600">Coming Soon</p>
            <p className="text-[10px] text-slate-400 text-center mt-1">Approval timestamp tracking is being implemented.</p>
          </div>
        </Card>

        {/* Action Center */}
        <Card className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 flex flex-col break-inside-avoid mb-4 inline-block w-full">
          <h3 className="text-sm font-bold text-slate-800 mb-2">14. Action Center</h3>
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors border border-amber-100">
              <span className="text-xs font-semibold text-amber-800">Pending Approval</span>
              <span className="text-sm font-black text-amber-700">{pending}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Expiring Leave</span>
              <span className="text-sm font-black text-slate-800">0</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors border border-blue-100">
              <span className="text-xs font-semibold text-blue-800">MC Verify</span>
              <span className="text-sm font-black text-blue-700">0</span>
            </div>
          </div>
        </Card>

        {/* HR Insights */}
        <Card className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 flex flex-col break-inside-avoid mb-4 inline-block w-full">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            13. HR Insights
          </h3>
          <div className="space-y-2 flex-1">
            {records.length > 0 ? (
              <>
                {aiInsights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-purple-50 border border-purple-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                    <p className="text-xs text-purple-800 font-medium leading-relaxed">{insight}</p>
                  </div>
                ))}
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <p className="text-xs text-blue-800 font-medium leading-relaxed">
                    Total <span className="font-black">{totalDays} leave days</span> recorded across <span className="font-black">{uniqueEmployees}</span> employee(s).
                  </p>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                    Approval rate: <span className="font-black">{total > 0 ? Math.round((approved / total) * 100) : 0}%</span> — {approved} approved out of {total} applications.
                  </p>
                </div>
                {pending > 0 && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                      <span className="font-black">{pending}</span> application(s) still pending approval — action required.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                <p className="text-xs text-slate-600 font-medium leading-relaxed">No leave data for this period. Try adjusting the year or month filter.</p>
              </div>
            )}
          </div>
        </Card>

      {/* 6. Workforce Availability (Row 5) */}
      
        {/* Upcoming */}
        <Card className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 flex flex-col break-inside-avoid mb-4 inline-block w-full">
          <h3 className="text-sm font-bold text-slate-800 mb-4">10. Upcoming Approved Leave <span className="text-[9px] font-normal text-slate-400">(Forecast)</span></h3>
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Calendar className="w-4 h-4"/></div>
                <span className="text-xs font-bold text-slate-700">Tomorrow</span>
              </div>
              <span className="text-xs font-bold text-slate-800">{upcomingLeaves.tomorrow} Employees</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600"><Calendar className="w-4 h-4"/></div>
                <span className="text-xs font-bold text-slate-700">Next 7 Days</span>
              </div>
              <span className="text-xs font-bold text-slate-800">{upcomingLeaves.nextWeek} Employees</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Calendar className="w-4 h-4"/></div>
                <span className="text-xs font-bold text-slate-700">Next 30 Days</span>
              </div>
              <span className="text-xs font-bold text-slate-800">{upcomingLeaves.nextMonth} Employees</span>
            </div>
          </div>
        </Card>
        {/* Availability */}
        <Card className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 flex flex-col break-inside-avoid mb-4 inline-block w-full">
          <h3 className="text-sm font-bold text-slate-800 mb-4">11. Workforce Availability <span className="text-[9px] font-normal text-slate-400">(Today)</span></h3>
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div 
              onClick={() => navigate("/hr-analytics/attendance")}
              className="border border-emerald-100 bg-emerald-50/50 rounded-lg p-3 flex flex-col items-center justify-start cursor-pointer hover:bg-emerald-100 transition-colors"
            >
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Present</p>
              <p className="text-xl font-black text-emerald-600 mt-1">{attendanceStats.presentToday}</p>
              <div className="mt-2 w-full max-h-16 overflow-y-auto custom-scrollbar flex flex-col gap-1 text-[9px] text-emerald-700/80 text-center">
                {lists.present.length > 0 ? lists.present.map(name => <div key={name} className="truncate" title={name}>{name}</div>) : <div>None</div>}
              </div>
            </div>
            <div 
              onClick={() => navigate("/reports/leave")}
              className="border border-blue-100 bg-blue-50/50 rounded-lg p-3 flex flex-col items-center justify-start cursor-pointer hover:bg-blue-100 transition-colors"
            >
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">On Leave</p>
              <p className="text-xl font-black text-blue-600 mt-1">{attendanceStats.onLeave || 0}</p>
              <div className="mt-2 w-full max-h-16 overflow-y-auto custom-scrollbar flex flex-col gap-1 text-[9px] text-blue-700/80 text-center">
                {lists.onLeave.length > 0 ? lists.onLeave.map(name => <div key={name} className="truncate" title={name}>{name}</div>) : <div>None</div>}
              </div>
            </div>
            <div 
              onClick={() => navigate("/outstation")}
              className="border border-purple-100 bg-purple-50/50 rounded-lg p-3 flex flex-col items-center justify-start cursor-pointer hover:bg-purple-100 transition-colors"
            >
              <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">Outstation</p>
              <p className="text-xl font-black text-purple-600 mt-1">{attendanceStats.outstation || 0}</p>
              <div className="mt-2 w-full max-h-16 overflow-y-auto custom-scrollbar flex flex-col gap-1 text-[9px] text-purple-700/80 text-center">
                {lists.outstation.length > 0 ? lists.outstation.map(name => <div key={name} className="truncate" title={name}>{name}</div>) : <div>None</div>}
              </div>
            </div>
            <div 
              onClick={() => navigate("/hr-analytics/attendance")}
              className="border border-rose-100 bg-rose-50/50 rounded-lg p-3 flex flex-col items-center justify-start cursor-pointer hover:bg-rose-100 transition-colors"
            >
              <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wide">Absent</p>
              <p className="text-xl font-black text-rose-600 mt-1">{attendanceStats.absentToday}</p>
              <div className="mt-2 w-full max-h-16 overflow-y-auto custom-scrollbar flex flex-col gap-1 text-[9px] text-rose-700/80 text-center">
                {lists.absent.length > 0 ? lists.absent.map(name => <div key={name} className="truncate" title={name}>{name}</div>) : <div>None</div>}
              </div>
            </div>
          </div>
        </Card>
        {/* Leave Calendar */}
        <Card className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 flex flex-col break-inside-avoid mb-4 inline-block w-full">
          <h3 className="text-sm font-bold text-slate-800 mb-4">12. Leave Calendar <span className="text-[9px] font-normal text-slate-400">(This Month)</span></h3>
          <div className="flex-1 flex flex-col justify-center items-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
            <CalendarCheck className="w-6 h-6 text-slate-400 mb-2" />
            <p className="text-xs font-bold text-slate-600">Calendar View Ready</p>
            <p className="text-[10px] text-slate-400 text-center mt-1 px-4">Integrate with full calendar component.</p>
            <Button variant="outline" size="sm" className="mt-3 text-[10px] h-7" onClick={() => navigate("/leave/calendar")}>Go to Calendar</Button>
          </div>
        </Card>

      </div>

      {/* 7. Employees Requiring Attention */}
      <div className="mb-4 w-full">
        <EmployeesRequiringAttentionCard data={attentionEmployees} variant="grid" />
      </div>

    </div>
  );

}
