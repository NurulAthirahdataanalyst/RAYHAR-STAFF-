import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, LogIn, LogOut, Loader2, AlertCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRole } from "@/contexts/RoleContext";

export default function PresenceFeed() {
  const { role, userBranch } = useRole();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchEmployees = async () => {
    try {
      const params = new URLSearchParams({
        role: role || "employee",
        branch: userBranch || "",
      });

      const response = await fetch(`https://rayhar-staff-production.up.railway.app/api/employees?${params}`);
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
    const interval = setInterval(fetchEmployees, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [role, userBranch]);

  const filtered = employees.filter((e) =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  // Sort by who checked in/out most recently?
  // We don't have exact timestamp in employees API unless we add it, but we can sort by status.
  const getStatusConfig = (status: string, clockIn: string | null) => {
    if (status === "On Leave") return { icon: AlertCircle, color: "text-purple-500", bg: "bg-purple-100", label: "On Leave" };
    if (status === "Present") {
      // Very basic late check: if clockIn is after 9 AM
      const isLate = clockIn && new Date(clockIn).getHours() >= 9;
      if (isLate) return { icon: Clock, color: "text-amber-500", bg: "bg-amber-100", label: "Late Entry" };
      return { icon: LogIn, color: "text-emerald-500", bg: "bg-emerald-100", label: "Checked In" };
    }
    if (status === "Clocked Out") return { icon: LogOut, color: "text-blue-500", bg: "bg-blue-100", label: "Checked Out" };
    return { icon: AlertCircle, color: "text-slate-400", bg: "bg-slate-100", label: "Absent" };
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "--:--";
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <Card className="bg-card/80 dark:bg-card/40 backdrop-blur-md rounded-[25px] shadow-xl border border-white/40 dark:border-white/10 flex flex-col h-full max-h-[500px]">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-sm font-black text-foreground">
          Presence Feed
          <span className="block text-xs text-muted-foreground font-medium mt-1">Live check-ins and check-outs</span>
        </CardTitle>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name or dept..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs border-border/60 bg-background/50 focus:ring-[#7B0099]/20 rounded-xl"
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
          <div className="divide-y divide-border/30 relative">
            {filtered.map((emp, idx) => {
              const statusConf = getStatusConfig(emp.today_status, emp.today_clock_in);
              const isAbsent = emp.today_status === "Absent" || emp.today_status === "On Leave";
              
              // If absent, we don't necessarily want them crowding the top of a "live feed", 
              // but for this overview it's good to see. We might want to filter or sort them.
              if (isAbsent && search === "") return null; // Hide absents unless searched to keep feed clean? Let's show them.

              return (
                <div key={emp.user_id} className="relative p-4 flex gap-4 hover:bg-muted/30 transition-colors">
                  {idx !== filtered.length - 1 && (
                    <div className="absolute left-8 top-10 bottom-[-16px] w-[2px] bg-border/40 z-0"></div>
                  )}
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${statusConf.bg} ${statusConf.color}`}>
                    <statusConf.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{emp.full_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {statusConf.label}{" "}
                      {emp.today_clock_in && emp.today_status !== "Absent" && emp.today_status !== "On Leave" && (
                        <span>at {formatTime(emp.today_clock_out || emp.today_clock_in)}</span>
                      )}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#7B0099] mt-1 truncate">
                      {emp.department || emp.branch}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
