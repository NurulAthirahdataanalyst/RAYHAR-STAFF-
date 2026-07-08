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
  name,
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
      style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}
    >
      {`${(percent * 100).toFixed(0)}%`}
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
            <Icon className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
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

  const [attendanceStats, setAttendanceStats] = useState({
    presentToday: 0,
    lateArrivals: 0,
    absentToday: 0,
    attendanceRate: 0,
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

      const [leaveRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/leave-requests?${params}`),
        fetch(`${API_BASE_URL}/api/dashboard-stats?${statsQuery}`),
      ]);

      const data = await leaveRes.json();
      const statsData = await statsRes.json();

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

      if (statsData.success && statsData.stats) {
        const s = statsData.stats;
        const total = s.totalEmployees || 0;
        const present = s.presentToday || 0;
        const late = s.lateArrivals || 0;
        const onLeave = s.onLeave || 0;
        const absent = Math.max(0, total - present - onLeave);
        const rate =
          total - onLeave > 0
            ? Math.round((present / (total - onLeave)) * 100)
            : 0;

        setAttendanceStats({
          presentToday: present,
          lateArrivals: late,
          absentToday: absent,
          attendanceRate: rate,
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
    const map: Record<string, { name: string; total: number; approved: number; rejected: number; pending: number; days: number }> = {};
    records.forEach((r) => {
      if (!map[r.user_id]) {
        map[r.user_id] = { name: r.full_name, total: 0, approved: 0, rejected: 0, pending: 0, days: 0 };
      }
      map[r.user_id].total++;
      map[r.user_id].days += r.days;
      if (r.status === "Approved") map[r.user_id].approved++;
      else if (r.status === "Rejected") map[r.user_id].rejected++;
      else map[r.user_id].pending++;
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

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7B0099]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 pt-2 pb-6">

      {/* ── SCOPED CONTEXT BANNER for Branch Leader / HOD ── */}
      {isScopedRole && (
        <div className="relative overflow-hidden rounded-2xl border border-purple-200/60 bg-gradient-to-r from-[#7B0099]/5 via-purple-50 to-blue-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
          {/* decorative gradient orb */}
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-gradient-to-br from-purple-400/10 to-blue-400/10 blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl shadow-sm ${
              isBranchLeader ? "bg-gradient-to-br from-[#7B0099] to-purple-600" : "bg-gradient-to-br from-blue-600 to-indigo-700"
            }`}>
              {isBranchLeader ? <Building2 className="w-4 h-4 text-white" /> : <Layers className="w-4 h-4 text-white" />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-purple-600/70">
                {isBranchLeader ? "Branch Scope" : "Department Scope"}
              </p>
              <p className="text-[15px] font-black text-gray-800 leading-tight">
                {isBranchLeader
                  ? `Branch ${userBranch} — Leave Analytics`
                  : `${userDepartment} Department — Leave Analytics`}
              </p>
            </div>
          </div>
          <div className="sm:ml-auto flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-white border border-purple-200 text-purple-700 text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm uppercase tracking-widest">
              <UserCheck className="w-3 h-3" />
              {isBranchLeader ? `Viewing: ${userBranch}` : `Dept: ${userDepartment}`}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white border border-blue-200 text-blue-700 text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm uppercase tracking-widest">
              <Users className="w-3 h-3" />
              {records.length} Records
            </span>
          </div>
        </div>
      )}
      {/* ── LIVE PRESENCE PANEL ─────────────────────────────────────────── */}
      {/* ── LIVE LEAVE OVERVIEW & QUICK INSIGHTS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6 items-stretch">
        
        {/* Section 1: Live Leave Overview (takes 8 cols) */}
        <Card className="border border-gray-200/80 bg-white rounded-xl shadow-sm overflow-hidden ring-1 ring-black/5 lg:col-span-8 flex flex-col justify-between">
          <CardContent className="p-0 flex-1 flex flex-col justify-between">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 md:px-6 pt-4 pb-3 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-gradient-to-br from-[#800A7A] to-[#a855f7] rounded-xl shadow-md">
                  <CalendarCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-black text-gray-800 uppercase tracking-wide">
                      Live Leave Overview
                    </h2>
                    <span className="flex items-center gap-1.5 bg-purple-500 text-white border border-purple-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-widest shadow-sm shadow-purple-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    {lastFetched
                      ? `Updated ${lastFetched.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`
                      : `Analyzing ${filtered.length} active leaves`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchData()}
                  className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 h-8 rounded-md px-3 flex items-center gap-1.5 shadow-sm text-xs font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                  <span>Refresh</span>
                </Button>
                <ExportDropdown
                  onExportCSV={handleExport}
                  onExportPDF={handleExportPDF}
                />
              </div>
            </div>

            {/* KPI Cards inside Live Leave Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 md:p-6 bg-slate-50/30 flex-1 border-t border-gray-100">
              
              {/* Card 1: Total Applications */}
              <div className="bg-white border border-gray-200/60 rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Total Applications
                  </span>
                  <span className="text-[32px] font-black text-gray-900 leading-none mt-1">
                    {loading ? "—" : total}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 mt-2">
                    {totalDays} total days
                  </span>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              </div>

              {/* Card 2: Approved */}
              <div className="bg-white border border-gray-200/60 rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Approved
                  </span>
                  <span className="text-[32px] font-black text-gray-900 leading-none mt-1">
                    {loading ? "—" : approved}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 mt-2">
                    {total > 0
                      ? `${Math.round((approved / total) * 100)}% approval rate`
                      : "No data"}
                  </span>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              {/* Card 3: Rejected */}
              <div className="bg-white border border-gray-200/60 rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Rejected
                  </span>
                  <span className="text-[32px] font-black text-gray-900 leading-none mt-1">
                    {loading ? "—" : rejected}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 mt-2">
                    {total > 0
                      ? `${Math.round((rejected / total) * 100)}% rejection rate`
                      : "No data"}
                  </span>
                </div>
                <div className="p-2 bg-rose-50 rounded-lg text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>

              {/* Card 4: Most Common Type */}
              <div className="bg-white border border-gray-200/60 rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="flex flex-col min-w-0 flex-1 pr-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Most Common Type
                  </span>
                  <span className="text-[15px] font-black text-gray-900 leading-tight mt-2 mb-1 truncate" title={mostCommonType}>
                    {loading ? "—" : mostCommonType}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 mt-1">
                    {typeDistribution[0]
                      ? `${typeDistribution[0].value} applications`
                      : "No data"}
                  </span>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Section 2: Quick Insights (takes 4 cols - rightmost) */}
        <Card className="border border-gray-200/80 bg-white rounded-xl shadow-sm overflow-hidden ring-1 ring-black/5 lg:col-span-4 flex flex-col justify-between">
          <CardContent className="p-0 flex-1 flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 md:px-6 pt-5 pb-[15px] border-b border-gray-100 bg-white h-[69px]">
              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-[15px] font-black text-gray-800 uppercase tracking-wide">
                Quick Insights
              </h2>
            </div>

            {/* Content: 4 Columns with Progress Bars */}
            <div className="grid grid-cols-4 gap-3 p-4 md:p-6 bg-slate-50/30 flex-1 border-t border-gray-100 items-start">
              
              {/* Insight 1: Approval Rate */}
              <div className="flex flex-col h-full justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                    Approval Rate
                  </span>
                  <span className="text-lg font-black text-emerald-500 leading-none mt-2">
                    {total > 0 ? `${Math.round((approved / total) * 100)}%` : "0%"}
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-[9px] font-medium text-slate-400 leading-none">
                    {approved} approved
                  </span>
                  <div className="w-full bg-slate-100 rounded-full h-1 mt-2">
                    <div className="h-1 rounded-full bg-emerald-500" style={{ width: `${total > 0 ? (approved / total) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>

              {/* Insight 2: Rejection Rate */}
              <div className="flex flex-col h-full justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                    Rejection Rate
                  </span>
                  <span className="text-lg font-black text-rose-500 leading-none mt-2">
                    {total > 0 ? `${Math.round((rejected / total) * 100)}%` : "0%"}
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-[9px] font-medium text-slate-400 leading-none">
                    {rejected} rejected
                  </span>
                  <div className="w-full bg-slate-100 rounded-full h-1 mt-2">
                    <div className="h-1 rounded-full bg-rose-500" style={{ width: `${total > 0 ? (rejected / total) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>

              {/* Insight 3: Pending */}
              <div className="flex flex-col h-full justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                    Pending
                  </span>
                  <span className="text-lg font-black text-amber-500 leading-none mt-2">
                    {pending}
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-[9px] font-medium text-slate-400 leading-none">
                    {total > 0 ? `${Math.round((pending / total) * 100)}%` : "0%"} of total
                  </span>
                  <div className="w-full bg-slate-100 rounded-full h-1 mt-2">
                    <div className="h-1 rounded-full bg-amber-500" style={{ width: `${total > 0 ? (pending / total) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>

              {/* Insight 4: This Month */}
              <div className="flex flex-col h-full justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                    This Month
                  </span>
                  <span className="text-lg font-black text-purple-600 leading-none mt-2">
                    {thisMonthCount}
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-[9px] font-medium text-slate-400 leading-none">
                    Applications
                  </span>
                  <div className="w-full bg-slate-100 rounded-full h-1 mt-2">
                    <div className="h-1 rounded-full bg-purple-600" style={{ width: `${total > 0 ? Math.min(100, (thisMonthCount / total) * 100) : 0}%` }} />
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

      </div>

      {/* FILTER BAR SECTION */}
      <Card className="border border-gray-200/80 bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" /> Analytics Filters
            </h2>
            <p className="text-[10px] text-gray-400 font-medium ml-6 mt-0.5 uppercase tracking-widest">
              {filtered.length} Records Found
              {isScopedRole && (
                <span className="ml-2 text-purple-500">
                  · Scoped to {isBranchLeader ? `Branch ${userBranch}` : userDepartment}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Year */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[90px] h-8 text-xs font-medium rounded-md border-gray-200 bg-white text-gray-700 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Month */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[120px] h-8 text-xs font-medium rounded-md border-gray-200 bg-white text-gray-700 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Branch — shown only for HR Admin / MD */}
            {!isScopedRole && (
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[130px] h-8 text-xs font-medium rounded-md border-gray-200 bg-white text-gray-700 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md max-h-60">
                  {BRANCHES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Leave Type */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[160px] h-8 text-xs font-medium rounded-md border-gray-200 bg-white text-gray-700 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                <SelectItem value="All Types">All Types</SelectItem>
                {LEAVE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[110px] h-8 text-xs font-medium rounded-md border-gray-200 bg-white text-gray-700 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                {["All", "Approved", "Rejected", "Pending"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Active filter count badge */}
            {(selectedMonth !== "all" ||
              (!isScopedRole && selectedBranch !== "All Branches") ||
              selectedType !== "All Types" ||
              selectedStatus !== "All") && (
              <Badge
                className="bg-gray-100 text-gray-600 font-medium text-[10px] px-2.5 py-1 rounded-md cursor-pointer hover:bg-gray-200 transition-colors ml-1"
                onClick={() => {
                  setSelectedMonth("all");
                  if (!isScopedRole) setSelectedBranch("All Branches");
                  setSelectedType("All Types");
                  setSelectedStatus("All");
                }}
              >
                Clear ×
              </Badge>
            )}
          </div>
        </div>
      </Card>

            {/* ── Main Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Pie Chart */}
        <Card className="border border-gray-200/80 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-fit">
          <CardHeader className="pb-0 border-b border-gray-100 bg-white">
            <CardTitle className="text-sm font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
              <div className="p-2 bg-[#3B82F6]/10 rounded-xl">
                <PieChartIcon className="w-4 h-4 text-[#3B82F6]" />
              </div>
              Leave Type Distribution
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11 italic">
              Breakdown by leave category
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="h-[260px] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#3B82F6] opacity-40 w-8 h-8" />
              </div>
            ) : typeDistribution.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-30">
                No data for selection
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={typeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                      animationBegin={0}
                      animationDuration={1200}
                    >
                      {typeDistribution.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={
                            PIE_COLORS[entry.name] ||
                            FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number, name: string) => [
                        `${value} applications`,
                        name,
                      ]}
                      labelStyle={{ display: "none" }}
                      itemStyle={{ fontWeight: 900, fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="mt-3 space-y-2">
                  {typeDistribution.map((entry, idx) => (
                    <div
                      key={entry.name}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              PIE_COLORS[entry.name] ||
                              FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
                          }}
                        />
                        <span className="text-[10px] font-bold text-muted-foreground truncate">
                          {entry.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-black text-foreground">
                          {entry.value}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground/50">
                          (
                          {total > 0
                            ? Math.round((entry.value / total) * 100)
                            : 0}
                          %)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-foreground/70 italic text-center mt-3">
                  {typeDistribution.length > 0
                    ? `${typeDistribution[0].name} accounts for ${total > 0 ? Math.round((typeDistribution[0].value / total) * 100) : 0}% of all applications.`
                    : "No leave requests found."}
                </p>
              </>
            )}
          </CardContent>
        </Card>

          {/* Leave Balance Usage */}
        <Card className="border border-gray-200/80 bg-white rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="pb-0 border-b border-gray-100 bg-white">
            <CardTitle className="text-sm font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              Leave Balance Usage
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-11 italic">
              Estimated quota consumption
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            {loading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#3B82F6] opacity-40 w-8 h-8" />
              </div>
            ) : (
              <>
                {/* Big number */}
                <div className="text-center py-4">
                  <div className="text-5xl font-black text-[#3B82F6] leading-none">
                    {balancePct}%
                  </div>
                  <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">
                    Quota Used
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="h-3 w-full rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${balancePct}%`,
                        background:
                          balancePct >= 80
                            ? "linear-gradient(90deg, #DC2626, #dc2626)"
                            : balancePct >= 50
                              ? "linear-gradient(90deg, #EAB308, #d97706)"
                              : "linear-gradient(90deg, #3B82F6, #a855f7)",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-black text-muted-foreground uppercase">
                    <span>0 days</span>
                    <span>{totalQuota} days total</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Employees",
                      value: uniqueEmployees,
                      color: "text-foreground",
                    },
                    {
                      label: "Days Approved",
                      value: approvedDays,
                      color: "text-[#3B82F6]",
                    },
                    {
                      label: "Total Quota",
                      value: totalQuota,
                      color: "text-blue-600",
                    },
                    {
                      label: "Balance Est.",
                      value: Math.max(0, totalQuota - approvedDays),
                      color: "text-emerald-600",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="bg-muted/20 p-3 rounded-2xl space-y-0.5"
                    >
                      <p className="text-[8px] font-black text-muted-foreground uppercase opacity-60">
                        {s.label}
                      </p>
                      <p className={`text-base font-black ${s.color}`}>
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] font-bold text-muted-foreground/50 italic text-center">
                  * Estimated based on 14-day annual quota per employee
                </p>
              </>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Top Row Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Approved vs Rejected per Leave Type Bar Chart */}
            <Card className="md:col-span-2 border border-gray-200/80 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
              <CardHeader className="pb-0 border-b border-gray-100 bg-white">
                <CardTitle className="text-sm font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                  <div className="p-2 bg-[#16A34A]/10 rounded-xl">
                    <TrendingUp className="w-4 h-4 text-[#16A34A]" />
                  </div>
                  Approved vs Rejected
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 ml-11 italic">
                  By leave type — current filter
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex-1 flex flex-col justify-between">
                {loading ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#3B82F6] opacity-40 w-8 h-8" />
                  </div>
                ) : approvalByType.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-[10px] font-black text-foreground/50 uppercase tracking-widest">
                    No data for selection
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart
                        data={approvalByType}
                        margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(123,0,153,0.05)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="type"
                          tick={{
                            fontSize: 9,
                            fontWeight: 900,
                            fill: "hsl(var(--foreground))",
                            opacity: 0.8,
                          }}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          angle={-18}
                          textAnchor="end"
                        />
                        <YAxis
                          tick={{
                            fontSize: 9,
                            fontWeight: 900,
                            fill: "hsl(var(--foreground))",
                            opacity: 0.8,
                          }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          cursor={false}
                          contentStyle={{ ...tooltipStyle, borderRadius: "8px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" } as React.CSSProperties}
                          labelStyle={{
                            fontWeight: 900,
                            fontSize: 10,
                            textTransform: "uppercase",
                            marginBottom: 4,
                          }}
                          itemStyle={{ fontWeight: 900, fontSize: 11 }}
                        />
                        <Legend
                          wrapperStyle={{
                            fontSize: "9px",
                            fontWeight: 900,
                            textTransform: "uppercase",
                            paddingTop: 8,
                          }}
                          iconType="circle"
                        />
                        <Bar
                          dataKey="approved"
                          name="Approved"
                          fill="#16A34A"
                          radius={[6, 6, 0, 0]}
                          barSize={20}
                          animationDuration={1200}
                        >
                          <LabelList
                            dataKey="approved"
                            position="top"
                            style={{
                              fontSize: 9,
                              fontWeight: 900,
                              fill: "#16A34A",
                            }}
                          />
                        </Bar>
                        <Bar
                          dataKey="rejected"
                          name="Rejected"
                          fill="#DC2626"
                          radius={[6, 6, 0, 0]}
                          barSize={20}
                          animationDuration={1400}
                        >
                          <LabelList
                            dataKey="rejected"
                            position="top"
                            style={{
                              fontSize: 9,
                              fontWeight: 900,
                              fill: "#DC2626",
                            }}
                          />
                        </Bar>
                        <Bar
                          dataKey="pending"
                          name="Pending"
                          fill="#EAB308"
                          radius={[6, 6, 0, 0]}
                          barSize={20}
                          animationDuration={1600}
                        >
                          <LabelList
                            dataKey="pending"
                            position="top"
                            style={{
                              fontSize: 9,
                              fontWeight: 900,
                              fill: "#EAB308",
                            }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] font-bold text-foreground/70 italic text-center mt-2">
                      {total > 0
                        ? `${Math.round((approved / total) * 100)}% of leave requests this month were approved.`
                        : "No leave requests found."}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Top Leave Reasons Card */}
            <Card className="md:col-span-1 border border-gray-200/80 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
              <CardHeader className="pb-0 border-b border-gray-100 bg-white">
                <CardTitle className="text-sm font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                  <div className="p-2 bg-[#3B82F6]/10 rounded-xl">
                    <FileBarChart2 className="w-4 h-4 text-[#3B82F6]" />
                  </div>
                  Top Leave Reasons
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 ml-11 italic">
                  Most requested categories
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex-1 flex flex-col justify-between">
                {loading ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#3B82F6] opacity-40 w-8 h-8" />
                  </div>
                ) : typeDistribution.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-[10px] font-black text-foreground/50 uppercase tracking-widest">
                    No data for selection
                  </div>
                ) : (
                  <div className="flex flex-col justify-between h-full min-h-[220px]">
                    <div className="space-y-4">
                      {typeDistribution.slice(0, 4).map((entry, idx) => {
                        const style = leaveTypeStyles[entry.name] || fallbackStyle;
                        const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                        const IconComponent = style.icon;

                        return (
                          <div key={entry.name} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`p-1.5 ${style.bgColor} rounded-lg shrink-0`}>
                                  <IconComponent className={`w-3.5 h-3.5 ${style.color}`} />
                                </div>
                                <span className="text-[11px] font-bold text-gray-700 truncate">
                                  {style.label}
                                </span>
                              </div>
                              <span className={`text-[11px] font-black shrink-0 ${style.color}`}>
                                {pct}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${style.barColor}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-3 border-t border-gray-100 mt-2">
                      <button
                        onClick={() => navigate("/reports/leave")}
                        className="text-[10px] font-black text-[#3B82F6] hover:text-[#2563EB] flex items-center gap-1.5 transition-colors uppercase tracking-wider"
                      >
                        View Detailed Breakdown
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Approvals trend chart */}
        <Card className="border border-gray-200/80 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-fit">
          <CardHeader className="pb-0 border-b border-gray-100 bg-white">
            <CardTitle className="text-sm font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
              <div className="p-2 bg-[#3B82F6]/10 rounded-xl">
                <TrendingUp className="w-4 h-4 text-[#3B82F6]" />
              </div>
              Monthly Leave Trend
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 ml-11 italic">
              Total applications over time
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#3B82F6] opacity-40 w-8 h-8" />
              </div>
            ) : monthlyTrend.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-[10px] font-black text-foreground/50 uppercase tracking-widest">
                No data for selection
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={monthlyTrend}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(123,0,153,0.05)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{
                        fontSize: 9,
                        fontWeight: 900,
                        fill: "hsl(var(--foreground))",
                        opacity: 0.8,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 9,
                        fontWeight: 900,
                        fill: "hsl(var(--foreground))",
                        opacity: 0.8,
                      }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={false}
                      contentStyle={tooltipStyle}
                      labelStyle={{
                        fontWeight: 900,
                        fontSize: 10,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                      itemStyle={{ fontWeight: 900, fontSize: 11 }}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: "9px",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        paddingTop: 8,
                      }}
                      iconType="circle"
                    />
                    <Bar
                      dataKey="total"
                      name="Total"
                      fill="#3B82F6"
                      radius={[6, 6, 0, 0]}
                      barSize={18}
                      animationDuration={1000}
                    />
                    <Bar
                      dataKey="approved"
                      name="Approved"
                      fill="#16A34A"
                      radius={[6, 6, 0, 0]}
                      barSize={18}
                      animationDuration={1200}
                    />
                    <Bar
                      dataKey="rejected"
                      name="Rejected"
                      fill="#DC2626"
                      radius={[6, 6, 0, 0]}
                      barSize={18}
                      animationDuration={1400}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[10px] font-bold text-foreground/70 italic text-center mt-2">
                  Trend analysis: Applications are highest in{" "}
                  {monthlyTrend.length > 0
                    ? monthlyTrend.reduce(
                        (max, obj) => (obj.total > max.total ? obj : max),
                        monthlyTrend[0],
                      ).month
                    : "N/A"}
                  .
                </p>
              </>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* ── Status Summary Strip ── */}
      <Card className="border border-gray-200/80 bg-white rounded-xl shadow-sm overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-4 sm:gap-8">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Status Summary:
            </span>
            {[
              {
                label: "Total",
                value: total,
                color: "bg-[#3B82F6] text-white",
              },
              {
                label: "Approved",
                value: approved,
                color: "bg-emerald-500 text-white",
              },
              {
                label: "Rejected",
                value: rejected,
                color: "bg-rose-500 text-white",
              },
              {
                label: "Pending",
                value: pending,
                color: "bg-[#C2410C] text-white",
              },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <Badge
                  className={`${s.color} font-black text-[10px] px-3 py-1 rounded-md shadow-sm`}
                >
                  {s.value}
                </Badge>
                <span className="text-[10px] font-black text-muted-foreground uppercase">
                  {s.label}
                </span>
              </div>
            ))}
            {!loading && total > 0 && (
              <div className="ml-auto text-[9px] font-black text-muted-foreground/50 italic">
                Approval rate: {Math.round((approved / total) * 100)}% ·
                Rejection rate: {Math.round((rejected / total) * 100)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Workforce Health Overview ── */}
      <Card className="border border-gray-200/80 bg-white rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="pb-0 border-b border-gray-100 bg-white">
          <CardTitle className="text-sm font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            </div>
            Workforce Health Overview
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 ml-11 italic">
            Automated workforce analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-muted/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground/60">
                Attendance Stability
              </p>
              <p
                className={`text-lg font-black uppercase ${attendanceStats.attendanceRate >= 90 ? "text-emerald-500" : attendanceStats.attendanceRate >= 80 ? "text-amber-500" : "text-rose-500"}`}
              >
                {attendanceStats.attendanceRate >= 90
                  ? "Excellent"
                  : attendanceStats.attendanceRate >= 80
                    ? "Good"
                    : "Needs Review"}
              </p>
            </div>
            <div className="bg-muted/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground/60">
                Leave Risk
              </p>
              <p
                className={`text-lg font-black uppercase ${balancePct < 30 ? "text-emerald-500" : balancePct < 70 ? "text-amber-500" : "text-rose-500"}`}
              >
                {balancePct < 30 ? "Low" : balancePct < 70 ? "Medium" : "High"}
              </p>
            </div>
            <div className="bg-muted/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground/60">
                Approval Efficiency
              </p>
              <p
                className={`text-lg font-black uppercase ${pending === 0 ? "text-emerald-500" : pending < 5 ? "text-amber-500" : "text-rose-500"}`}
              >
                {pending === 0 ? "Excellent" : pending < 5 ? "Good" : "Backlog"}
              </p>
            </div>
            <div className="bg-muted/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground/60">
                Branch Coverage
              </p>
              <p className="text-lg font-black uppercase text-blue-500">
                Stable
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── STAFF LEAVE SUMMARY TABLE (Branch Leader / HOD only) ── */}
      {isScopedRole && (
        <Card className="border border-gray-200/80 bg-white rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="pb-0 border-b border-gray-100 bg-white">
            <CardTitle className="text-sm font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
              <div className="p-2 bg-purple-500/10 rounded-xl">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              {isBranchLeader ? `Branch ${userBranch}` : userDepartment} — Staff Leave Summary
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 ml-11 italic">
              Individual breakdown for all staff under your {isBranchLeader ? "branch" : "department"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-0 pb-0">
            {loading ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="animate-spin text-purple-400 w-7 h-7" />
              </div>
            ) : staffSummary.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-30">
                No staff leave records found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-slate-50/60">
                      <th className="px-5 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Staff Member</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Applications</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-emerald-600 uppercase tracking-widest">Approved</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-rose-500 uppercase tracking-widest">Rejected</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-amber-500 uppercase tracking-widest">Pending</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-blue-600 uppercase tracking-widest">Days Used</th>
                      <th className="px-5 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Leave Utilisation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffSummary.map((staff, idx) => {
                      const utilisationPct = Math.min(100, Math.round((staff.days / 14) * 100));
                      return (
                        <tr
                          key={staff.name + idx}
                          className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors"
                        >
                          {/* Name */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7B0099]/20 to-purple-300 flex items-center justify-center text-[10px] font-black text-purple-700 shrink-0">
                                {staff.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-bold text-gray-800 truncate max-w-[160px]" title={staff.name}>{staff.name}</span>
                            </div>
                          </td>
                          {/* Total */}
                          <td className="px-4 py-3 text-center">
                            <span className="font-black text-gray-700">{staff.total}</span>
                          </td>
                          {/* Approved */}
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-black ${
                              staff.approved > 0 ? "bg-emerald-50 text-emerald-600" : "text-slate-300"
                            }`}>{staff.approved}</span>
                          </td>
                          {/* Rejected */}
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-black ${
                              staff.rejected > 0 ? "bg-rose-50 text-rose-500" : "text-slate-300"
                            }`}>{staff.rejected}</span>
                          </td>
                          {/* Pending */}
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-black ${
                              staff.pending > 0 ? "bg-amber-50 text-amber-500" : "text-slate-300"
                            }`}>{staff.pending}</span>
                          </td>
                          {/* Days Used */}
                          <td className="px-4 py-3 text-center">
                            <span className="font-black text-blue-600">{staff.days}</span>
                            <span className="text-slate-400 font-medium"> / 14</span>
                          </td>
                          {/* Utilisation bar */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[80px]">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${
                                    utilisationPct >= 80 ? "bg-rose-400" :
                                    utilisationPct >= 50 ? "bg-amber-400" :
                                    "bg-emerald-400"
                                  }`}
                                  style={{ width: `${utilisationPct}%` }}
                                />
                              </div>
                              <span className={`text-[10px] font-black ${
                                utilisationPct >= 80 ? "text-rose-500" :
                                utilisationPct >= 50 ? "text-amber-500" :
                                "text-emerald-500"
                              }`}>{utilisationPct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Footer Summary Row */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-gray-100 flex flex-wrap items-center gap-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Team Totals:</span>
                  <span className="text-[11px] font-black text-gray-700">{staffSummary.length} Staff Members</span>
                  <span className="text-[11px] font-black text-gray-700">·</span>
                  <span className="text-[11px] font-black text-gray-700">{records.length} Total Applications</span>
                  <span className="text-[11px] font-black text-gray-700">·</span>
                  <span className="text-[11px] font-black text-emerald-600">
                    {records.filter(r => r.status === "Approved").length} Approved
                  </span>
                  <span className="text-[11px] font-black text-gray-700">·</span>
                  <span className="text-[11px] font-black text-amber-500">
                    {records.filter(r => r.status.startsWith("Pending")).length} Pending Action
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
