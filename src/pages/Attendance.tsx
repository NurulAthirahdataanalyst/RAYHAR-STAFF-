import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock, Fingerprint, Hand, Timer, MapPin, Home, SlidersHorizontal, Download, ChevronDown, FileText } from "lucide-react";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";

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
  const [visibleLogsCount, setVisibleLogsCount] = useState(4);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  // Advanced Interactive Filters & States
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  });
  const selectedMonth = parseInt(selectedDate.split('-')[1]);
  const selectedYear = parseInt(selectedDate.split('-')[0]);

  const [statusFilter, setStatusFilter] = useState<"ALL" | "ON TIME" | "LATE">("ALL");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isOnLeave, setIsOnLeave] = useState(false);

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
      } else {
        setInitialFetch(false);
      }
    } else {
      setInitialFetch(false);
    }
  }, [user]);

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

    const logsHtml = historyLogs.map(log => {
      const d = new Date(log.clock_in);
      const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      return `
        <tr>
          <td>${dateStr}</td>
          <td>${log.time_in || '--:--'}</td>
          <td>${log.time_out || '--:--'}</td>
          <td><span class="badge badge-${log.status.toLowerCase().replace(' ', '')}">${log.status}</span></td>
          <td>${log.location_type === 'remote' ? log.location_name : fullBranchName}</td>
          <td class="duration">${log.duration || '--'}</td>
        </tr>
      `;
    }).join("");

    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

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
            .badge { padding: 4px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; }
            .badge-ontime { background: #f3e8ff; color: #7b0099; }
            .badge-late { background: #ffe4e6; color: #e11d48; }
            .badge-remote { background: #dbeafe; color: #1d4ed8; }
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
          
          <div class="meta-grid">
            <div class="meta-item"><strong>Employee Name:</strong> ${user?.full_name || 'N/A'}</div>
            <div class="meta-item"><strong>Employee ID:</strong> ${user?.user_id || 'N/A'}</div>
            <div class="meta-item"><strong>Branch:</strong> ${fullBranchName}</div>
            <div class="meta-item"><strong>Report Period:</strong> ${monthName}</div>
          </div>

          <table>
            <thead>
               <tr>
                 <th>Date</th>
                 <th>Clock In</th>
                 <th>Clock Out</th>
                 <th>Status</th>
                 <th>Location</th>
                 <th>Duration</th>
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

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: String(employeeId).trim()
        }),
      });

      const result = await response.json();

      if (result.success) {
        const eventTime = formatAttendanceTime(
          isClockOut ? result.record?.clock_out : result.record?.clock_in
        );
        const dashboardUpdate = {
          userId: String(employeeId).trim(),
          name: user?.full_name || "User",
          todayStatus: isClockOut ? "Clocked Out" : "Present",
          activityStatus: isClockOut ? "Clocked Out" : "Clocked In",
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
        throw new Error(result.error || "Action failed");
      }
    } catch (err: any) {
      console.error("Attendance Error Detail:", err);
      toast({
        title: "Database Error",
        description: err.message || "Constraint violation. Check if your ID exists in the system.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
    <div className="relative min-h-[calc(100vh-8rem)] sm:min-h-[calc(100vh-6rem)] rounded-[24px] sm:rounded-[40px] overflow-hidden bg-card dark:bg-card flex flex-col mx-0 sm:mx-2 md:mx-6 my-2 sm:my-6 shadow-sm border border-border/50">
      {/* Dynamic Background Top Half */}
      <div className="absolute top-0 left-0 right-0 h-[40%] sm:h-[45%] bg-gradient-to-br from-[#5e0080] via-[#7B0099] to-[#a855f7] rounded-b-[40px] sm:rounded-b-[60px] z-0 shadow-2xl" />

      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-6 lg:gap-8 p-4 sm:p-8 md:p-10 animate-in fade-in zoom-in-95 duration-700 w-full max-w-2xl lg:max-w-[1400px] mx-auto">

        {/* Main Clocking Card */}
        <div className="bg-card dark:bg-card w-full max-w-[340px] sm:max-w-md lg:flex-1 rounded-[28px] sm:rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] p-5 sm:p-6 md:p-8 flex flex-col items-center relative overflow-hidden border border-border/30">

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

              {/* Central Circular Button - compact and clean */}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 flex items-center justify-center mb-4 sm:mb-6 group">
                {/* Outer pulsing rings for active session */}
                {activeSession && (
                  <>
                    <div className="absolute inset-0 rounded-full border-[4px] sm:border-[6px] border-emerald-100 dark:border-emerald-900/30 opacity-50" />
                    {/* Fake Progress Ring */}
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
                      <circle cx="50%" cy="50%" r="48%" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30 dark:text-muted" />
                      <circle
                        cx="50%" cy="50%" r="48%"
                        fill="none"
                        stroke="#7B0099"
                        strokeWidth="6"
                        strokeDasharray="400 800"
                        strokeLinecap="round"
                        className="animate-pulse"
                        style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
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

                <button
                  onClick={handleAttendanceAction}
                  disabled={loading}
                  className={`relative w-28 h-28 sm:w-36 sm:h-36 md:w-38 md:h-38 rounded-full flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.96] shadow-2xl focus:outline-none focus:ring-4 focus:ring-offset-4 dark:focus:ring-offset-card touch-target ${
                    activeSession
                    ? "bg-card dark:bg-card border-[3px] border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/20"
                    : "bg-gradient-to-tr from-[#5e0080] via-[#7B0099] to-purple-500 focus:ring-purple-200 dark:focus:ring-purple-800 text-white shadow-purple-500/40"
                    }`}
                  aria-label={activeSession ? "Clock out - End shift" : "Clock in - Start shift"}
                >
                  {loading ? (
                    <Loader2 className={`animate-spin w-6 h-6 sm:w-8 sm:h-8 ${activeSession ? "text-emerald-500" : "text-white"}`} />
                  ) : activeSession ? (
                    <>
                      <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 dark:text-emerald-400 mb-0.5" />
                      <span className="font-black tracking-widest text-xs sm:text-sm md:text-base">END SHIFT</span>
                    </>
                  ) : (
                    <>
                      <Hand className="w-6 h-6 sm:w-8 sm:h-8 text-white/90 drop-shadow-md mb-0.5 animate-bounce" style={{ animationDuration: '2s' }} />
                      <span className="font-black tracking-widest text-sm sm:text-base md:text-lg drop-shadow-md">CLOCK IN</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-bold mb-4 sm:mb-6 bg-muted/30 dark:bg-muted/50 py-1.5 px-4 rounded-full w-full border border-border/50">
                {activeSession ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-emerald-600 dark:text-emerald-400">Shift in progress...</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                    <span className="text-purple-600 dark:text-purple-400">Ready to start</span>
                  </>
                )}
              </div>

              {/* Bottom Details Row */}
              <div className="w-full grid grid-cols-3 gap-2 border-t border-border/50 pt-4 sm:pt-6">
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
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Clock Out</span>
                  <span className="text-[11px] sm:text-xs font-bold text-foreground">
                    --:--
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
            <div className="py-12 sm:py-20 space-y-4 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Fingerprint className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
              </div>
              <p className="text-lg sm:text-xl text-muted-foreground font-bold">Authentication Required</p>
              <p className="text-muted-foreground text-sm">Please log in to your account to record attendance.</p>
            </div>
          )}
        </div>

        {/* Daily Logs History Card */}
        <div className="bg-card dark:bg-card w-full max-w-[340px] sm:max-w-md md:max-w-xl lg:flex-1 rounded-[28px] sm:rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] p-5 sm:p-6 md:p-8 flex flex-col relative border border-border/30 overflow-hidden min-h-[480px]">
          
          {/* Top Actions Row */}
          <div className="flex items-center justify-between gap-2 mb-6">
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="appearance-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[#7B0099] text-white text-[11px] font-black rounded-full shadow-lg shadow-purple-900/10 hover:scale-105 active:scale-95 transition-all outline-none border-none cursor-pointer uppercase tracking-widest relative z-10"
                style={{ colorScheme: "dark" }}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 border border-border hover:bg-muted text-xs font-black rounded-full transition-all ${
                  showFilters ? "bg-muted text-foreground" : "bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
              </button>
              
              <button 
                onClick={handleExportPDF}
                className="flex items-center justify-center gap-1.5 px-3 py-2 border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-black rounded-full transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Interactive Filters Panel */}
          {showFilters && (
            <div className="flex items-center gap-1.5 p-1.5 bg-muted/40 dark:bg-muted/20 border border-border/40 rounded-2xl mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
              {(["ALL", "ON TIME", "LATE"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-xl tracking-wider transition-all uppercase ${
                    statusFilter === status
                      ? "bg-[#7B0099] text-white shadow-md shadow-purple-950/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          )}

          <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-4">
            Daily Logs
          </h3>

          {fetchingHistory && historyLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 flex-1">
              <Loader2 className="animate-spin text-[#7B0099] w-6 h-6" />
              <p className="text-[11px] font-bold text-muted-foreground/75 uppercase tracking-wider animate-pulse">Loading Logs...</p>
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border border-dashed border-border/60 rounded-[24px] flex-1">
              <Clock className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-xs font-bold uppercase tracking-wider">No logs recorded yet</p>
              <p className="text-[10px] opacity-80 mt-0.5">Your shift logs will appear here</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3.5">
                {historyLogs
                  .filter(log => statusFilter === "ALL" || log.status === statusFilter)
                  .filter(log => {
                    const d = new Date(log.clock_in);
                    const logDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                    return logDate === selectedDate;
                  })
                  .slice(0, visibleLogsCount)
                  .map((log, index) => {
                    const clockInDate = new Date(log.clock_in);
                    const month = clockInDate.toLocaleString("en-US", { month: "short" }).toUpperCase();
                    const day = clockInDate.getDate().toString().padStart(2, "0");
                    const isExpanded = expandedLogId === log.attendance_id;
                    
                    let statusBadgeClass = "";
                    if (log.status === "ON TIME") {
                      statusBadgeClass = "bg-purple-100 dark:bg-purple-950/40 text-[#7B0099] dark:text-purple-300 border border-purple-200/50";
                    } else if (log.status === "REMOTE") {
                      statusBadgeClass = "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50";
                    } else if (log.status === "LATE") {
                      statusBadgeClass = "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/50";
                    }

                    return (
                      <div 
                        key={log.attendance_id || index}
                        onClick={() => setExpandedLogId(isExpanded ? null : log.attendance_id)}
                        className="flex flex-col p-3 bg-muted/20 hover:bg-muted/45 border border-border/40 rounded-2xl transition-all duration-300 cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Date Block Card */}
                            <div className="flex flex-col items-center justify-center bg-purple-50 dark:bg-purple-950/20 border border-purple-100/50 dark:border-purple-900/30 rounded-xl px-2.5 py-1.5 shrink-0 select-none shadow-sm text-center min-w-[56px] h-[52px]">
                              <span className="text-[9px] font-black text-[#7B0099] dark:text-purple-400 tracking-wider uppercase leading-none">{month}</span>
                              <span className="text-sm font-black text-foreground mt-1 leading-none">{day}</span>
                            </div>

                            {/* Middle Details Block */}
                            <div className="flex flex-col gap-0.5">
                              <div className="text-[11px] sm:text-xs font-black text-foreground/90 tracking-tight">
                                {formatAttendanceTime(log.clock_in)} — {log.clock_out ? formatAttendanceTime(log.clock_out) : "--:--"}
                              </div>
                              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-muted-foreground/75 font-semibold">
                                {log.location_type === "remote" ? (
                                  <Home className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                ) : (
                                  <MapPin className="w-2.5 h-2.5 text-[#7B0099] shrink-0" />
                                )}
                                <span className="truncate max-w-[120px] sm:max-w-none">{log.location_name}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right Status & Duration Block */}
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 text-[8px] font-black tracking-widest rounded-full uppercase scale-90 origin-right ${statusBadgeClass}`}>
                              {log.status}
                            </span>
                            <div className="text-right text-[11px] sm:text-xs font-black shrink-0 font-mono tracking-tight text-[#7B0099] dark:text-purple-300">
                              {log.duration}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Details Block */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-border/40 text-[10px] sm:text-xs text-muted-foreground space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex justify-between">
                              <span>Clock In Time:</span>
                              <span className="font-mono font-bold text-foreground">{formatFullDateTime(log.clock_in)}</span>
                            </div>
                            {log.clock_out && (
                              <div className="flex justify-between">
                                <span>Clock Out Time:</span>
                                <span className="font-mono font-bold text-foreground">{formatFullDateTime(log.clock_out)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span>Computed Working Hours:</span>
                              <span className="font-mono font-bold text-foreground">{log.duration}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Status Metric:</span>
                              <span className="font-mono font-bold text-foreground">{log.status} {log.is_late ? "(LATE ARRIVAL)" : ""}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Load More Button */}
              {historyLogs.filter(log => statusFilter === "ALL" || log.status === statusFilter).filter(log => {
                 const d = new Date(log.clock_in);
                 return (d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')) === selectedDate;
              }).length > visibleLogsCount && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setVisibleLogsCount(prev => prev + 4);
                  }}
                  className="w-full mt-4 py-2 flex items-center justify-center gap-1 text-[#7B0099] dark:text-purple-400 hover:text-purple-600 font-black text-[10px] sm:text-[11px] tracking-wider uppercase transition-colors"
                >
                  <span>Load More History</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
