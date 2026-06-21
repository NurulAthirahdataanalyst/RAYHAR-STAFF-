import { useState, useEffect, useMemo } from "react";
import { useRole } from "@/contexts/RoleContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LabelList,
} from "recharts";
import {
  PieChart as PieChartIcon, Filter, Loader2,
  FileBarChart2, CheckCircle2, XCircle, TrendingUp,
  Award, Users, Download, RefreshCw, ChevronDown, FileText, FileSpreadsheet,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";
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
  "Annual/Emergency Leave": "#7B0099",
  "Sick Leave":             "#ec4899",
  "Replacement Leave":      "#10b981",
  "Unpaid Leave":           "#f59e0b",
};

const FALLBACK_COLORS = ["#7B0099", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const MONTHS = [
  { value: "all", label: "All Months" },
  { value: "1",   label: "January"   },
  { value: "2",   label: "February"  },
  { value: "3",   label: "March"     },
  { value: "4",   label: "April"     },
  { value: "5",   label: "May"       },
  { value: "6",   label: "June"      },
  { value: "7",   label: "July"      },
  { value: "8",   label: "August"    },
  { value: "9",   label: "September" },
  { value: "10",  label: "October"   },
  { value: "11",  label: "November"  },
  { value: "12",  label: "December"  },
];

const YEARS = ["2027", "2026", "2025", "2024"];

const BRANCHES = [
  "All Branches","HQ","KMM","TGG","CNH","KBG","DGN","JTH",
  "KBR","RMP","MZM","TWU","AOR","BTM","KKS","SHA","BBB",
  "KUL","IPH","MJG","MLK","SNS","JB","BTP",
];

// ─── Custom Pie Label ─────────────────────────────────────────────────────────
const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = outerRadius + 28;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="currentColor" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central"
      className="text-foreground" style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, accent, loading,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string; loading: boolean;
}) {
  return (
    <Card className="border-none shadow-[0_15px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.25)] bg-card/80 backdrop-blur-md rounded-[24px] overflow-hidden">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-2xl shrink-0 ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">{label}</p>
          {loading ? (
            <div className="h-7 w-14 mt-1 bg-muted/50 rounded-lg animate-pulse" />
          ) : (
            <p className={`${typeof value === "string" && value.length > 12 ? "text-xs sm:text-sm font-black leading-tight mt-1" : "text-2xl font-black leading-none mt-0.5"} text-foreground`}>
              {value}
            </p>
          )}
          {sub && !loading && (
            <p className="text-[10px] font-bold text-muted-foreground mt-0.5 truncate">{sub}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LeaveAnalytics() {
  const { role, userBranch, userDepartment } = useRole();
  const navigate = useNavigate();

  // Redirect non-hr_admin roles
  useEffect(() => {
    if (role && role !== "hr_admin" && role !== "managing_director") {
      navigate("/");
    }
  }, [role, navigate]);

  // ─ Filter state ─
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear,  setSelectedYear]  = useState(new Date().getFullYear().toString());
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [selectedType,  setSelectedType]  = useState("All Types");
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

  // ─ Fetch all leave requests & attendance stats ──────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        role: "hr_admin",
        branch: "",
        department: "",
      });
      
      const [leaveRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/leave-requests?${params}`),
        fetch(`${API_BASE_URL}/api/dashboard-stats?userId=ADMIN&role=hr_admin&branch=All`)
      ]);
      
      const data = await leaveRes.json();
      const statsData = await statsRes.json();

      if (data.success && Array.isArray(data.leaveRequests)) {
        const formatted: LeaveRecord[] = data.leaveRequests.map((r: any) => ({
          leave_id:   r.leave_id,
          user_id:    r.user_id,
          full_name:  r.full_name || r.user_id,
          branch:     r.branch || "HQ",
          department: r.department,
          leave_type: r.leave_type,
          start_date: r.start_date,
          end_date:   r.end_date,
          days:       Number(r.days || 0),
          status:     r.status || "Pending HOD",
          reason:     r.reason,
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
        const rate = (total - onLeave) > 0 ? Math.round((present / (total - onLeave)) * 100) : 0;

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

  useEffect(() => { void fetchData(); }, []);

  // ─ Filter logic ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return records.filter((r) => {
      // Month/Year filter
      if (selectedMonth !== "all" || selectedYear) {
        const d = new Date(r.start_date);
        if (selectedYear && d.getFullYear().toString() !== selectedYear) return false;
        if (selectedMonth !== "all" && (d.getMonth() + 1).toString() !== selectedMonth) return false;
      }
      // Branch filter
      if (selectedBranch !== "All Branches" && r.branch !== selectedBranch) return false;
      // Type filter
      if (selectedType !== "All Types" && r.leave_type !== selectedType) return false;
      // Status filter
      if (selectedStatus === "Approved"  && r.status !== "Approved")  return false;
      if (selectedStatus === "Rejected"  && r.status !== "Rejected")  return false;
      if (selectedStatus === "Pending"   && !r.status.startsWith("Pending")) return false;
      return true;
    });
  }, [records, selectedMonth, selectedYear, selectedBranch, selectedType, selectedStatus]);

  // ─ Derived analytics ────────────────────────────────────────────────────────
  const total    = filtered.length;
  const approved = filtered.filter(r => r.status === "Approved").length;
  const rejected = filtered.filter(r => r.status === "Rejected").length;
  const pending  = filtered.filter(r => r.status.startsWith("Pending")).length;
  const totalDays = filtered.reduce((sum, r) => sum + r.days, 0);

  // Leave type distribution
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(r => {
      counts[r.leave_type] = (counts[r.leave_type] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const mostCommonType = typeDistribution[0]?.name ?? "N/A";

  // Approved vs rejected by leave type
  const approvalByType = useMemo(() => {
    const map: Record<string, { type: string; approved: number; rejected: number; pending: number }> = {};
    filtered.forEach(r => {
      if (!map[r.leave_type]) map[r.leave_type] = { type: r.leave_type, approved: 0, rejected: 0, pending: 0 };
      if (r.status === "Approved")          map[r.leave_type].approved++;
      else if (r.status === "Rejected")     map[r.leave_type].rejected++;
      else                                   map[r.leave_type].pending++;
    });
    return Object.values(map);
  }, [filtered]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const map: Record<string, { month: string; total: number; approved: number; rejected: number }> = {};
    filtered.forEach(r => {
      const d   = new Date(r.start_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const lbl = d.toLocaleString("en-MY", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { month: lbl, total: 0, approved: 0, rejected: 0 };
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
  const uniqueEmployees = useMemo(() => new Set(filtered.map(r => r.user_id)).size, [filtered]);
  const totalQuota = uniqueEmployees * QUOTA_PER_EMPLOYEE;
  const approvedDays = useMemo(
    () => filtered.filter(r => r.status === "Approved").reduce((s, r) => s + r.days, 0),
    [filtered]
  );
  const balancePct = totalQuota > 0 ? Math.min(100, Math.round((approvedDays / totalQuota) * 100)) : 0;

  // CSV Export
  const handleExport = () => {
    const headers = ["Employee","Branch","Leave Type","Start Date","End Date","Days","Status"];
    const rows = filtered.map(r => [
      r.full_name, r.branch, r.leave_type,
      r.start_date?.slice(0,10), r.end_date?.slice(0,10),
      r.days, r.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
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

    const rowsHtml = filtered.map(r => {
      const start = r.start_date ? new Date(r.start_date).toLocaleDateString() : "-";
      const end = r.end_date ? new Date(r.end_date).toLocaleDateString() : "-";
      const statusClass = r.status.toLowerCase().replace(/\s+/g, '-');
      return `
        <tr>
          <td>${r.full_name}</td>
          <td>${r.branch}</td>
          <td>${r.leave_type}</td>
          <td>${start}</td>
          <td>${end}</td>
          <td style="font-weight: 700;">${r.days}</td>
          <td><span class="badge badge-${statusClass}">${r.status}</span></td>
        </tr>
      `;
    }).join("");

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const periodName = selectedMonth === "all" ? `Year ${selectedYear}` : `${monthNames[parseInt(selectedMonth) - 1]} ${selectedYear}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Rayhar Staff Leave Report - ${periodName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 40px; }
            h1 { color: #7B0099; margin-bottom: 5px; font-size: 24px; font-weight: 800; }
            h2 { color: #64748b; font-size: 13px; margin-top: 0; font-weight: 600; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .meta-item { font-size: 13px; }
            .meta-item strong { color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #7B0099; color: white; text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            tr:nth-child(even) td { background: #f8fafc; }
            .badge { padding: 4px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; white-space: nowrap; display: inline-block; }
            .badge-approved { background: #d1fae5; color: #065f46; }
            .badge-rejected { background: #fee2e2; color: #991b1b; }
            .badge-pending { background: #fef3c7; color: #92400e; }
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
            <button onclick="window.print();" style="background: #7B0099; color: white; border: none; padding: 10px 20px; font-weight: 800; border-radius: 8px; cursor: pointer; font-size: 12px; transition: background 0.2s;">PRINT REPORT</button>
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
    borderRadius: "16px", border: "none",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    backgroundColor: "rgba(255,255,255,0.97)",
    backdropFilter: "blur(10px)", padding: "12px",
  };

  return (
    <div className="space-y-5 sm:space-y-7 animate-in fade-in duration-500 pb-10">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#7B0099]/10 dark:bg-[#7B0099]/20 rounded-xl text-[#7B0099] dark:text-purple-400">
            <PieChartIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-responsive-xl font-black text-foreground tracking-tight uppercase">
              Leave Monitoring
            </h1>
            <p className="text-responsive-sm text-muted-foreground font-medium italic">
              Leave Summary Analytics · HR Admin View
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchData()}
            className="gap-2 border-border text-muted-foreground hover:text-foreground rounded-xl font-black text-[10px] uppercase tracking-widest px-4 py-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-orange-500/10 active:scale-95">
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border border-border bg-background p-1 shadow-lg min-w-[150px]">
              <DropdownMenuItem onClick={handleExportPDF} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer focus:bg-muted">
                <FileText className="w-3.5 h-3.5 text-red-500" />
                <span>Export as PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer focus:bg-muted">
                <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                <span>Export as Excel</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <Card className="border-none shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] bg-card/90 backdrop-blur-md rounded-[24px] overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-3 w-full overflow-x-auto scrollbar-none pb-1">
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-1.5 bg-[#7B0099]/10 rounded-lg">
                <Filter className="w-3.5 h-3.5 text-[#7B0099]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">
                Filter By:
              </span>
            </div>

            {/* Year */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[90px] h-9 text-[10px] font-black uppercase tracking-widest rounded-xl border-border/50 bg-muted/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {YEARS.map(y => (
                  <SelectItem key={y} value={y} className="text-[10px] font-black uppercase tracking-widest">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Month */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[130px] h-9 text-[10px] font-black uppercase tracking-widest rounded-xl border-border/50 bg-muted/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {MONTHS.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-[10px] font-black uppercase tracking-widest">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Branch */}
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[140px] h-9 text-[10px] font-black uppercase tracking-widest rounded-xl border-border/50 bg-muted/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                {BRANCHES.map(b => (
                  <SelectItem key={b} value={b} className="text-[10px] font-black uppercase tracking-widest">{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Leave Type */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px] h-9 text-[10px] font-black uppercase tracking-widest rounded-xl border-border/50 bg-muted/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="All Types" className="text-[10px] font-black uppercase tracking-widest">All Types</SelectItem>
                {LEAVE_TYPES.map(t => (
                  <SelectItem key={t} value={t} className="text-[10px] font-black uppercase tracking-widest">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[130px] h-9 text-[10px] font-black uppercase tracking-widest rounded-xl border-border/50 bg-muted/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {["All", "Approved", "Rejected", "Pending"].map(s => (
                  <SelectItem key={s} value={s} className="text-[10px] font-black uppercase tracking-widest">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Active filter count badge */}
            {(selectedMonth !== "all" || selectedBranch !== "All Branches" || selectedType !== "All Types" || selectedStatus !== "All") && (
              <Badge
                className="bg-[#7B0099] text-white font-black text-[9px] px-2.5 py-1 rounded-full cursor-pointer hover:bg-[#5e0080] transition-colors"
                onClick={() => {
                  setSelectedMonth("all");
                  setSelectedBranch("All Branches");
                  setSelectedType("All Types");
                  setSelectedStatus("All");
                }}
              >
                Clear Filters ×
              </Badge>
            )}

            <div className="ml-auto flex items-center gap-2">
              {lastFetched && (
                <span className="text-[9px] font-bold text-muted-foreground/50 whitespace-nowrap">
                  Updated: {lastFetched.toLocaleTimeString("en-MY")}
                </span>
              )}
              <Badge variant="outline" className="font-black text-[10px] px-3 py-1 bg-[#7B0099]/10 text-[#7B0099] border-none whitespace-nowrap">
                {loading ? "Loading..." : `${filtered.length} Records`}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Applications"
          value={total}
          sub={`${totalDays} total days`}
          icon={FileBarChart2}
          accent="bg-[#7B0099]/10 text-[#7B0099]"
          loading={loading}
        />
        <StatCard
          label="Approved"
          value={approved}
          sub={total > 0 ? `${Math.round((approved / total) * 100)}% approval rate` : "No data"}
          icon={CheckCircle2}
          accent="bg-emerald-500/10 text-emerald-600"
          loading={loading}
        />
        <StatCard
          label="Rejected"
          value={rejected}
          sub={total > 0 ? `${Math.round((rejected / total) * 100)}% rejection rate` : "No data"}
          icon={XCircle}
          accent="bg-rose-500/10 text-rose-600"
          loading={loading}
        />
        <StatCard
          label="Most Common Type"
          value={loading ? "—" : mostCommonType}
          sub={typeDistribution[0] ? `${typeDistribution[0].value} applications` : ""}
          icon={Award}
          accent="bg-amber-500/10 text-amber-600"
          loading={loading}
        />
      </div>

      {/* ── Row 2: Pie Chart + Approval Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">

        {/* Pie Chart */}
        <Card className="lg:col-span-2 border-none shadow-[0_15px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.25)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden">
          <CardHeader className="pb-0 border-b border-border/40">
            <CardTitle className="text-sm font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
              <div className="p-2 bg-[#7B0099]/10 rounded-xl">
                <PieChartIcon className="w-4 h-4 text-[#7B0099]" />
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
                <Loader2 className="animate-spin text-[#7B0099] opacity-40 w-8 h-8" />
              </div>
            ) : typeDistribution.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-30">
                No data for selection
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
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
                          fill={PIE_COLORS[entry.name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number, name: string) => [`${value} applications`, name]}
                      labelStyle={{ display: "none" }}
                      itemStyle={{ fontWeight: 900, fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="mt-3 space-y-2">
                  {typeDistribution.map((entry, idx) => (
                    <div key={entry.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[entry.name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length] }}
                        />
                        <span className="text-[10px] font-bold text-muted-foreground truncate">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-black text-foreground">{entry.value}</span>
                        <span className="text-[9px] font-bold text-muted-foreground/50">
                          ({total > 0 ? Math.round((entry.value / total) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-foreground/70 italic text-center mt-3">
                  {typeDistribution.length > 0 ? `${typeDistribution[0].name} accounts for ${total > 0 ? Math.round((typeDistribution[0].value / total) * 100) : 0}% of all applications.` : "No leave requests found."}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Approved vs Rejected per Leave Type Bar Chart */}
        <Card className="lg:col-span-3 border-none shadow-[0_15px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.25)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden">
          <CardHeader className="pb-0 border-b border-border/40">
            <CardTitle className="text-sm font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              Approved vs Rejected
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 ml-11 italic">
              By leave type — current filter
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#7B0099] opacity-40 w-8 h-8" />
              </div>
            ) : approvalByType.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-[10px] font-black text-foreground/50 uppercase tracking-widest">
                No data for selection
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={approvalByType} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,0,153,0.05)" vertical={false} />
                    <XAxis
                      dataKey="type"
                      tick={{ fontSize: 9, fontWeight: 900, fill: "hsl(var(--foreground))", opacity: 0.8 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                    />
                    <YAxis
                      tick={{ fontSize: 9, fontWeight: 900, fill: "hsl(var(--foreground))", opacity: 0.8 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ fontWeight: 900, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}
                    itemStyle={{ fontWeight: 900, fontSize: 11 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", paddingTop: 8 }}
                    iconType="circle"
                  />
                  <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} animationDuration={1200}>
                    <LabelList dataKey="approved" position="top" style={{ fontSize: 9, fontWeight: 900, fill: "#10b981" }} />
                  </Bar>
                  <Bar dataKey="rejected" name="Rejected" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={20} animationDuration={1400}>
                    <LabelList dataKey="rejected" position="top" style={{ fontSize: 9, fontWeight: 900, fill: "#ef4444" }} />
                  </Bar>
                  <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={20} animationDuration={1600}>
                    <LabelList dataKey="pending" position="top" style={{ fontSize: 9, fontWeight: 900, fill: "#f59e0b" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] font-bold text-foreground/70 italic text-center mt-2">
                {total > 0 ? `${Math.round((approved / total) * 100)}% of leave requests this month were approved.` : "No leave requests found."}
              </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Leave Balance Usage + Monthly Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">

        {/* Leave Balance Usage */}
        <Card className="lg:col-span-2 border-none shadow-[0_15px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.25)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden">
          <CardHeader className="pb-0 border-b border-border/40">
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
                <Loader2 className="animate-spin text-[#7B0099] opacity-40 w-8 h-8" />
              </div>
            ) : (
              <>
                {/* Big number */}
                <div className="text-center py-4">
                  <div className="text-5xl font-black text-[#7B0099] leading-none">{balancePct}%</div>
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
                        background: balancePct >= 80
                          ? "linear-gradient(90deg, #ef4444, #dc2626)"
                          : balancePct >= 50
                          ? "linear-gradient(90deg, #f59e0b, #d97706)"
                          : "linear-gradient(90deg, #7B0099, #a855f7)",
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
                    { label: "Employees", value: uniqueEmployees, color: "text-foreground" },
                    { label: "Days Approved", value: approvedDays, color: "text-[#7B0099]" },
                    { label: "Total Quota", value: totalQuota, color: "text-blue-600" },
                    { label: "Balance Est.", value: Math.max(0, totalQuota - approvedDays), color: "text-emerald-600" },
                  ].map(s => (
                    <div key={s.label} className="bg-muted/20 p-3 rounded-2xl space-y-0.5">
                      <p className="text-[8px] font-black text-muted-foreground uppercase opacity-60">{s.label}</p>
                      <p className={`text-base font-black ${s.color}`}>{s.value}</p>
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

        {/* Monthly Trend */}
        <Card className="lg:col-span-3 border-none shadow-[0_15px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.25)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden">
          <CardHeader className="pb-0 border-b border-border/40">
            <CardTitle className="text-sm font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
              <div className="p-2 bg-[#7B0099]/10 rounded-xl">
                <TrendingUp className="w-4 h-4 text-[#7B0099]" />
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
                <Loader2 className="animate-spin text-[#7B0099] opacity-40 w-8 h-8" />
              </div>
            ) : monthlyTrend.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-[10px] font-black text-foreground/50 uppercase tracking-widest">
                No data for selection
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,0,153,0.05)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 9, fontWeight: 900, fill: "hsl(var(--foreground))", opacity: 0.8 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fontWeight: 900, fill: "hsl(var(--foreground))", opacity: 0.8 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ fontWeight: 900, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}
                    itemStyle={{ fontWeight: 900, fontSize: 11 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", paddingTop: 8 }}
                    iconType="circle"
                  />
                  <Bar dataKey="total"    name="Total"    fill="#7B0099" radius={[6, 6, 0, 0]} barSize={18} animationDuration={1000} />
                  <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[6, 6, 0, 0]} barSize={18} animationDuration={1200} />
                  <Bar dataKey="rejected" name="Rejected" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={18} animationDuration={1400} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] font-bold text-foreground/70 italic text-center mt-2">
                Trend analysis: Applications are highest in {monthlyTrend.length > 0 ? monthlyTrend.reduce((max, obj) => obj.total > max.total ? obj : max, monthlyTrend[0]).month : "N/A"}.
              </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Status Summary Strip ── */}
      <Card className="border-none shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[24px] overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-4 sm:gap-8">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status Summary:</span>
            {[
              { label: "Total",    value: total,    color: "bg-[#7B0099] text-white"    },
              { label: "Approved", value: approved,  color: "bg-emerald-500 text-white" },
              { label: "Rejected", value: rejected,  color: "bg-rose-500 text-white"    },
              { label: "Pending",  value: pending,   color: "bg-amber-500 text-white"   },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <Badge className={`${s.color} font-black text-[10px] px-3 py-1 rounded-full shadow-sm`}>
                  {s.value}
                </Badge>
                <span className="text-[10px] font-black text-muted-foreground uppercase">{s.label}</span>
              </div>
            ))}
            {!loading && total > 0 && (
              <div className="ml-auto text-[9px] font-black text-muted-foreground/50 italic">
                Approval rate: {Math.round((approved / total) * 100)}% · Rejection rate: {Math.round((rejected / total) * 100)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Workforce Health Overview ── */}
      <Card className="border-none shadow-[0_15px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.25)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden mt-6">
        <CardHeader className="pb-0 border-b border-border/40">
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
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground/60">Attendance Stability</p>
              <p className={`text-lg font-black uppercase ${attendanceStats.attendanceRate >= 90 ? "text-emerald-500" : attendanceStats.attendanceRate >= 80 ? "text-amber-500" : "text-rose-500"}`}>
                {attendanceStats.attendanceRate >= 90 ? "Excellent" : attendanceStats.attendanceRate >= 80 ? "Good" : "Needs Review"}
              </p>
            </div>
            <div className="bg-muted/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground/60">Leave Risk</p>
              <p className={`text-lg font-black uppercase ${balancePct < 30 ? "text-emerald-500" : balancePct < 70 ? "text-amber-500" : "text-rose-500"}`}>
                {balancePct < 30 ? "Low" : balancePct < 70 ? "Medium" : "High"}
              </p>
            </div>
            <div className="bg-muted/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground/60">Approval Efficiency</p>
              <p className={`text-lg font-black uppercase ${pending === 0 ? "text-emerald-500" : pending < 5 ? "text-amber-500" : "text-rose-500"}`}>
                {pending === 0 ? "Excellent" : pending < 5 ? "Good" : "Backlog"}
              </p>
            </div>
            <div className="bg-muted/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground/60">Branch Coverage</p>
              <p className="text-lg font-black uppercase text-blue-500">
                Stable
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
