import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock, Calendar, Fingerprint, Hand, Timer } from "lucide-react";

const formatAttendanceTime = (value: unknown) => {
  if (!value) return "--:--";

  const parsed =
    value instanceof Date
      ? value
      : typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)
        ? new Date(value.replace(" ", "T"))
        : new Date(value as string | number);

  if (Number.isNaN(parsed.getTime())) return "--:--";

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function Attendance() {
  const [loading, setLoading] = useState(false);
  const [initialFetch, setInitialFetch] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSession, setActiveSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [workingHrs, setWorkingHrs] = useState("--:--");

  const { toast } = useToast();

  // 1. Update time every second and calculate working hours
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (activeSession && activeSession.clock_in) {
        const start = new Date(
          activeSession.clock_in instanceof Date
            ? activeSession.clock_in
            : typeof activeSession.clock_in === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(activeSession.clock_in)
              ? activeSession.clock_in.replace(" ", "T")
              : activeSession.clock_in
        ).getTime();
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

  // 2. Load user from localStorage and fetch status
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      const userId = parsedUser.user_id || parsedUser.id;
      if (userId) {
        fetchStatus(userId);
      } else {
        setInitialFetch(false);
      }
    } else {
      setInitialFetch(false);
    }
  }, []);

  // 3. Fetch attendance status (GET)
  const fetchStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(
        `https://rayhar-staff-production.up.railway.app/api/attendance-status?empId=${id}`
      );
      const data = await response.json();

      if (data.active && data.record) {
        setActiveSession(data.record);
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        const clockInTime = formatAttendanceTime(data.record.clock_in);

        localStorage.setItem(
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
        localStorage.setItem("dashboardRefresh", Date.now().toString());
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Fetch status error:", err);
    } finally {
      setInitialFetch(false);
    }
  }, []);

  // 4. Auto-refresh status every 30 seconds
  useEffect(() => {
    const userId = user?.user_id || user?.id;
    if (userId) {
      const interval = setInterval(() => {
        fetchStatus(userId);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.user_id, user?.id, fetchStatus]);

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

      const response = await fetch(`https://rayhar-staff-production.up.railway.app${endpoint}`, {
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

        localStorage.setItem("latestAttendanceUpdate", JSON.stringify(dashboardUpdate));
        localStorage.setItem("dashboardRefresh", Date.now().toString());

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

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in zoom-in-95 duration-700">

        {/* Main Card */}
        <div className="bg-card dark:bg-card w-full max-w-[340px] sm:max-w-md rounded-[28px] sm:rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] p-6 sm:p-8 md:p-10 flex flex-col items-center relative overflow-hidden border border-border/30">

          {user ? (
            <>
              {/* Header section inside card */}
              <div className="flex flex-col items-center gap-1 mb-6 sm:mb-10">
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight font-mono drop-shadow-sm">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
                <div className="text-muted-foreground font-semibold text-xs sm:text-sm md:text-base tracking-wide">
                  {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
              </div>

              {/* Central Circular Button - larger on mobile for easy touch */}
              <div className="relative w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 flex items-center justify-center mb-6 sm:mb-10 group">
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
                  className={`relative w-36 h-36 sm:w-48 sm:h-48 md:w-52 md:h-52 rounded-full flex flex-col items-center justify-center gap-2 sm:gap-3 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.96] shadow-2xl focus:outline-none focus:ring-4 focus:ring-offset-4 dark:focus:ring-offset-card touch-target ${activeSession
                    ? "bg-card dark:bg-card border-4 border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/20"
                    : "bg-gradient-to-tr from-[#5e0080] via-[#7B0099] to-purple-500 focus:ring-purple-200 dark:focus:ring-purple-800 text-white shadow-purple-500/40"
                    }`}
                  aria-label={activeSession ? "Clock out - End shift" : "Clock in - Start shift"}
                >
                  {loading ? (
                    <Loader2 className={`animate-spin w-8 h-8 sm:w-10 sm:h-10 ${activeSession ? "text-emerald-500" : "text-white"}`} />
                  ) : activeSession ? (
                    <>
                      <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500 dark:text-emerald-400 mb-1" />
                      <span className="font-black tracking-widest text-base sm:text-lg">END SHIFT</span>
                    </>
                  ) : (
                    <>
                      <Hand className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 drop-shadow-md mb-1 animate-bounce" style={{ animationDuration: '2s' }} />
                      <span className="font-black tracking-widest text-lg sm:text-xl drop-shadow-md">CLOCK IN</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status Message */}
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold mb-6 sm:mb-8 bg-muted/30 dark:bg-muted/50 py-2 px-4 sm:px-6 rounded-full w-full border border-border/50">
                {activeSession ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-emerald-700 dark:text-emerald-400 truncate">Location: You are in Office-reach</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" />
                    <span className="text-muted-foreground truncate">Location: Checking position...</span>
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

            </>
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

      </div>
    </div>
  );
}
