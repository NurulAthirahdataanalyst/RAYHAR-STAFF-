import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, LogIn, LogOut, Loader2, AlertCircle, Clock, Timer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRole } from "@/contexts/RoleContext";
import { API_BASE_URL } from "@/config/api";

const parseLocalDate = (value: string | null) => {
  if (!value) return null;
  let dateStr = value;
  dateStr = dateStr.replace(" ", "T").replace(/Z$/, "").replace(/\+00:?00$/, "");
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

interface PresenceFeedProps {
  isCollapsed?: boolean;
}

export default function PresenceFeed({ isCollapsed = false }: PresenceFeedProps) {
  const { role, userBranch } = useRole();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchEmployees = async () => {
    try {
      const params = new URLSearchParams({
        role: role || "employee",
        branch: userBranch || "",
      });

      const response = await fetch(`${API_BASE_URL}/api/employees?${params}`);
      const data = await response.json();

      if (data.success) {
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error("Error fetching presence feed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();

    // Establish real-time EventSource connection
    const streamUrl = `${API_BASE_URL}/api/presence/stream`;
    console.log("🔌 Connecting to Presence Stream:", streamUrl);
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📡 Live presence update received:", data);
        fetchEmployees();
      } catch (err) {
        console.error("Error parsing stream message:", err);
        fetchEmployees(); // Fallback refresh
      }
    };

    eventSource.onerror = (err) => {
      console.error("Presence stream connection error:", err);
    };

    const interval = setInterval(fetchEmployees, 30000); // refresh fallback every 30s

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [role, userBranch]);

  const filtered = employees.filter((e) =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusConfig = (status: string, clockIn: string | null) => {
    if (status === "On Leave") {
      return { 
        icon: AlertCircle, 
        color: "text-purple-500", 
        bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/20", 
        dot: "bg-purple-500",
        label: "On Leave" 
      };
    }
    if (status === "Present") {
      // Late check: if clockIn is after 9 AM
      const clockInDate = parseLocalDate(clockIn);
      const isLate = clockInDate && clockInDate.getHours() >= 9;
      if (isLate) {
        return { 
          icon: Clock, 
          color: "text-red-500", 
          bg: "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/20", 
          dot: "bg-red-500",
          label: "Late Entry" 
        };
      }
      return { 
        icon: LogIn, 
        color: "text-emerald-500", 
        bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/20", 
        dot: "bg-emerald-500",
        label: "Checked In" 
      };
    }
    if (status === "Clocked Out") {
      return { 
        icon: LogOut, 
        color: "text-emerald-500", // Green for Clock Out as requested
        bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/20", 
        dot: "bg-emerald-500",
        label: "Clock Out" 
      };
    }
    
    // Check if overtime (just as a mock/extra condition if present but high hours)
    if (status === "Overtime Started") {
      return {
        icon: Timer,
        color: "text-purple-500",
        bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/20",
        dot: "bg-purple-500",
        label: "Overtime Started"
      };
    }

    return { 
      icon: AlertCircle, 
      color: "text-slate-400", 
      bg: "bg-slate-50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800/20", 
      dot: "bg-slate-400",
      label: "Absent" 
    };
  };

  const getDeptShortCode = (dept: string, branch: string) => {
    if (!dept) return branch ? branch.toUpperCase() : "STAFF";
    const d = dept.toLowerCase();
    if (d.includes("haji") || d.includes("umrah")) return "HAJI/UMRAH (BHU)";
    if (d.includes("operation")) return "OPERATIONS";
    if (d.includes("finance")) return "FINANCE";
    if (d.includes("marketing")) return "MARKETING";
    if (d.includes("designation") || d.includes("dgn")) return "DGN";
    if (dept.length > 12) return dept.substring(0, 12).toUpperCase();
    return dept.toUpperCase();
  };

  const formatTime = (timeStr: string | null) => {
    const date = parseLocalDate(timeStr);
    if (!date) return "--:--";
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-4 w-full">
        <div className="relative mb-4 flex items-center justify-center">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </div>
        
        <div className="flex-1 w-full flex flex-col items-center gap-4 max-h-[450px] overflow-y-auto scrollbar-none px-2">
          {loading && employees.length === 0 ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#7B0099]" />
          ) : filtered.length === 0 ? (
            <span className="text-[10px] text-muted-foreground">Empty</span>
          ) : (
            filtered.map((emp) => {
              const statusConf = getStatusConfig(emp.today_status, emp.today_clock_in);
              const isAbsent = emp.today_status === "Absent" || emp.today_status === "On Leave";
              
              if (isAbsent && search === "") return null;

              const initials = emp.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "EE";
              const activityTime = formatTime(emp.today_clock_out || emp.today_clock_in);

              return (
                <div key={emp.user_id} className="relative group flex items-center justify-center">
                  <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 cursor-pointer shadow-sm hover:scale-105 active:scale-95 transition-all ${statusConf.bg} ${statusConf.color}`}>
                    <statusConf.icon className="w-4 h-4" />
                  </div>
                  
                  {/* Custom CSS Tooltip */}
                  <div className="absolute left-full ml-3 px-3 py-2 bg-slate-900 dark:bg-slate-950 text-white text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 transform translate-x-2 group-hover:translate-x-0 border border-slate-800 flex flex-col gap-0.5">
                    <p className="font-bold">{emp.full_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`}></span>
                      <span className="opacity-90">{statusConf.label}</span>
                      {emp.today_status !== "Absent" && emp.today_status !== "On Leave" && (
                        <span className="opacity-70">at {activityTime}</span>
                      )}
                    </div>
                    <span className="text-[9px] font-black text-purple-400 mt-1 uppercase tracking-wider">
                      {getDeptShortCode(emp.department, emp.branch)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-card/40 backdrop-blur-md rounded-[25px] shadow-lg border border-white/20 dark:border-white/5 flex flex-col h-full max-h-[500px]">
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="text-sm font-black text-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            Presence Feed
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </span>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Live Activity</span>
        </CardTitle>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
          <Input
            placeholder="Filter activity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs border-border/60 bg-background/30 focus-visible:ring-[#7B0099]/20 rounded-xl"
          />
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-none relative">
        {loading && employees.length === 0 ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#7B0099]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-8 text-xs text-muted-foreground font-medium">
            No activity found.
          </div>
        ) : (
          <div className="divide-y divide-border/20 relative">
            {filtered.map((emp, idx) => {
              const statusConf = getStatusConfig(emp.today_status, emp.today_clock_in);
              const isAbsent = emp.today_status === "Absent" || emp.today_status === "On Leave";
              
              if (isAbsent && search === "") return null;

              const activityTime = formatTime(emp.today_clock_out || emp.today_clock_in);

              return (
                <div key={emp.user_id} className="relative p-4 flex gap-4 hover:bg-muted/10 transition-colors">
                  {idx !== filtered.length - 1 && (
                    <div className="absolute left-8 top-10 bottom-[-16px] w-[1px] bg-border/20 z-0"></div>
                  )}
                  <div className={`relative z-10 w-8 h-8 rounded-full border flex items-center justify-center shrink-0 shadow-sm ${statusConf.bg} ${statusConf.color}`}>
                    <statusConf.icon className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-foreground truncate">{emp.full_name}</p>
                      {emp.today_status !== "Absent" && emp.today_status !== "On Leave" && (
                        <span className="text-[10px] font-bold text-muted-foreground/60 shrink-0">{activityTime}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`}></span>
                      <span className="text-xs font-bold text-muted-foreground/80">{statusConf.label}</span>
                    </div>

                    <div className="mt-2.5 flex items-center">
                      <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-purple-50 dark:bg-purple-950/40 text-[#7B0099] border border-purple-100 dark:border-purple-900/40 shrink-0">
                        {getDeptShortCode(emp.department, emp.branch)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <div className="p-3 border-t border-border/20 text-center bg-background/10">
        <button className="text-[10px] font-black text-[#7B0099] hover:text-[#7B0099]/85 uppercase tracking-widest transition-colors hover:underline">
          Load Full History
        </button>
      </div>
    </Card>
  );
}

