import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock, Fingerprint, Hand, Timer, MapPin, Home, SlidersHorizontal, Download, ChevronDown, FileText, FileSpreadsheet, Sparkles, CalendarDays } from "lucide-react";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportDropdown } from "@/components/shared/ExportDropdown";

const formatAttendanceTime = (value: unknown) => {
  if (!value) return "--:--";

  try {
    let dateStr = typeof value === "string" ? value : String(value);
    
    // The backend stores times in UTC, but the MySQL/PG adapter might return them without a 'Z'.
    // So if the string doesn't end with Z and doesn't specify an offset, append 'Z' so the browser 
    // correctly interprets it as UTC and adds the local timezone offset (e.g. +8 hours for Malaysia).
    if (typeof value === "string") {
      dateStr = dateStr.replace(" ", "T");
      if (!dateStr.endsWith("Z") && !dateStr.includes("+") && (dateStr.length < 19 || !dateStr.substring(10).includes("-"))) {
        dateStr += "Z";
      }
    }

    const parsed = value instanceof Date ? value : new Date(dateStr);

    if (Number.isNaN(parsed.getTime())) return "--:--";

    return parsed.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return "--:--";
  }
};

const formatFullDateTime = (value: unknown) => {
  if (!value) return "-";
  
  try {
    let dateStr = typeof value === "string" ? value : String(value);
    
    if (typeof value === "string") {
      dateStr = dateStr.replace(" ", "T");
      if (!dateStr.endsWith("Z") && !dateStr.includes("+") && (dateStr.length < 19 || !dateStr.substring(10).includes("-"))) {
        dateStr += "Z";
      }
    }

    const parsed = value instanceof Date ? value : new Date(dateStr);

    if (Number.isNaN(parsed.getTime())) return "-";

    return parsed.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return "-";
  }
};

