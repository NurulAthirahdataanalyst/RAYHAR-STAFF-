import AppSidebar from "./AppSidebar";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
// Pastikan nama fail tepat: watercolor-bg.png
import watercolorBg from "@/assets/watercolor-bg.png";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { User, LogOut, ChevronRight, Settings } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { role: resolvedRole, userBranch, userDepartment } = useRole();
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    const dashboardUserId = user?.user_id || user?.id;
    if (!dashboardUserId) return;

    const fetchPendingApprovals = async () => {
      try {
        const params = new URLSearchParams({
          userId: dashboardUserId,
          role: resolvedRole,
          branch: userBranch || "",
          department: userDepartment || "",
        });

        const response = await fetch(
          `https://rayhar-staff-production.up.railway.app/api/dashboard-stats?${params}`
        );
        const data = await response.json();

        if (response.ok && data.success) {
          setPendingApprovals(
            Number(data.stats?.pendingApprovals ?? data.stats?.pendingLeaves ?? 0)
          );
        }
      } catch (error) {
        console.error("Quick Management sync error:", error);
      }
    };

    void fetchPendingApprovals();
    const interval = setInterval(fetchPendingApprovals, 10000);

    return () => clearInterval(interval);
  }, [resolvedRole, user?.id, user?.user_id, userBranch, userDepartment]);

  const today = new Date();
  const calendarYear = today.getFullYear();
  const calendarMonth = today.getMonth();
  const monthName = today.toLocaleString("en-US", { month: "long" });
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarDays = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300">
      <AppSidebar />
      
      <main 
        className="flex-1 overflow-x-hidden relative"
        style={{
          backgroundImage: `url(${watercolorBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-background/60 dark:bg-background/90 pointer-events-none" />
        <div className="relative p-6 lg:p-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="flex flex-col lg:grid lg:grid-cols-10 gap-8">
            
            {/* Ruang Kerja Utama (70%) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Breadcrumb & Header Pantas */}
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-[24px] p-4 flex items-center justify-between shadow-sm overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#601b8a]" />
                <div className="pl-4 space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/50">
                    <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate("/")}>Home</span>
                    <ChevronRight className="w-2.5 h-2.5" />
                    <span className="text-[#601b8a] dark:text-purple-400 capitalize">
                      {location.pathname === "/" ? "Dashboard" : location.pathname.includes("employees") ? "Staff" : location.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ")}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-foreground tracking-tight">
                    {location.pathname === "/" ? "Main Workspace" : location.pathname.includes("employees") ? "STAFF" : location.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ").toUpperCase()}
                  </h2>
                </div>
                
                  <DropdownMenu>
                    <DropdownMenuTrigger className="outline-none">
                      <div className="flex items-center gap-4 pr-2 group cursor-pointer">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-black text-foreground group-hover:text-[#601b8a] transition-colors">{user?.full_name || user?.name || "Employee"}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">
                            {resolvedRole.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-[#601b8a] text-white flex items-center justify-center font-black text-xs shadow-lg shadow-purple-900/20 group-hover:scale-105 transition-transform">
                          {(user?.full_name || user?.name || "E")[0].toUpperCase()}
                        </div>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl p-2 border-white/20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl">
                      <DropdownMenuLabel className="px-3 py-2">
                        <div className="flex flex-col space-y-0.5">
                          <p className="text-sm font-black">{user?.full_name || user?.name}</p>
                          <p className="text-[10px] text-muted-foreground font-bold truncate">{user?.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-border/40" />
                      <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-xl px-3 py-2.5 focus:bg-purple-500/10 focus:text-purple-600 dark:focus:text-purple-400 cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>My Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-xl px-3 py-2.5 focus:bg-purple-500/10 focus:text-purple-600 dark:focus:text-purple-400 cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Account Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/40" />
                      <DropdownMenuItem onClick={() => signOut()} className="rounded-xl px-3 py-2.5 focus:bg-red-500/10 focus:text-red-600 cursor-pointer text-red-500">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>

              {children}
            </div>

            {/* Panel Sisi (30%) */}
            <aside className="hidden lg:block lg:col-span-3 space-y-6">
              
              {/* Kad Pengurusan Pantas */}
              <div className="bg-[#601b8a] p-8 rounded-[25px] shadow-2xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                <h3 className="text-sm font-black text-white/90 dark:text-purple-100 uppercase tracking-widest mb-4">
                  Quick Management
                </h3>
                <div className="space-y-3">
                  <div
                    className="p-4 rounded-[18px] bg-white/10 dark:bg-black/20 border border-white/10 dark:border-white/5 flex items-center justify-between hover:bg-white/20 dark:hover:bg-black/30 transition-all cursor-pointer"
                    onClick={() => navigate("/leave/admin")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate("/leave/admin");
                      }
                    }}
                  >
                    <span className="text-sm font-bold text-white/90 dark:text-purple-50">Pending Approvals</span>
                    <span className="bg-[#00897B] text-white text-[10px] px-2.5 py-1 rounded-full font-black">
                      {pendingApprovals}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kad Cuti - Efek Kaca (Glassmorphism) sangat sesuai dengan PNG watercolor */}
              <div className="bg-card/80 dark:bg-card/40 backdrop-blur-md p-6 rounded-[25px] shadow-xl border border-white/40 dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Calendar
                  </h3>
                  <span className="text-xs font-black text-[#601b8a] dark:text-purple-400">
                    {monthName} {calendarYear}
                  </span>
                </div>
                <div className="mb-5 rounded-[20px] bg-white/45 dark:bg-black/20 p-3 border border-white/30 dark:border-white/5">
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekdays.map((day, index) => (
                      <span key={`${day}-${index}`} className="text-center text-[10px] font-black text-muted-foreground/60">
                        {day}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      const isToday = day === today.getDate();
                      const isHoliday = calendarMonth === 3 && day === 22;

                      return (
                        <div
                          key={index}
                          className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-bold ${
                            !day
                              ? "text-transparent"
                              : isToday
                                ? "bg-[#601b8a] text-white shadow-lg shadow-purple-900/20"
                                : isHoliday
                                  ? "bg-[#C2185B] text-white"
                                  : "text-foreground/80 hover:bg-white/60 dark:hover:bg-white/10"
                          }`}
                        >
                          {day || "."}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
                  Upcoming Holidays
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-white/40 dark:bg-white/5 rounded-[20px] border border-white/20 dark:border-white/5">
                    <div className="bg-[#C2185B] text-white p-2 rounded-xl font-bold text-center min-w-[50px] shadow-lg">
                      <span className="block text-[10px] uppercase opacity-80">Apr</span>
                      <span className="text-lg leading-none font-black">22</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Hari Raya Aidilfitri</p>
                      <p className="text-[10px] text-muted-foreground font-medium italic">Public Holiday</p>
                    </div>
                  </div>
                </div>
              </div>

            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
