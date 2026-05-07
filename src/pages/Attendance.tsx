import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock, Calendar, Fingerprint, Hand, Timer } from "lucide-react";

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
        const start = new Date(activeSession.clock_in).getTime();
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
      if (parsedUser.user_id) {
        fetchStatus(parsedUser.user_id);
      }
    } else {
      setInitialFetch(false);
    }
  }, []);

  // 3. Fetch attendance status (GET)
  const fetchStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/attendance-status?empId=${id}`
      );
      const data = await response.json();

      if (data.active && data.record) {
        setActiveSession(data.record);
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        const clockInTime = new Date(data.record.clock_in).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

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
    if (user?.user_id) {
      const interval = setInterval(() => {
        fetchStatus(user.user_id);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.user_id, fetchStatus]);

  // 5. THE CORE ACTION: Clock In / Clock Out
  const handleAttendanceAction = async () => {
    const employeeId = user?.user_id;

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

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: String(employeeId).trim()
        }),
      });

      const result = await response.json();

      if (result.success) {
        const eventDate = new Date(
          isClockOut
            ? result.record?.clock_out || Date.now()
            : result.record?.clock_in || Date.now()
        );
        const eventTime = eventDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
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
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#800000] w-10 h-10" />
          <p className="text-slate-400 font-medium animate-pulse">Initializing Attendance System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-6rem)] rounded-[40px] overflow-hidden bg-slate-50 flex flex-col mx-2 sm:mx-6 my-6 shadow-sm border border-slate-100">
      {/* Dynamic Background Top Half */}
      <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-br from-[#5e0080] via-[#8f00bd] to-[#8b16e4ff] rounded-b-[60px] z-0 shadow-2xl" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in zoom-in-95 duration-700">

        {/* Main Card */}
        <div className="bg-white w-full max-w-sm sm:max-w-md rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.15)  ] p-8 sm:p-10 flex flex-col items-center relative overflow-hidden">

          {user ? (
            <>
              {/* Header section inside card */}
              <div className="flex flex-col items-center gap-1 mb-10">
                <div className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight font-mono drop-shadow-sm">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
                <div className="text-slate-400 font-semibold text-sm sm:text-base tracking-wide">
                  {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
              </div>

              {/* Central Circular Button */}
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center mb-10 group">
                {/* Outer pulsing rings for active session */}
                {activeSession && (
                  <>
                    <div className="absolute inset-0 rounded-full border-[6px] border-emerald-50 opacity-50" />
                    {/* Fake Progress Ring */}
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
                      <circle cx="50%" cy="50%" r="48%" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                      <circle
                        cx="50%" cy="50%" r="48%"
                        fill="none"
                        stroke="#9c0f85ff"
                        strokeWidth="8"
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
                    <div className="absolute inset-0 rounded-full bg-rose-50/50 animate-pulse pointer-events-none" style={{ transform: 'scale(1.15)' }} />
                    <div className="absolute inset-2 rounded-full bg-rose-100/30 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
                  </>
                )}

                <button
                  onClick={handleAttendanceAction}
                  disabled={loading}
                  className={`relative w-48 h-48 sm:w-52 sm:h-52 rounded-full flex flex-col items-center justify-center gap-3 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl focus:outline-none focus:ring-4 focus:ring-offset-4 ${activeSession
                    ? "bg-white border-4 border-emerald-500 focus:ring-emerald-200 text-emerald-600 shadow-emerald-500/20"
                    : "bg-gradient-to-tr from-[#800000] via-[#a00000] to-rose-500 focus:ring-rose-200 text-white shadow-rose-500/40"
                    }`}
                >
                  {loading ? (
                    <Loader2 className={`animate-spin w-10 h-10 ${activeSession ? "text-emerald-500" : "text-white"}`} />
                  ) : activeSession ? (
                    <>
                      <Clock className="w-10 h-10 text-emerald-500 mb-1" />
                      <span className="font-black tracking-widest text-lg">END SHIFT</span>
                    </>
                  ) : (
                    <>
                      <Hand className="w-10 h-10 text-white/90 drop-shadow-md mb-1 animate-bounce" style={{ animationDuration: '2s' }} />
                      <span className="font-black tracking-widest text-xl drop-shadow-md">CLOCK IN</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status Message */}
              <div className="flex items-center justify-center gap-2 text-sm font-bold mb-8 bg-slate-50 py-2 px-6 rounded-full w-full border border-slate-100">
                {activeSession ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-700">Location: You are in Office-reach</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <span className="text-slate-500">Location: Checking position...</span>
                  </>
                )}
              </div>

              {/* Bottom Details Row */}
              <div className="w-full grid grid-cols-3 gap-2 border-t border-slate-100 pt-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-inner">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Clock In</span>
                  <span className="text-xs font-bold text-slate-800">
                    {activeSession ? new Date(activeSession.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shadow-inner">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Clock Out</span>
                  <span className="text-xs font-bold text-slate-800">
                    --:--
                  </span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-inner">
                    <Timer className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Working Hrs</span>
                  <span className="text-xs font-bold text-slate-800 font-mono">
                    {workingHrs}
                  </span>
                </div>
              </div>

            </>
          ) : (
            <div className="py-20 space-y-4 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Fingerprint className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-xl text-slate-500 font-bold">Authentication Required</p>
              <p className="text-slate-400">Please log in to your account to record attendance.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