export default function Attendance() {
  const [loading, setLoading] = useState(false);
  const [initialFetch, setInitialFetch] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSession, setActiveSession] = useState<any>(null);
  const { user } = useAuth();
  const [workingHrs, setWorkingHrs] = useState("--:--");
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [visibleLogsCount, setVisibleLogsCount] = useState(10);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  // Derived stats from historyLogs
  const [stats, setStats] = useState({
    totalHoursToday: "0",
    totalHoursWeek: "0",
    totalHoursMonth: "0",
    overtimeMonth: "0",
    productiveHours: "0",
    breakHours: "0",
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  });
  const selectedMonth = parseInt(selectedDate.split('-')[1]);
  const selectedYear = parseInt(selectedDate.split('-')[0]);

  const [statusFilter, setStatusFilter] = useState<"ALL" | "ON TIME" | "LATE">("ALL");
  const [viewMode, setViewMode] = useState<"day" | "month">("day");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isOnLeave, setIsOnLeave] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<any>({
    type: "NORMAL",
    name: null,
    attendanceRequired: true,
    clockInAllowed: true
  });

  // Location selection state
  const [allowedLocations, setAllowedLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [attendanceMode, setAttendanceMode] = useState<"permanent" | "temporary" | "multi">("permanent");

  const { toast } = useToast();

  // 1. Update time every second and calculate working hours
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (activeSession && activeSession.clock_in) {
        let clockInStr = activeSession.clock_in;
        if (typeof clockInStr === "string") {
          clockInStr = clockInStr.replace(" ", "T");
          if (!clockInStr.endsWith("Z") && !clockInStr.includes("+") && (clockInStr.length < 19 || !clockInStr.substring(10).includes("-"))) {
            clockInStr += "Z";
          }
        }
        
        const start = new Date(clockInStr).getTime();
        const diffMs = now.getTime() - start;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setWorkingHrs(`${diffHrs.toString().padStart(2, '0')}:${diffMins.toString().padStart(2, '0')} hrs`);
      } else {
        setWorkingHrs("--:--");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  // 2. Fetch status and history logs when user context changes or mounts
  useEffect(() => {
    if (user) {
      const userId = user.user_id || user.id;
      if (userId) {
        fetchStatus(userId);
        fetchHistoryLogs(userId, selectedMonth, selectedYear);
        fetchAllowedLocations(userId);
      } else {
        setInitialFetch(false);
      }
    } else {
      setInitialFetch(false);
    }
  }, [user]);

  const fetchAllowedLocations = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance/allowed-locations/${id}`);
      const data = await response.json();
      if (data.success) {
        setAllowedLocations(data.locations || []);
        setAttendanceMode(data.mode || "permanent");
        if (data.locations && data.locations.length > 0) {
          setSelectedLocation(data.locations[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch allowed locations", err);
    }
  };

  // 3. Fetch attendance status (GET)
  const fetchStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/attendance-status?empId=${id}`
      );
      const data = await response.json();

      if (data.isOnLeave) {
        setIsOnLeave(true);
      }

      if (data.attendanceStatus) {
        setAttendanceStatus(data.attendanceStatus);
      } else {
        setAttendanceStatus({
          type: data.isOnLeave ? "APPROVED_LEAVE" : "NORMAL",
          name: data.isOnLeave ? "Approved Leave" : null,
          attendanceRequired: !data.isOnLeave,
          clockInAllowed: true
        });
      }

      if (data.active && data.record) {
        setActiveSession(data.record);
        const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
        const clockInTime = formatAttendanceTime(data.record.clock_in);

        sessionStorage.setItem(
          "latestAttendanceUpdate",
          JSON.stringify({
            userId: String(id).trim(),
            name: storedUser?.full_name || "User",
            todayStatus: "Present",
            activityStatus: "Clocked In",
            time: clockInTime,
            timestamp: Date.now(),
          })
        );
        sessionStorage.setItem("dashboardRefresh", Date.now().toString());
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Fetch status error:", err);
    } finally {
      setInitialFetch(false);
    }
  }, []);

  // 3b. Fetch attendance logs history (GET)
  const fetchHistoryLogs = useCallback(async (id: string, monthVal: number, yearVal: number) => {
    setFetchingHistory(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/attendance/history?userId=${id}&month=${monthVal}&year=${yearVal}`
      );
      const data = await response.json();
      if (data.success && data.history) {
        setHistoryLogs(data.history);
      }
    } catch (err) {
      console.error("Error fetching personal attendance logs:", err);
    } finally {
      setFetchingHistory(false);
    }
  }, []);

  // 4. Auto-refresh status and history logs every 30 seconds
  useEffect(() => {
    const userId = user?.user_id || user?.id;
    if (userId) {
      const interval = setInterval(() => {
        fetchStatus(userId);
        fetchHistoryLogs(userId, selectedMonth, selectedYear);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.user_id, user?.id, fetchStatus, fetchHistoryLogs, selectedMonth, selectedYear]);

  // 4b. Re-fetch history logs when filter changes
  useEffect(() => {
    const userId = user?.user_id || user?.id;
    if (userId) {
      fetchHistoryLogs(userId, selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear, user?.user_id, user?.id, fetchHistoryLogs]);

  // 4bb. Reset visible logs count when viewMode or selectedDate changes
  useEffect(() => {
    setVisibleLogsCount(10);
  }, [viewMode, selectedDate]);

  // 4c. Calculate stats from historyLogs
  useEffect(() => {
    let totalMonth = 0;
    let totalWeek = 0;
    let totalToday = 0;
    let overtime = 0;
    let breakTime = 0;
    
    // Use en-CA locale for YYYY-MM-DD format in LOCAL timezone (avoids UTC date shift for UTC+8 users)
    const today = new Date().toLocaleDateString('en-CA');

    // --- Company work-week schedule ---
    // Week 1 of month : Friday + Saturday are off  → work days Sun–Thu
    // Weeks 2, 3, 4  : Saturday only is off        → work days Sun–Fri + Sat… 
    //   Actually work week runs Saturday → Thursday (Fri always off).
    //   Week 1 additionally has Saturday off, so Week 1 = Sunday → Thursday.
    //
    // Find the most recent Saturday to use as the tentative week start.
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    const dayOfWeek = weekStart.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    // Days to go back to reach Saturday:
    //   Sat(6)→0, Sun(0)→1, Mon(1)→2, Tue(2)→3, Wed(3)→4, Thu(4)→5, Fri(5)→6
    const daysSinceSat = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
    weekStart.setDate(weekStart.getDate() - daysSinceSat);

    // Check if this Saturday is in Week 1 of its month (days 1–7).
    // In Week 1, Saturday is ALSO off → shift weekStart to Sunday instead.
    const satDayOfMonth = weekStart.getDate();
    const isWeek1 = satDayOfMonth <= 7;
    if (isWeek1) {
      // Saturday is off in Week 1 — week starts on Sunday
      weekStart.setDate(weekStart.getDate() + 1);
    }
    // Note: Friday is always off (no attendance records will exist for Fridays).
    
    historyLogs.forEach(log => {
      if (log.duration && log.duration !== '--' && log.duration !== '--:--') {
        const parts = log.duration.match(/(\d+)h\s*(\d+)m/);
        let hours = 0;
        if (parts) {
          hours = parseInt(parts[1]) + parseInt(parts[2]) / 60;
        } else {
          const hParts = log.duration.match(/(\d+)h/);
          if (hParts) hours = parseInt(hParts[1]);
        }
        
        totalMonth += hours;
        
        // Break time calculation (10% of working hours)
        breakTime += hours * 0.1;
        // NOTE: Overtime (OT) is not functional yet — hardcoded to 00:00
        
        const logDateStr = log.date ? log.date.split('T')[0] : "";

        // Format weekStart as YYYY-MM-DD for string comparison (timezone-safe)
        const weekStartStr = weekStart.toLocaleDateString('en-CA');

        if (logDateStr === today || (log.date && log.date.startsWith(today))) {
          totalToday += hours;
        }
        // This week: from most recent Saturday (or Sunday in Week 1) up to today
        if (logDateStr >= weekStartStr) {
          totalWeek += hours;
        }
      }
    });

    const formatHrs = (decimalHours: number) => {
      if (isNaN(decimalHours) || decimalHours < 0) return "00:00";
      const h = Math.floor(decimalHours);
      const m = Math.round((decimalHours - h) * 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    setStats({
      totalHoursToday: formatHrs(totalToday),
      totalHoursWeek: formatHrs(totalWeek),
      totalHoursMonth: formatHrs(totalMonth),
      overtimeMonth: "00:00", // OT not functional yet
      productiveHours: formatHrs(totalMonth - breakTime),
      breakHours: formatHrs(breakTime)
    });
  }, [historyLogs]);

  // 4c. Establish SSE stream for real-time updates
  useEffect(() => {
    const userId = user?.user_id || user?.id;
    if (!userId) return;

    const streamUrl = `${API_BASE_URL}/api/presence/stream`;
    console.log("🔌 Connecting Attendance to Presence Stream:", streamUrl);
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📡 Live attendance update received in dashboard:", data);
        if (data.userId === String(userId).trim() || data.type === 'refresh') {
          fetchStatus(userId);
          fetchHistoryLogs(userId, selectedMonth, selectedYear);
        }
      } catch (err) {
        console.error("Error parsing stream message in attendance:", err);
        fetchStatus(userId);
        fetchHistoryLogs(userId, selectedMonth, selectedYear);
      }
    };

    eventSource.onerror = (err) => {
      console.error("Attendance stream connection error:", err);
    };

    return () => {
      eventSource.close();
    };
  }, [user?.user_id, user?.id, fetchStatus, fetchHistoryLogs, selectedMonth, selectedYear]);

  // Export PDF Handler
  const handleExportPDF = () => {
    const targetLogs = viewMode === "day"
      ? historyLogs.filter(log => log.date === selectedDate)
      : historyLogs;

    if (targetLogs.length === 0) {
      toast({
        title: "Export Failed",
        description: "No attendance logs found to export.",
        variant: "destructive"
      });
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Export Failed",
        description: "Could not open print window. Please allow popups.",
        variant: "destructive"
      });
      return;
    }

    const branchNames: Record<string, string> = {
      "HQ": "Rayhar HQ",
      "KMM": "Kemaman",
      "TGG": "Kuala Terengganu",
      "CNH": "Cheneh",
      "KBG": "Kuala Berang",
      "DGN": "Dungun",
      "JTH": "Jertih",
      "KBR": "Kota Baru",
      "RMP": "Rompin",
      "MZM": "Muadzam Shah",
      "SHA": "Shah Alam",
      "BBB": "Bandar Baru Bangi",
      "KUL": "Kuala Lumpur",
      "IPH": "Ipoh",
      "MJG": "Manjung",
      "MLK": "Melaka",
      "KKS": "Kuala Kangsar",
      "TWU": "Tawau",
      "SNS": "Seremban",
      "AOR": "Alor Setar",
      "BTM": "Bertam",
      "BTP": "Batu Pahat",
      "JB": "Johor Bharu"
    };
    const userBranchCode = user?.branch || 'N/A';
    const fullBranchName = branchNames[userBranchCode] || userBranchCode;

    const logsHtml = targetLogs.map(log => {
      const d = new Date(log.date);
      const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      const statusClass = (log.status || '').toLowerCase().replace(/\s+/g, '');
      return `
        <tr>
          <td>${dateStr}</td>
          <td>${log.time_in || '--'}</td>
          <td>${log.time_out || '--'}</td>
          <td><span class="badge badge-${statusClass}">${log.status}</span></td>
          <td>${log.late || '--'}</td>
          <td class="duration">${log.duration || '--'}</td>
        </tr>
      `;
    }).join("");

    const periodName = viewMode === "day"
      ? new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    printWindow.document.write(`
      <html>
        <head>
          <title>Rayhar Staff Attendance Report - ${user?.full_name || 'Employee'}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 40px; }
            h1 { color: #7B0099; margin-bottom: 5px; font-size: 24px; font-weight: 800; }
            h2 { color: #64748b; font-size: 14px; margin-top: 0; font-weight: 600; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .meta-item { font-size: 13px; }
            .meta-item strong { color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #7B0099; color: white; text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            tr:nth-child(even) td { background: #f8fafc; }
            .badge { padding: 4px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; white-space: nowrap; display: inline-block; }
            .badge-present { background: #f3e8ff; color: #7b0099; }
            .badge-absent { background: #fee2e2; color: #991b1b; }
            .badge-leave { background: #fef3c7; color: #92400e; }
            .badge-companyleave { background: #eae5ff; color: #581c87; }
            .badge-holiday { background: #dbeafe; color: #1d4ed8; }
            .badge-weekend { background: #f1f5f9; color: #475569; }
            .duration { font-family: monospace; font-weight: 600; }
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
              <h2 style="margin: 2px 0 24px 0; font-size: 13px; font-weight: 700; color: #64748b;">Staff Attendance Report</h2>
            </div>
            <button onclick="window.print();" style="background: #7B0099; color: white; border: none; padding: 10px 20px; font-weight: 800; border-radius: 8px; cursor: pointer; font-size: 12px; transition: background 0.2s;">PRINT REPORT</button>
          </div>

          {/* Month-only KPI Cards */}
          {viewMode === "month" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mt-2">
              <div className="bg-card dark:bg-card border border-border/40 shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center mb-2 shadow-sm">
                  <CalendarDays className="w-4 h-4 text-violet-700" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-foreground">{companyLeaveCount}</div>
                <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Company Leave</div>
              </div>

              <div className="bg-card dark:bg-card border border-border/40 shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mb-2 shadow-sm">
                  <FileText className="w-4 h-4 text-amber-700" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-foreground">{approvedLeaveCount}</div>
                <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Approved Leave KPI</div>
              </div>

              <div className="bg-card dark:bg-card border border-border/40 shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-2 shadow-sm">
                  <Timer className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-foreground">{totalWorkdays}</div>
                <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Total Workdays (to date)</div>
              </div>
            </div>
          )}
          
          <div class="meta-grid">
            <div class="meta-item"><strong>Employee Name:</strong> ${user?.full_name || 'N/A'}</div>
            <div class="meta-item"><strong>Employee ID:</strong> ${user?.user_id || 'N/A'}</div>
            <div class="meta-item"><strong>Branch:</strong> ${fullBranchName}</div>
            <div class="meta-item"><strong>Report Period:</strong> ${periodName}</div>
          </div>

          <table>
            <thead>
               <tr>
                 <th>Date</th>
                 <th>Time In</th>
                 <th>Time Out</th>
                 <th>Status</th>
                 <th>Late</th>
                 <th>Working Hours</th>
               </tr>
            </thead>
            <tbody>
              ${logsHtml || '<tr><td colspan="6" style="text-align: center;">No attendance logs found for this period.</td></tr>'}
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

  // Export CSV Handler
  const handleExportCSV = () => {
    const targetLogs = viewMode === "day"
      ? historyLogs.filter(log => log.date === selectedDate)
      : historyLogs;

    if (targetLogs.length === 0) {
      toast({
        title: "Export Failed",
        description: "No attendance logs found to export.",
        variant: "destructive"
      });
      return;
    }

    const branchNames: Record<string, string> = {
      "HQ": "Rayhar HQ",
      "KMM": "Kemaman",
      "TGG": "Kuala Terengganu",
      "CNH": "Cheneh",
      "KBG": "Kuala Berang",
      "DGN": "Dungun",
      "JTH": "Jertih",
      "KBR": "Kota Baru",
      "RMP": "Rompin",
      "MZM": "Muadzam Shah",
      "SHA": "Shah Alam",
      "BBB": "Bandar Baru Bangi",
      "KUL": "Kuala Lumpur",
      "IPH": "Ipoh",
      "MJG": "Manjung",
      "MLK": "Melaka",
      "KKS": "Kuala Kangsar",
      "TWU": "Tawau",
      "SNS": "Seremban",
      "AOR": "Alor Setar",
      "BTM": "Bertam",
      "BTP": "Batu Pahat",
      "JB": "Johor Bharu"
    };
    const userBranchCode = user?.branch || 'N/A';
    const fullBranchName = branchNames[userBranchCode] || userBranchCode;

    const headers = ["Date", "Time In", "Time Out", "Status", "Late", "Working Hours"];
    const rows = targetLogs.map(log => {
      const d = new Date(log.date);
      const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      
      // Escape CSV values
      return [
        `"${dateStr.replace(/"/g, '""')}"`,
        `"${(log.time_in || '--').replace(/"/g, '""')}"`,
        `"${(log.time_out || '--').replace(/"/g, '""')}"`,
        `"${(log.status || '').replace(/"/g, '""')}"`,
        `"${(log.late || '--').replace(/"/g, '""')}"`,
        `"${(log.duration || '--').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "\ufeff" + [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const periodFileStr = viewMode === "day"
      ? selectedDate
      : new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' }).replace(/ /g, '_');

    link.setAttribute("href", url);
    link.setAttribute("download", `Rayhar_Attendance_Report_${user?.full_name || 'Employee'}_${periodFileStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `CSV Report for ${periodFileStr} has been downloaded.`,
    });
  };

  // 5. THE CORE ACTION: Clock In / Clock Out
  const handleAttendanceAction = async () => {
    const employeeId = user?.user_id || user?.id;

    if (!employeeId) {
      toast({
        title: "Auth Error",
        description: "User ID is missing. Please log out and back in.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const isClockOut = !!activeSession;
      const endpoint = isClockOut ? "/api/clock-out" : "/api/attendance";
      
      let attendance_type = "Normal";
      if (attendanceMode === 'temporary') attendance_type = "Temporary Assignment";
      else if (attendanceMode === 'multi') attendance_type = "Multi-Location";

      const payload: any = { user_id: String(employeeId).trim() };
      if (!isClockOut) {
        payload.location = selectedLocation;
        payload.attendance_type = attendance_type;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        const eventTime = formatAttendanceTime(
          isClockOut ? result.record?.clock_out : result.record?.clock_in
        );
        const dashboardUpdate = {
          userId: String(employeeId).trim(),
          name: user?.full_name || "User",
          todayStatus: isClockOut ? (result.isOnOutstation ? "Clocked Out (Outstation)" : "Clocked Out") : (result.isOnOutstation ? "Clocked In (Outstation)" : "Present"),
          activityStatus: isClockOut ? "Clocked Out" : (result.isOnOutstation ? "Clocked In (Outstation)" : "Clocked In"),
          time: eventTime,
          timestamp: Date.now(),
        };

        sessionStorage.setItem("latestAttendanceUpdate", JSON.stringify(dashboardUpdate));
        sessionStorage.setItem("dashboardRefresh", Date.now().toString());

        window.dispatchEvent(
          new CustomEvent("attendanceUpdated", { detail: dashboardUpdate })
        );

        toast({
          title: isClockOut ? "Successfully Clocked Out" : "Successfully Clocked In",
          description: isClockOut
            ? `Goodbye! Session ended at ${new Date().toLocaleTimeString()}`
            : `Welcome! Session started at ${new Date().toLocaleTimeString()}`,
        });

        await fetchStatus(employeeId);
        await fetchHistoryLogs(employeeId, selectedMonth, selectedYear);
      } else {
        throw new Error(result.error || result.message || "Action failed");
      }
    } catch (err: any) {
      console.error("Attendance Error Detail:", err);
      toast({
        title: err.message.includes("Company Leave") ? "Clock-In Restricted" : "Database Error",
        description: err.message || "Constraint violation. Check if your ID exists in the system.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate shift progress percentage (based on 9 hours standard shift)
  const getShiftProgress = () => {
    if (!activeSession || !activeSession.clock_in) return 0;
    
    let clockInStr = activeSession.clock_in;
    if (typeof clockInStr === "string") {
      clockInStr = clockInStr.replace(" ", "T");
      if (!clockInStr.endsWith("Z") && !clockInStr.includes("+") && (clockInStr.length < 19 || !clockInStr.substring(10).includes("-"))) {
        clockInStr += "Z";
      }
    }
    
    const start = new Date(clockInStr).getTime();
    const now = currentTime.getTime();
    const elapsedMs = now - start;
    const nineHoursMs = 9 * 60 * 60 * 1000;
    
    // Calculate ratio and clamp between 0 and 1
    return Math.min(Math.max(elapsedMs / nineHoursMs, 0), 1);
  };

  const getEstClockOutTime = () => {
    if (!activeSession || !activeSession.clock_in) return "--:--";
    
    let clockInStr = activeSession.clock_in;
    if (typeof clockInStr === "string") {
      clockInStr = clockInStr.replace(" ", "T");
      if (!clockInStr.endsWith("Z") && !clockInStr.includes("+") && (clockInStr.length < 19 || !clockInStr.substring(10).includes("-"))) {
        clockInStr += "Z";
      }
    }
    
    const parsed = activeSession.clock_in instanceof Date ? activeSession.clock_in : new Date(clockInStr);
    if (Number.isNaN(parsed.getTime())) return "--:--";
    
    const estEnd = new Date(parsed.getTime() + 9 * 60 * 60 * 1000);
    return estEnd.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const shiftProgress = getShiftProgress();

  const displayedLogs = historyLogs
    .filter(log => statusFilter === "ALL" || log.status === statusFilter)
    .filter(log => {
      if (viewMode === "month") return true;
      return log.date === selectedDate;
    });

  // Pagination calculations
  const totalRows = displayedLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const pagedLogs = displayedLogs.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filters or month change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, selectedMonth, selectedYear, pageSize, viewMode]);

  // KPI calculations for Month view
  const companyLeaveCount = historyLogs.filter(l => l.status === "Company Leave").length;
  const approvedLeaveCount = historyLogs.filter(l => {
    if (l.status !== "Leave") return false;
    if (l.leave_status) return (String(l.leave_status).toLowerCase() === "approved");
    return true; // assume backend marks only approved leaves as 'Leave' when leave_status absent
  }).length;

  const calculateTotalWorkdaysUpTo = (year: number, month: number) => {
    const today = new Date();
    const isCurrentMonth = (today.getFullYear() === year && (today.getMonth() + 1) === month);
    const lastDay = new Date(year, month, 0).getDate();
    const endDay = isCurrentMonth ? today.getDate() : lastDay;
    const empCreatedAtStr = user?.created_at ? new Date(user.created_at).toISOString().split('T')[0] : null;

    let count = 0;
    for (let d = 1; d <= endDay; d++) {
      const dt = new Date(year, month - 1, d);
      const wk = dt.getDay(); // 0 Sun - 6 Sat
      // Friday (5) is always off
      if (wk === 5) continue;
      // Saturday (6) is off only in Week 1 (days 1-7)
      if (wk === 6 && d <= 7) continue;

      if (empCreatedAtStr) {
        const dateStr = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
        if (dateStr < empCreatedAtStr) continue;
      }

      count++;
    }
    return count;
  };

  const totalWorkdays = calculateTotalWorkdaysUpTo(selectedYear, selectedMonth);

  if (initialFetch) {
    return (
      <div className="flex h-[60vh] sm:h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#7B0099] w-10 h-10" />
          <p className="text-muted-foreground font-medium animate-pulse text-sm">Initializing Attendance System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col mx-auto w-full animate-in fade-in duration-700">


      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-5 lg:gap-6 pb-6 w-full max-w-7xl mx-auto">

        {/* Main Clocking Card */}
        <div className="bg-card dark:bg-card w-full max-w-[340px] sm:max-w-md lg:flex-1 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 p-4 sm:p-5 md:p-6 flex flex-col items-center relative overflow-hidden border border-border lg:self-start">

          {user ? (
            <div className="flex-1 flex flex-col items-center justify-between w-full h-full">
              {/* Header section inside card */}
              <div className="flex flex-col items-center gap-0.5 mb-4 sm:mb-6">
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight font-mono drop-shadow-sm">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
                <div className="text-muted-foreground font-semibold text-[11px] sm:text-xs md:text-sm tracking-wide">
                  {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
              </div>

              {/* Company Leave Banner */}
              {attendanceStatus && attendanceStatus.type === "COMPANY_LEAVE" && !activeSession && (
                <div className="w-full mb-4 px-3 py-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 rounded-lg text-center shadow-inner">
                  <p className="text-xs font-bold text-purple-700 dark:text-purple-400">
                    🏢 Company Leave Today
                  </p>
                  <p className="text-[10px] font-semibold text-purple-600/80 dark:text-purple-400/80 mt-0.5 uppercase tracking-wider">
                    {attendanceStatus.name}
                  </p>
                  <p className="text-[9px] text-purple-500/90 dark:text-purple-400/70 mt-1 italic">
                    Attendance is not required today.
                  </p>
                </div>
              )}

              {/* Central Circular Button - compact and clean */}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 flex items-center justify-center mb-4 sm:mb-6 group">
                {/* Outer pulsing rings for active session */}
                {activeSession && (
                  <>
                    <div className="absolute inset-0 rounded-full border-[4px] sm:border-[6px] border-emerald-100 dark:border-emerald-900/30 opacity-50" />
                    {/* Dynamic Progress Ring */}
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30 dark:text-muted" />
                      <circle
                        cx="50" cy="50" r="46"
                        fill="none"
                        stroke="#7B0099"
                        strokeWidth="6"
                        strokeDasharray={289.027}
                        strokeDashoffset={289.027 - (shiftProgress * 289.027)}
                        strokeLinecap="round"
                        className="animate-pulse"
                        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                      />
                    </svg>
                  </>
                )}

                {/* Outer pulsing rings for inactive session */}
                {!activeSession && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-purple-50/50 dark:bg-purple-900/20 animate-pulse pointer-events-none" style={{ transform: 'scale(1.15)' }} />
                    <div className="absolute inset-2 rounded-full bg-purple-100/30 dark:bg-purple-800/10 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
                  </>
                )}

                {!activeSession && attendanceMode === 'multi' && allowedLocations.length > 1 && (
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-48 z-10 bg-card rounded-md shadow-lg border border-border p-1">
                    <label className="text-[10px] font-semibold text-muted-foreground px-2 mb-1 block uppercase">Select Working Location</label>
                    <select
                      className="w-full bg-background border-none text-sm font-semibold p-1.5 focus:ring-0 outline-none rounded text-foreground cursor-pointer"
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                    >
                      {allowedLocations.map((loc, i) => (
                        <option key={i} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={handleAttendanceAction}
                  disabled={loading || (attendanceStatus && !attendanceStatus.clockInAllowed && !activeSession)}
                  className={`relative w-28 h-28 sm:w-36 sm:h-36 md:w-38 md:h-38 rounded-full flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.96] shadow-2xl focus:outline-none focus:ring-4 focus:ring-offset-4 dark:focus:ring-offset-card touch-target ${
                    activeSession
                    ? "bg-card dark:bg-card border-[3px] border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/20"
                    : attendanceStatus && !attendanceStatus.clockInAllowed
                    ? "bg-purple-100 dark:bg-purple-950/60 border-[3px] border-purple-500 text-purple-600 dark:text-purple-400 shadow-purple-500/10 cursor-not-allowed"
                    : "bg-gradient-to-tr from-[#5e0080] via-[#7B0099] to-purple-500 focus:ring-purple-200 dark:focus:ring-purple-800 text-white shadow-purple-500/40"
                    }`}
                  aria-label={activeSession ? "Clock out - End shift" : (attendanceStatus && !attendanceStatus.clockInAllowed) ? "Company Leave - Clock-in disabled" : "Clock in - Start shift"}
                >
                  {loading ? (
                    <Loader2 className={`animate-spin w-6 h-6 sm:w-8 sm:h-8 ${activeSession ? "text-emerald-500" : "text-white"}`} />
                  ) : activeSession ? (
                    <>
                      <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 dark:text-emerald-400 mb-0.5" />
                      <span className="font-black tracking-widest text-xs sm:text-sm md:text-base">END SHIFT</span>
                    </>
                  ) : attendanceStatus && !attendanceStatus.clockInAllowed ? (
                    <>
                      <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 mb-0.5 animate-pulse" />
                      <span className="font-black tracking-widest text-[9px] sm:text-xs text-purple-700 dark:text-purple-400 text-center uppercase max-w-[85%] leading-tight break-words">
                        {attendanceStatus.name || "Company Leave"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Hand className="w-6 h-6 sm:w-8 sm:h-8 text-white/90 drop-shadow-md mb-0.5 animate-bounce" style={{ animationDuration: '2s' }} />
                      <span className="font-black tracking-widest text-sm sm:text-base md:text-lg drop-shadow-md">CLOCK IN</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-bold mb-3 sm:mb-4 bg-muted/30 dark:bg-muted/50 py-1.5 px-4 rounded-md w-full border border-border/50">
                {activeSession ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-emerald-600 dark:text-emerald-400">Shift in progress ({Math.round(shiftProgress * 100)}%)...</span>
                  </>
                ) : attendanceStatus && !attendanceStatus.clockInAllowed ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                    <span className="text-purple-600 dark:text-purple-400">Company Leave Active</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                    <span className="text-purple-600 dark:text-purple-400">Ready to start</span>
                  </>
                )}
              </div>

              {/* Bottom Details Row */}
              <div className="w-full grid grid-cols-3 gap-2 border-t border-border/50 pt-3 sm:pt-4">
                <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-50 dark:bg-purple-950/30 text-[#7B0099] dark:text-purple-400 flex items-center justify-center shadow-inner">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Clock In</span>
                  <span className="text-[11px] sm:text-xs font-bold text-foreground">
                    {activeSession ? formatAttendanceTime(activeSession.clock_in) : "--:--"}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 flex items-center justify-center shadow-inner">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    {activeSession ? "Est. Out" : "Clock Out"}
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-foreground">
                    {activeSession ? getEstClockOutTime() : "--:--"}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                    <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Working Hrs</span>
                  <span className="text-[11px] sm:text-xs font-bold text-foreground font-mono">
                    {workingHrs}
                  </span>
                </div>
              </div>

            </div>
          ) : (
            <div className="py-10 sm:py-16 space-y-3 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Fingerprint className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
              </div>
              <p className="text-lg sm:text-xl text-muted-foreground font-bold">Authentication Required</p>
              <p className="text-muted-foreground text-sm">Please log in to your account to record attendance.</p>
            </div>
          )}
        </div>

        
        {/* RIGHT PANEL: Stats & Timeline */}
        <div className="flex-1 flex flex-col gap-4 sm:gap-6 w-full lg:max-w-none max-w-2xl">
          
          {/* 4 Stat Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Stat Card 1: Total Hours Today */}
            <div className="bg-card dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md hover:border-purple-300 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors p-4 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <Clock className="w-10 h-10 text-[#7B0099]" />
              </div>
              <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mb-2 shadow-sm">
                 <Clock className="w-4 h-4 text-[#7B0099] dark:text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
                {stats.totalHoursToday} <span className="text-xs text-muted-foreground">hrs</span>
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                Total Today
              </div>
            </div>

            {/* Stat Card 2: Total Hours Week */}
            <div className="bg-card dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md hover:border-purple-300 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors p-4 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <Timer className="w-10 h-10 text-[#7B0099]" />
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-2 shadow-sm">
                 <Timer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
                {stats.totalHoursWeek} <span className="text-xs text-muted-foreground">hrs</span>
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                Total This Week
              </div>
            </div>

            {/* Stat Card 3: Total Hours Month */}
            <div className="bg-card dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md hover:border-purple-300 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors p-4 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <FileText className="w-10 h-10 text-[#7B0099]" />
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-2 shadow-sm">
                 <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
                {stats.totalHoursMonth} <span className="text-xs text-muted-foreground">hrs</span>
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                Total This Month
              </div>
            </div>

            {/* Stat Card 4: Overtime This Month */}
            <div className="bg-card dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md hover:border-purple-300 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors p-4 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <Fingerprint className="w-10 h-10 text-[#7B0099]" />
              </div>
              <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center mb-2 shadow-sm">
                 <Fingerprint className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
                {stats.overtimeMonth} <span className="text-xs text-muted-foreground">hrs</span>
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                OT This Month
              </div>
            </div>

          </div>

          {/* Timeline Bar Card */}
          <div className="bg-card dark:bg-card border border-border shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl p-5 sm:p-6 flex flex-col relative overflow-hidden min-h-[220px]">
            <h3 className="text-xs font-black text-muted-foreground/60 uppercase tracking-widest mb-6">
              Monthly Attendance Breakdown
            </h3>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-200"></span> Total Working
                </span>
                <span className="text-sm font-black font-mono">{stats.totalHoursMonth} hrs</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-emerald-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Productive
                </span>
                <span className="text-sm font-black font-mono">{stats.productiveHours} hrs</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-yellow-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Break Hours
                </span>
                <span className="text-sm font-black font-mono">{stats.breakHours} hrs</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-blue-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Overtime
                </span>
                <span className="text-sm font-black font-mono">{stats.overtimeMonth} hrs</span>
              </div>
            </div>

            {/* Visual Timeline Bar */}
            <div className="w-full h-4 sm:h-5 bg-muted rounded-full flex overflow-hidden shadow-inner mt-auto mb-2">
               {/* Note: Mock widths for visualization if there is no data */}
               {Number(stats.totalHoursMonth) > 0 ? (
                  <>
                    <div className="bg-emerald-500 h-full" style={{ width: `${(Number(stats.productiveHours) / Number(stats.totalHoursMonth)) * 100}%` }}></div>
                    <div className="bg-yellow-500 h-full" style={{ width: `${(Number(stats.breakHours) / Number(stats.totalHoursMonth)) * 100}%` }}></div>
                    <div className="bg-blue-500 h-full" style={{ width: `${(Number(stats.overtimeMonth) / Number(stats.totalHoursMonth)) * 100}%` }}></div>
                  </>
               ) : (
                  <div className="w-full h-full bg-muted"></div>
               )}
            </div>
            
            {/* Timeline Axis Markers */}
            <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground mt-2 px-1">
               <span>Week 1</span>
               <span>Week 2</span>
               <span>Week 3</span>
               <span>Week 4</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM PANEL: Employee Attendance Data Table */}
      <div className="relative z-10 w-full max-w-7xl mx-auto pb-8">
        <Card className="border-border shadow-sm overflow-hidden bg-card/60 backdrop-blur-md min-h-[400px]">
          
          {/* Header Row */}
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 bg-muted/20 pb-4">
            <div>
              <CardTitle className="text-lg font-bold">Employee Attendance</CardTitle>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Detailed Log Records</p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* Date Filter */}
              <div className="relative">
                {viewMode === "day" ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="appearance-none flex items-center justify-center px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-[34px] gap-2 hover:bg-muted/80">
                        {new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()} <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1" align="start">
                      <Calendar
                        mode="single"
                        selected={new Date(selectedDate)}
                        onSelect={(d) => {
                          if (d) setSelectedDate(new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0]);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <input
                    type="month"
                    value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedDate(`${e.target.value}-01`);
                      }
                    }}
                    className="appearance-none flex items-center justify-center px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest"
                  />
                )}
              </div>

              {/* View Tabs */}
              <div className="flex bg-muted/40 p-1 rounded-md border border-border/40">
                <button
                  onClick={() => setViewMode("day")}
                  className={`px-4 py-1.5 text-[10px] font-black tracking-wider rounded-md transition-all uppercase ${
                    viewMode === "day" ? "bg-[#7B0099] text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setViewMode("month")}
                  className={`px-4 py-1.5 text-[10px] font-black tracking-wider rounded-md transition-all uppercase ${
                    viewMode === "month" ? "bg-[#7B0099] text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Month
                </button>
              </div>

              {/* Status Filter */}
              <div className="flex bg-muted/40 p-1 rounded-md border border-border/40">
                {(["ALL", "ON TIME", "LATE"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 text-[10px] font-black tracking-wider rounded-md transition-all uppercase ${
                      statusFilter === status ? "bg-[#7B0099] text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              
              {/* Export */}
              <ExportDropdown onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />
            </div>
          </CardHeader>

          {/* Table Container */}
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="py-4 pl-6 font-medium">Date</TableHead>
                    <TableHead className="font-medium">Time In</TableHead>
                    <TableHead className="font-medium">Time Out</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Late</TableHead>
                    <TableHead className="text-right pr-6 font-medium">Working Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {fetchingHistory && historyLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#7B0099] mx-auto mb-2" />
                      <p className="text-sm font-medium text-muted-foreground">Loading Data...</p>
                    </TableCell>
                  </TableRow>
                ) : displayedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center">
                       <Clock className="w-8 h-8 opacity-20 mx-auto mb-2" />
                       <p className="text-sm font-medium text-muted-foreground">No logs found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedLogs.map((log, index) => {
                    const logDate = new Date(log.date);
                    const dateStr = logDate.toLocaleString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
                    
                    let statusBadge = "bg-muted/5 text-muted-foreground border-muted";
                    if (log.status === "Present") {
                      if (log.late !== "00:00" && log.late !== "--") {
                        statusBadge = "bg-rose-100/50 text-rose-700 border-rose-200/50 dark:bg-rose-900/20 dark:text-rose-400";
                      } else {
                        statusBadge = "bg-purple-100/50 text-[#7B0099] border-[#7B0099]/20 dark:bg-purple-900/20 dark:text-purple-400";
                      }
                    } else if (log.status === "Company Leave") {
                      statusBadge = "bg-violet-100/50 text-violet-700 border-violet-200/50 dark:bg-violet-900/20 dark:text-violet-400";
                    } else if (log.status === "Leave") {
                      statusBadge = "bg-amber-100/50 text-amber-700 border-amber-200/50 dark:bg-amber-900/20 dark:text-amber-400";
                    } else if (log.status === "Holiday") {
                      statusBadge = "bg-blue-100/50 text-blue-700 border-blue-200/50 dark:bg-blue-900/20 dark:text-blue-400";
                    } else if (log.status === "Weekend") {
                      statusBadge = "bg-slate-100/50 text-slate-700 border-slate-200 dark:border-slate-800/50 dark:bg-slate-900/20 dark:text-slate-400";
                    } else if (log.status === "N/A") {
                      statusBadge = "bg-slate-100/50 text-slate-400 border-slate-200 dark:border-slate-800/50 dark:bg-slate-900/20 dark:text-slate-500";
                    } else if (log.status === "Absent") {
                      statusBadge = "bg-red-100/50 text-red-700 border-red-200/50 dark:bg-red-900/20 dark:text-red-400";
                    }

                    return (
                      <TableRow key={log.attendance_id || index} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="py-4 pl-6 font-medium text-foreground whitespace-nowrap">{dateStr}</TableCell>
                        <TableCell className="font-medium text-foreground">
                          {log.time_in || "--"}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {log.time_out || "--"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold rounded-md border ${statusBadge}`}>
                            {log.status}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-rose-600">{log.late}</TableCell>
                        <TableCell className="font-bold text-emerald-600 text-right pr-6">{log.duration}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>

          {/* Pagination Controls */}
          {totalRows > pageSize && (
            <div className="flex items-center justify-between py-3 px-4 border-t border-border/50 bg-muted/10">
              <div className="text-sm text-muted-foreground">Showing {(page-1)*pageSize + 1} - {Math.min(page*pageSize, totalRows)} of {totalRows}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-[11px] font-black rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50"
                >Prev</button>
                <div className="text-sm font-bold">{page} / {totalPages}</div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-[11px] font-black rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50"
                >Next</button>
              </div>
            </div>
          )}

        </Card>
      </div>
    </div>
  );
}
