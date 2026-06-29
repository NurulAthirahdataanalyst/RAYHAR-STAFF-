import AppSidebar from "./AppSidebar";
import PresenceFeed from "../PresenceFeed";
import NotificationBell from "../NotificationBell";
import PageHeader from "./PageHeader";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import rayharLogo from "@/assets/rayhar-logo.png";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { User, LogOut, ChevronRight, ChevronLeft, Settings, Menu, ClipboardCheck, Calendar, Sparkles, RefreshCw, Sun, Moon } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useTheme } from "@/contexts/ThemeContext";
import { API_BASE_URL } from "../../config/api";
import { useShiftNotifications } from "@/hooks/useShiftNotifications";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { role: resolvedRole, userBranch, userDepartment, userName } = useRole();
  const { theme, toggleTheme } = useTheme();
  useShiftNotifications();

  const displayName = userName || user?.full_name || user?.name || "Employee";
  const displayAvatar = (displayName || "E")[0].toUpperCase();

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
    window.dispatchEvent(new Event("presenceSidebarCollapsedChanged"));
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

  const getRouteLabel = (pathname: string) => {
    if (pathname === "/") return "DASHBOARD";
    if (pathname.startsWith("/leave")) return "LEAVE MANAGEMENT";
    if (pathname.includes("employees")) return "EMPLOYEE DIRECTORY";
    if (pathname.includes("settings")) return "CONFIGURATION";
    if (pathname.includes("reports")) return "REPORTS & ANALYTICS";
    if (pathname.includes("analytics")) return "REPORTS & ANALYTICS";
    if (pathname.includes("calendar")) return "WORK CALENDAR";
    if (pathname.includes("attendance")) return "ATTENDANCE";
    if (pathname.includes("branches")) return "BRANCHES";
    if (pathname.includes("profile")) return "PROFILE";
    if (pathname.includes("master")) return "ADMINISTRATION";
    const lastSegment = pathname.split("/").filter(Boolean).pop();
    return lastSegment ? lastSegment.replace(/-/g, " ").toUpperCase() : "PAGE";
  };

  const getBreadcrumb = () => {
    const pathname = location.pathname;

    if (pathname === "/") {
      return ["HOME", "DASHBOARD"];
    }

    if (pathname === "/leave") {
      return ["HOME", "LEAVE MANAGEMENT"];
    }

    if (pathname.startsWith("/leave/")) {
      const leavePageLabels: Record<string, string> = {
        "/leave/apply": "LEAVE APPLICATION",
        "/leave/forms": "MY LEAVE REQUESTS",
        "/leave/admin": "LEAVE APPROVAL",
      };

      return ["HOME", "LEAVE MANAGEMENT", leavePageLabels[pathname] || "PAGE"];
    }

    if (pathname.includes("employees")) {
      return ["HOME", "EMPLOYEE DIRECTORY"];
    }

    if (pathname.includes("settings")) {
      return ["HOME", "CONFIGURATION"];
    }

    if (pathname.includes("reports") || pathname.includes("analytics")) {
      return ["HOME", "REPORTS & ANALYTICS"];
    }

    if (pathname.includes("calendar")) {
      return ["HOME", "WORK CALENDAR"];
    }

    if (pathname.includes("attendance")) {
      return ["HOME", "ATTENDANCE"];
    }

    if (pathname.includes("branches")) {
      return ["HOME", "BRANCHES"];
    }

    if (pathname.includes("profile")) {
      return ["HOME", "PROFILE"];
    }

    if (pathname.includes("master")) {
      return ["HOME", "ADMINISTRATION"];
    }

    return ["HOME", getRouteLabel(pathname)];
  };

  const pageTitle = getRouteLabel(location.pathname);
  const breadcrumb = getBreadcrumb();

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300 max-w-full overflow-x-hidden">
      <AppSidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      
      <main className="flex-1 overflow-x-hidden relative min-w-0">

        
        {/* ═══════ DESKTOP TOP BAR ═══════ */}
        <header className="hidden lg:flex sticky top-0 z-30 w-full bg-gradient-to-r from-[#800A7A] via-[#7B0099] to-[#3d0052] py-2.5 px-3 items-center justify-between shadow-md relative overflow-hidden border-b border-[#7B0099]/15">
          <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10 w-full justify-end">
            <div className="flex items-center gap-4 relative z-10 ml-auto">
              <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-white font-semibold text-xs border border-white/20 bg-white/5">
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button 
                onClick={toggleTheme} 
                className="p-1.5 rounded-xl text-white hover:bg-white/10 transition-all duration-300 relative z-10 flex items-center justify-center border border-white/15 bg-white/5 hover:scale-105 active:scale-95"
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4 text-purple-250" />
                ) : (
                  <Sun className="w-4 h-4 text-yellow-300" />
                )}
              </button>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none relative z-10">
                    <div className="flex items-center gap-3 pr-1 group cursor-pointer">
                    <div className="text-right hidden sm:block space-y-0.5">
                      <p className="text-xs font-black text-white group-hover:text-purple-200 transition-colors">{displayName}</p>
                      <p className="text-[9px] font-black text-purple-200/60 uppercase tracking-widest opacity-80 leading-none">
                        {resolvedRole.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-white text-[#7B0099] flex items-center justify-center font-black text-xs shadow-lg shadow-purple-950/40 group-hover:scale-105 transition-transform border border-white/20">
                      {displayAvatar}
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-3 rounded-2xl p-2 border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl text-white">
                  <DropdownMenuLabel className="px-3 py-2 border-b border-white/5">
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-black text-white">{displayName}</p>
                      <p className="text-[10px] text-purple-300 font-bold truncate opacity-70">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-xl px-3 py-2.5 focus:bg-white/10 focus:text-white cursor-pointer transition-colors text-white/90">
                    <User className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-xl px-3 py-2.5 focus:bg-white/10 focus:text-white cursor-pointer transition-colors text-white/90">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem onClick={() => signOut()} className="rounded-xl px-3 py-2.5 focus:bg-red-500/20 focus:text-red-400 cursor-pointer text-red-400 font-bold transition-colors">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* ═══════ MOBILE TOP BAR ═══════ */}
        <div className="lg:hidden sticky top-0 z-30 p-1.5 safe-area-top">
          <div className="bg-gradient-to-r from-[#800A7A] via-[#7B0099] to-[#3d0052] rounded-[16px] p-1.5 px-2.5 flex items-center justify-between shadow-lg border border-[#7B0099]/15 top-nav-bar">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 active:bg-white/30 transition-colors touch-target"
                aria-label="Open navigation menu"
              >
                <Menu className="h-4.5 w-4.5" />
              </button>
              <div className="flex items-center gap-2">
                <img src={rayharLogo} className="h-6 w-auto object-contain filter brightness-110" alt="Rayhar" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => window.location.reload()} className="p-1.5 rounded-md hover:bg-white/10 transition-colors">
                <RefreshCw className="w-4 h-4 text-white/80" />
              </button>
              <button 
                onClick={toggleTheme} 
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-white/80 flex items-center justify-center"
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4 text-purple-250" />
                ) : (
                  <Sun className="w-4 h-4 text-yellow-300" />
                )}
              </button>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                <div className="h-8 w-8 rounded-lg bg-white text-[#7B0099] flex items-center justify-center font-black text-xs shadow-md hover:scale-105 active:scale-95 transition-transform border border-white/20">
                  {displayAvatar}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-3 rounded-2xl p-2 border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl text-white">
                <DropdownMenuLabel className="px-3 py-2 border-b border-white/5">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-black text-white">{displayName}</p>
                    <p className="text-[10px] text-purple-300 font-bold truncate opacity-70">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-xl px-3 py-2.5 focus:bg-white/10 focus:text-white cursor-pointer text-white/90">
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={() => signOut()} className="rounded-xl px-3 py-2.5 focus:bg-red-500/20 focus:text-red-400 cursor-pointer text-red-400 font-bold">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </div>

        {/* ═══════ MAIN CONTENT ═══════ */}
        <div className="relative p-4 sm:p-6 lg:p-8 max-w-[1500px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 items-start relative w-full">
            
            {/* Ruang Kerja Utama (70% - 90%) */}
            <div className="flex-1 min-w-0 space-y-2.5 sm:space-y-3 transition-all duration-500 ease-in-out w-full">
              <PageHeader />
              <div className="w-full">
                {children}
              </div>
            </div>

            {/* Panel Sisi (Collapsible Sidebar - 30% or slim) */}
            {resolvedRole !== "employee" && (
              <aside 
                className={`hidden lg:flex flex-col shrink-0 transition-all duration-500 ease-in-out py-1 sticky top-4 max-h-[calc(100vh-32px)] overflow-visible ${
                  sidebarCollapsed 
                    ? "w-[64px] relative border-l border-border/20 pl-2.5" 
                    : "w-[280px] absolute right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[-10px_0_30px_rgba(0,0,0,0.1)] dark:shadow-[-10px_0_30px_rgba(0,0,0,0.5)] p-4 rounded-2xl border border-border/50 xl:relative xl:right-0 xl:bg-transparent xl:dark:bg-transparent xl:shadow-none xl:p-0 xl:rounded-none xl:border-none xl:border-l xl:border-border/20 xl:pl-2.5"
                }`}
              >
              {/* Floating Toggle Button on Left Boundary */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`absolute z-50 flex h-7 w-7 items-center justify-center rounded-md bg-[#7B0099] text-white shadow-md hover:scale-110 active:scale-95 transition-transform border border-white/20 ${
                  sidebarCollapsed ? "-left-3.5 top-28" : "-left-3.5 top-28 xl:-left-3.5"
                }`}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronLeft className={`h-4 w-4 transition-transform duration-500 ${sidebarCollapsed ? "rotate-180" : ""}`} />
              </button>

              {/* Scrollable Panel content */}
              <div className="flex-1 w-full overflow-y-auto scrollbar-none flex flex-col gap-4 py-2 px-3">
                {!sidebarCollapsed ? (
                  <>
                    {/* ═══════ PENDING APPROVALS ═══════ */}
                    {["hr_admin", "branch_leader", "managing_director", "finance_manager", "head_of_department"].includes(resolvedRole) && (
                      <div className="shrink-0 bg-[#7B0099] p-3.5 rounded-[20px] shadow-lg text-white relative overflow-hidden group w-full transition-all duration-500">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-md -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                        
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-xs font-black text-white/95 uppercase tracking-widest">
                              Pending Approvals
                            </h3>
                            <p className="text-[10px] text-purple-200/80 font-bold mt-0.5">
                              Requires your review
                            </p>
                          </div>
                          
                          <div className="h-8 min-w-[32px] px-2.5 rounded-md bg-white/20 text-white flex items-center justify-center font-black text-xs border border-white/10 shrink-0 shadow-sm">
                            {pendingApprovals}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => navigate("/leave/admin")}
                          className="w-full mt-3 py-2 px-3.5 bg-purple-50 dark:bg-purple-950/40 text-[#7B0099] dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-xl font-black text-[11px] transition-all shadow-md active:scale-98 tracking-wider uppercase"
                        >
                          View Requests
                        </button>
                      </div>
                    )}

                    {/* ═══════ SECONDARY CARD: PRESENCE FEED ═══════ */}
                    {["hr_admin", "managing_director"].includes(resolvedRole) && (
                      <PresenceFeed isCollapsed={false} />
                    )}
                  </>
                ) : (
                  /* Unified Collapsed Dock */
                  <div className="bg-white/30 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-[20px] p-2 flex flex-col items-center gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.06)] w-full py-3.5">
                    {["hr_admin", "branch_leader", "managing_director", "finance_manager", "head_of_department"].includes(resolvedRole) && (
                      <div 
                        onClick={() => navigate("/leave/admin")}
                        className="cursor-pointer group relative flex flex-col items-center justify-center w-9 h-9 rounded-xl bg-[#7B0099] hover:bg-[#7B0099]/90 text-white shadow-sm transition-all shrink-0"
                      >
                        <ClipboardCheck className="w-5 h-5" />
                        {pendingApprovals > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-md bg-red-500 px-1 text-[9px] font-black text-white border border-white dark:border-slate-900 shadow-sm">
                            {pendingApprovals}
                          </span>
                        )}
                        
                        <div className="absolute right-full mr-3 px-3 py-2 bg-slate-900 dark:bg-slate-950 text-white text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 transform -translate-x-2 group-hover:translate-x-0 border border-slate-800 flex flex-col gap-0.5 animate-in fade-in slide-in-from-right-2">
                          <p className="font-bold text-slate-100">Pending Approvals</p>
                          <p className="opacity-80">{pendingApprovals} requests require review</p>
                        </div>
                      </div>
                    )}

                    {["hr_admin", "managing_director"].includes(resolvedRole) && (
                      <PresenceFeed isCollapsed={true} />
                    )}
                  </div>
                )}
              </div>

            </aside>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
