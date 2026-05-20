import AppSidebar from "./AppSidebar";
import PresenceFeed from "../PresenceFeed";
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
import { User, LogOut, ChevronRight, ChevronLeft, Settings, Menu, ClipboardCheck, Calendar, Sparkles } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { API_BASE_URL } from "../../config/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { role: resolvedRole, userBranch, userDepartment } = useRole();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("presenceSidebarCollapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("presenceSidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

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
          `${API_BASE_URL}/api/dashboard-stats?${params}`
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

  const getPageTitle = () => {
    if (location.pathname === "/") return "Dashboard";
    if (location.pathname.includes("employees")) return "Staff";
    return location.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ").toUpperCase() || "Page";
  };

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300">
      <AppSidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      
      <main 
        className="flex-1 overflow-x-hidden relative min-w-0"
        style={{
          backgroundImage: `url(${watercolorBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-background/60 dark:bg-background/90 pointer-events-none" />
        
        {/* ═══════ MOBILE TOP BAR ═══════ */}
        <div className="lg:hidden sticky top-0 z-30 bg-card/80 dark:bg-card/90 backdrop-blur-xl border-b border-border/50 safe-area-top">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7B0099]/10 dark:bg-[#7B0099]/20 text-[#7B0099] dark:text-purple-400 hover:bg-[#7B0099]/20 active:bg-[#7B0099]/30 transition-colors touch-target"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-sm font-black text-foreground tracking-tight leading-tight">{getPageTitle()}</h2>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Rayhar Portal</p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <div className="h-9 w-9 rounded-xl bg-[#7B0099] text-white flex items-center justify-center font-black text-xs shadow-lg shadow-purple-900/20 hover:scale-105 active:scale-95 transition-transform">
                  {(user?.full_name || user?.name || "E")[0].toUpperCase()}
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
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem onClick={() => signOut()} className="rounded-xl px-3 py-2.5 focus:bg-red-500/10 focus:text-red-600 cursor-pointer text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ═══════ MAIN CONTENT ═══════ */}
        <div className="relative p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start relative w-full">
            
            {/* Ruang Kerja Utama (70% - 90%) */}
            <div className="flex-1 min-w-0 space-y-4 sm:space-y-6 transition-all duration-500 ease-in-out w-full">
              {/* Breadcrumb & Header Pantas - hidden on mobile (we have the top-bar instead) */}
              <div className="hidden lg:flex bg-card/50 backdrop-blur-sm border border-border rounded-[24px] p-4 items-center justify-between shadow-sm overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#7B0099]" />
                <div className="pl-4 space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/50">
                    <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate("/")}>Home</span>
                    <ChevronRight className="w-2.5 h-2.5" />
                    <span className="text-[#7B0099] dark:text-purple-400 capitalize">
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
                          <p className="text-sm font-black text-foreground group-hover:text-[#7B0099] transition-colors">{user?.full_name || user?.name || "Employee"}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">
                            {resolvedRole.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-[#7B0099] text-white flex items-center justify-center font-black text-xs shadow-lg shadow-purple-900/20 group-hover:scale-105 transition-transform">
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

            {/* Panel Sisi (Collapsible Sidebar - 30% or slim) */}
            <aside 
              className={`hidden lg:flex flex-col shrink-0 transition-all duration-500 ease-in-out relative border-l border-border/20 pl-4 py-1 gap-6 items-center lg:items-stretch ${
                sidebarCollapsed ? "w-[72px]" : "w-[360px]"
              }`}
            >
              {/* Floating Toggle Button on Left Boundary */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="absolute -left-3.5 top-28 z-40 flex h-7 w-7 items-center justify-center rounded-full bg-[#7B0099] text-white shadow-md hover:scale-110 active:scale-95 transition-transform border border-white/20"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronLeft className={`h-4 w-4 transition-transform duration-500 ${sidebarCollapsed ? "rotate-180" : ""}`} />
              </button>

              {/* ═══════ PENDING APPROVALS ═══════ */}
              {!sidebarCollapsed ? (
                <div className="bg-[#7B0099] p-6 rounded-[25px] shadow-lg text-white relative overflow-hidden group w-full transition-all duration-500">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                  
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xs font-black text-white/95 uppercase tracking-widest">
                        Pending Approvals
                      </h3>
                      <p className="text-[10px] text-purple-200/80 font-bold mt-0.5">
                        Requires your review
                      </p>
                    </div>
                    
                    <div className="h-8 min-w-[32px] px-2.5 rounded-full bg-white/20 text-white flex items-center justify-center font-black text-xs border border-white/10 shrink-0 shadow-sm">
                      {pendingApprovals}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigate("/leave/admin")}
                    className="w-full mt-3 py-2.5 px-4 bg-purple-50 dark:bg-purple-950/40 text-[#7B0099] dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-xl font-black text-[11px] transition-all shadow-md active:scale-98 tracking-wider uppercase"
                  >
                    View Requests
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => navigate("/leave/admin")}
                  className="cursor-pointer group relative flex flex-col items-center justify-center w-12 h-12 rounded-[18px] bg-[#7B0099] hover:bg-[#7B0099]/90 text-white shadow-md transition-all shrink-0"
                >
                  <ClipboardCheck className="w-5 h-5" />
                  {pendingApprovals > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white border border-white dark:border-slate-900 shadow-sm">
                      {pendingApprovals}
                    </span>
                  )}
                  
                  {/* Custom CSS Tooltip */}
                  <div className="absolute left-full ml-3 px-3 py-2 bg-slate-900 dark:bg-slate-950 text-white text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 transform translate-x-2 group-hover:translate-x-0 border border-slate-800 flex flex-col gap-0.5">
                    <p className="font-bold">Pending Approvals</p>
                    <p className="opacity-80">{pendingApprovals} requests require review</p>
                  </div>
                </div>
              )}

              {/* ═══════ SECONDARY CARD: PRESENCE FEED OR CALENDAR ═══════ */}
              {["hr_admin", "managing_director"].includes(resolvedRole) ? (
                <PresenceFeed isCollapsed={sidebarCollapsed} />
              ) : (
                !sidebarCollapsed ? (
                  <div className="bg-card/85 dark:bg-card/40 backdrop-blur-md p-6 rounded-[25px] shadow-xl border border-white/40 dark:border-white/10 w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Calendar
                      </h3>
                      <span className="text-xs font-black text-[#7B0099] dark:text-purple-400">
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
                                    ? "bg-[#7B0099] text-white shadow-lg shadow-purple-900/20"
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
                ) : (
                  <div className="flex flex-col items-center gap-4 py-2 w-full">
                    {/* Compact Calendar Summary Icon */}
                    <div className="relative group flex items-center justify-center w-12 h-12 rounded-[18px] bg-card border border-border/40 text-foreground shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer">
                      <Calendar className="w-5 h-5 text-[#7B0099]" />
                      
                      <div className="absolute left-full ml-3 px-3 py-2 bg-slate-900 dark:bg-slate-950 text-white text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 transform translate-x-2 group-hover:translate-x-0 border border-slate-800 flex flex-col gap-0.5">
                        <p className="font-bold">Calendar Summary</p>
                        <p className="opacity-80">{monthName} {calendarYear}</p>
                      </div>
                    </div>
                    
                    {/* Compact Holiday Summary Icon */}
                    <div className="relative group flex items-center justify-center w-12 h-12 rounded-[18px] bg-card border border-border/40 text-foreground shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer">
                      <Sparkles className="w-5 h-5 text-pink-500 animate-pulse" />
                      
                      <div className="absolute left-full ml-3 px-3 py-2 bg-slate-900 dark:bg-slate-950 text-white text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 transform translate-x-2 group-hover:translate-x-0 border border-slate-800 flex flex-col gap-0.5">
                        <p className="font-bold">Upcoming Holiday</p>
                        <p className="opacity-80">Apr 22: Hari Raya Aidilfitri</p>
                      </div>
                    </div>
                  </div>
                )
              )}

            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
