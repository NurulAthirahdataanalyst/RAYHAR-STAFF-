import { Link, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { 
  LayoutDashboard, 
  Clock, 
  CalendarDays, 
  ClipboardList,
  FilePlus2,
  FileSearch,
  FileCheck,
  FileText,
  CheckSquare,
  Users, 
  Building2, 
  BarChart3, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Moon,
  Sun,
  PieChart,
  Settings,
  Calendar,
  Menu,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import rayharLogo from "@/assets/rayhar-logo.png";

interface AppSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const AppSidebar = ({ mobileOpen, onMobileClose }: AppSidebarProps) => {
  const { role } = useRole();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("appSidebarCollapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("appSidebarCollapsed", String(isCollapsed));
  }, [isCollapsed]);
  const effectiveCollapsed = isCollapsed;
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  // Close mobile drawer on route change
  useEffect(() => {
    onMobileClose();
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && mobileOpen) {
      onMobileClose();
    }
  }, [mobileOpen, onMobileClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Roles that can see admin-level menus
  const ADMIN_ROLES = ["branch_leader", "hr_admin", "managing_director", "finance_manager", "head_of_department"];
  const ALL_ROLES = ["employee", "branch_officer", ...ADMIN_ROLES];
  const HOD_BL_ROLES = ["branch_leader", "head_of_department"];
  const FULL_ADMIN_ROLES = ["hr_admin", "managing_director", "finance_manager"];

  // ── HOD / BRANCH LEADER sidebar ──────────────────────────────────────────
  const hodMenuItems = [
    { title: "Main Navigation", isSection: true, roles: HOD_BL_ROLES },
    { title: "Dashboard", icon: LayoutDashboard, path: "/", roles: HOD_BL_ROLES },
    { title: "Calendar", icon: Calendar, path: "/calendar", roles: HOD_BL_ROLES },
    {
      title: "Attendance",
      icon: Clock,
      path: "/attendance",
      roles: HOD_BL_ROLES,
      children: [
        { title: "Attendance Overview", icon: Clock, path: "/attendance", roles: HOD_BL_ROLES },
        { title: "Team Attendance", icon: Users, path: "/team-attendance", roles: HOD_BL_ROLES },
        { title: "Company Leave Calendar", icon: CalendarDays, path: "/attendance/company-leave", roles: HOD_BL_ROLES },
      ],
    },
    {
      title: "Leave Management",
      icon: CalendarDays,
      path: "/leave",
      roles: HOD_BL_ROLES,
      children: [
        { title: "Leave Application", icon: FilePlus2, path: "/leave/apply", roles: HOD_BL_ROLES },
        { title: "My Leave Requests", icon: FileSearch, path: "/leave/forms", roles: HOD_BL_ROLES },
        { title: "Team Leave Requests", icon: FileCheck, path: "/leave/team", roles: HOD_BL_ROLES },
        { title: "Leave Approval", icon: ClipboardList, path: "/leave/admin", roles: HOD_BL_ROLES },
      ],
    },
    {
      title: "Analytics",
      icon: BarChart3,
      path: "/hr-analytics/attendance",
      roles: HOD_BL_ROLES,
      children: [
        { title: "Attendance Analytics", icon: BarChart3, path: "/hr-analytics/attendance", roles: HOD_BL_ROLES },
        { title: "Leave Analytics", icon: BarChart3, path: "/hr-analytics/leave", roles: HOD_BL_ROLES },
        { title: "Workforce Insights", icon: PieChart, path: "/hr-analytics/workforce", roles: HOD_BL_ROLES },
      ],
    },
    {
      title: "Reports",
      icon: FileSearch,
      path: "/reports",
      roles: HOD_BL_ROLES,
      children: [
        { title: "Attendance Reports", icon: Clock, path: "/reports/attendance", roles: HOD_BL_ROLES },
        { title: "Leave Reports", icon: CalendarDays, path: "/reports/leave", roles: HOD_BL_ROLES },
        { title: "Department Reports", icon: Building2, path: "/reports/department", roles: HOD_BL_ROLES },
      ],
    },
    { title: "Administration", isSection: true, roles: HOD_BL_ROLES },
    { title: "Employee Directory", icon: Users, path: "/employees", roles: HOD_BL_ROLES },
  ];

  // ── Standard sidebar (employee, branch_officer, hr_admin, MD, finance) ───
  const menuItems = [
    { title: "Main Navigation", isSection: true, roles: ALL_ROLES },
    { title: "Dashboard", icon: LayoutDashboard, path: "/", roles: ALL_ROLES },
    { title: "Calendar", icon: Calendar, path: "/calendar", roles: ALL_ROLES },
    {
      title: "Attendance",
      icon: Clock,
      path: "/attendance",
      roles: ALL_ROLES,
      children: [
        { title: "My Attendance", icon: Clock, path: "/attendance", roles: ALL_ROLES },
        { title: "Timesheet", icon: ClipboardList, path: "/attendance/timesheet", roles: ALL_ROLES },
        { title: "Company Leave Calendar", icon: CalendarDays, path: "/attendance/company-leave", roles: ALL_ROLES },
      ],
    },
    {
      title: "Leave Management",
      icon: CalendarDays,
      path: "/leave",
      roles: ALL_ROLES,
      children: [
        { title: "Leave Application", icon: CalendarDays, path: "/leave/apply", roles: ALL_ROLES },
        { title: "My Leave Requests", icon: FileText, path: "/leave/forms", roles: ALL_ROLES },
        { title: "Team Leave Requests", icon: Users, path: "/leave/team", roles: ["manager", "hod", "branch_leader"] },
        { title: "Leave Approval", icon: CheckSquare, path: "/leave/approval", roles: ["manager", "hod", "branch_leader"] },
      ],
    },
    { title: "Analytics", icon: BarChart3, path: "/analytics", roles: ALL_ROLES },

    { title: "HR Administration", isSection: true, roles: FULL_ADMIN_ROLES },
    {
      title: "Leave Administration",
      icon: ClipboardList,
      path: "/leave/admin",
      roles: FULL_ADMIN_ROLES,
    },
    {
      title: "Employee Management",
      icon: Users,
      path: "/master",
      roles: FULL_ADMIN_ROLES,
      children: [
        { title: "Employee Directory", icon: Users, path: "/employees", roles: FULL_ADMIN_ROLES },
        { title: "Department", icon: Building2, path: "/master/department", roles: ["hr_admin"] },
        { title: "Role", icon: Settings, path: "/master/role", roles: ["hr_admin"] },
      ],
    },
    { title: "Branch Management", icon: Building2, path: "/branches", roles: FULL_ADMIN_ROLES },
    {
      title: "Workforce Analytics",
      icon: PieChart,
      path: "/hr-analytics",
      roles: FULL_ADMIN_ROLES,
      children: [
        { title: "Attendance Dashboard", icon: BarChart3, path: "/hr-analytics/attendance", roles: FULL_ADMIN_ROLES },
        { title: "Leave Analytics", icon: BarChart3, path: "/hr-analytics/leave", roles: FULL_ADMIN_ROLES },
        { title: "Workforce Insights", icon: PieChart, path: "/hr-analytics/workforce", roles: FULL_ADMIN_ROLES },
      ]
    },
    {
      title: "Reports",
      icon: FileSearch,
      path: "/reports",
      roles: ALL_ROLES,
      children: [
        { title: "Attendance Reports", icon: FileSearch, path: "/reports/attendance", roles: FULL_ADMIN_ROLES },
        { title: "Leave Reports", icon: FileSearch, path: "/reports/leave", roles: FULL_ADMIN_ROLES },
        { title: "Department Reports", icon: Building2, path: "/reports/department", roles: FULL_ADMIN_ROLES },
      ]
    },
    { title: "Settings", icon: Settings, path: "/settings", roles: ["hr_admin"] },
  ];

  // Pick the right menu based on role
  const activeMenu = HOD_BL_ROLES.includes(role || "") ? hodMenuItems : menuItems;


  const filteredItems = activeMenu.filter((item) =>
    item.roles.includes(role || "employee")
  );

  // Automatically expand submenus if any child page is active
  useEffect(() => {
    let activeParentTitle = "";
    filteredItems.forEach(item => {
      if (item.children) {
        const isParentActive = item.path && (location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));
        const hasActiveChild = item.children.some(child => child.path && location.pathname === child.path);
        if (hasActiveChild || isParentActive) {
          activeParentTitle = item.title;
        }
      }
    });
    if (activeParentTitle) {
      setExpandedMenus({ [activeParentTitle]: true });
    }
  }, [location.pathname]);

  const sidebarContent = (isMobile: boolean) => (
    <>
      <div className={`relative shrink-0 flex items-center justify-center border-b border-purple-950/20 dark:border-b-white/5 overflow-hidden transition-all ${
        effectiveCollapsed && !isMobile ? "h-20" : "h-20 px-3"
      }`}>
        {/* Mobile or Expanded Desktop view: show logo (and toggle on right for desktop) */}
        {(!effectiveCollapsed || isMobile) ? (
          <div className="flex items-center justify-between w-full h-full gap-2">
            <Link to="/" className="flex items-center justify-start h-full animate-in fade-in duration-300" onClick={isMobile ? onMobileClose : undefined}>
              <img 
                src={rayharLogo} 
                alt="Rayhar Group" 
                className="h-[80%] max-h-[50px] w-auto object-contain" 
              />
            </Link>
            
            {/* Desktop Menu toggle button on the right */}
            {!isMobile && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex h-10 w-10 items-center justify-center text-white/85 hover:text-white hover:scale-110 active:scale-95 transition-all duration-300 shrink-0"
                aria-label={isCollapsed ? "Pin sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </button>
            )}
          </div>
        ) : (
          /* Collapsed Desktop view: show only centered expand toggle button */
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex h-10 w-10 items-center justify-center text-white/85 hover:text-white hover:scale-110 active:scale-95 transition-all duration-300"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* MENU */}
      <div className={`flex-1 scrollbar-none pt-6 pb-4 border-r border-sidebar-border ${effectiveCollapsed && !isMobile ? "overflow-visible" : "overflow-y-auto"}`}>
        <nav className={`space-y-1 mt-2 ${effectiveCollapsed && !isMobile ? "px-2" : "px-0 sm:px-0"}`}>
          {filteredItems.map((item, index) => {
            if (item.isSection) {
              if (effectiveCollapsed && !isMobile) return <div key={item.title} className="h-4"></div>;
              return (
                <div key={item.title} className={`px-5 mb-1.5 ${index > 0 ? "mt-6" : ""}`}>
                  <span className="text-[10px] font-black uppercase tracking-wider text-sidebar-foreground/60">
                    {item.title}
                  </span>
                </div>
              );
            }

            const isActive =
              item.path === "/"
                ? location.pathname === item.path
                : item.path && (location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));
            const visibleChildren = item.children?.filter((child) =>
              child.roles.includes(role || "employee")
            );
            const hasChildren = !!visibleChildren?.length;
            const isMenuExpanded = expandedMenus[item.title];
            const ItemIcon = item.icon;

            return (
              <div key={item.title} className="relative group/menu-item space-y-1">
                <Link
                  to={item.path || "#"}
                  onClick={(e) => {
                    if (isMobile && !hasChildren) {
                      onMobileClose();
                    }
                    if (hasChildren && !effectiveCollapsed) {
                      setExpandedMenus(prev => prev[item.title] ? {} : { [item.title]: true });
                    }
                  }}
                  className={`group relative flex items-center gap-2.5 transition-all duration-300 touch-target ${
                    effectiveCollapsed && !isMobile 
                      ? "justify-center px-0 w-11 h-11 mx-auto rounded-xl" 
                      : "px-3.5 py-2 rounded-r-2xl mr-4"
                  } ${
                    isActive
                      ? "bg-[#7B0099]/10 text-white font-semibold border-l-[3px] border-[#7B0099]"
                      : "text-sidebar-foreground/70 hover:bg-white/[0.02] hover:text-white border-l-[3px] border-transparent"
                  }`}
                >
                  {ItemIcon && (
                    <ItemIcon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive 
                          ? "text-[#cda4ff]" 
                          : "text-sidebar-foreground/60 group-hover:text-white"
                      }`}
                    />
                  )}
                  {(!effectiveCollapsed || isMobile) && (
                    <span className={`text-[11px] tracking-wide whitespace-nowrap truncate animate-in fade-in slide-in-from-left-2 duration-300 ${
                      isActive 
                        ? "text-white font-semibold" 
                        : "text-sidebar-foreground/80 group-hover:text-white font-semibold"
                    }`}>
                      {item.title}
                    </span>
                  )}

                  {/* Collapse/Expand chevron indicator */}
                  {hasChildren && (!effectiveCollapsed || isMobile) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpandedMenus(prev => prev[item.title] ? {} : { [item.title]: true });
                      }}
                      className="ml-auto p-0.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-[#7B0099] dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all"
                      aria-label={isMenuExpanded ? "Collapse submenu" : "Expand submenu"}
                    >
                      {isMenuExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                </Link>

                {/* Submenu for Expanded State (Desktop or Mobile) */}
                {hasChildren && isMenuExpanded && (!effectiveCollapsed || isMobile) && (
                  <div className="relative pl-[2.25rem] pr-6 py-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="absolute left-[1.1rem] top-0 bottom-4 w-px bg-sidebar-border"></div>
                    {visibleChildren.map((child) => {
                      const isChildActive = location.pathname === child.path;
                      return (
                        <Link
                          key={child.title}
                          to={child.path}
                          onClick={isMobile ? onMobileClose : undefined}
                          className={`group relative flex items-center gap-3 rounded-[14px] px-4 py-2 text-[11px] transition-all duration-300 touch-target ${
                            isChildActive
                              ? "bg-white/5 font-semibold text-white"
                              : "text-sidebar-foreground/60 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className={`absolute -left-[1.1rem] top-1/2 w-[1.1rem] border-t transition-colors ${isChildActive ? 'border-white/20' : 'border-sidebar-border group-hover:border-white/10'}`}></div>
                          <span className="whitespace-nowrap truncate">{child.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Submenu Popover Card for Collapsed State */}
                {hasChildren && effectiveCollapsed && !isMobile && (
                  <div className="absolute left-full top-0 ml-3 z-50 hidden group-hover/menu-item:block min-w-[200px] bg-sidebar border border-sidebar-border rounded-[18px] p-2 shadow-[0_8px_30px_rgba(123,0,153,0.08)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
                    {/* Category Header */}
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60 border-b border-white/5 mb-2">
                      {item.title}
                    </div>
                    {/* Submenu Items */}
                    <div className="space-y-1">
                      {visibleChildren.map((child) => {
                        const isChildActive = location.pathname === child.path;
                        return (
                          <Link
                            key={child.title}
                            to={child.path}
                            className={`flex items-center gap-3 rounded-[14px] px-3 py-2 text-[11px] transition-all duration-200 ${
                              isChildActive
                                ? "bg-white/10 font-semibold text-white"
                                : "text-white/70 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <span className="whitespace-nowrap truncate">{child.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tooltip Popover Card for Collapsed State (No Children) */}
                {!hasChildren && effectiveCollapsed && !isMobile && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 hidden group-hover/menu-item:block bg-sidebar border border-sidebar-border rounded-[12px] px-3.5 py-2 shadow-[0_8px_25px_rgba(123,0,153,0.08)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
                    <span className="text-[11px] font-bold text-white whitespace-nowrap">
                      {item.title}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* FOOTER */}
      <div className="shrink-0 border-t border-sidebar-border border-r border-sidebar-border p-2.5 space-y-2 safe-area-bottom">
        <Button
          variant="ghost"
          onClick={toggleTheme}
          title={effectiveCollapsed && !isMobile ? `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode` : ""}
          className={`group flex w-full justify-start gap-2.5 rounded-[16px] px-2.5 sm:px-2.5 py-2.5 text-sidebar-foreground/85 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground touch-target ${
            effectiveCollapsed && !isMobile ? "justify-center px-0 w-11 h-11 mx-auto" : ""
          }`}
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4 shrink-0" />
          ) : (
            <Sun className="h-4 w-4 shrink-0" />
          )}
          {(!effectiveCollapsed || isMobile) && (
            <span className="text-xs font-bold whitespace-nowrap animate-in fade-in duration-300">
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          onClick={() => signOut()}
          title={effectiveCollapsed && !isMobile ? "Sign Out" : ""}
          className={`group flex w-full justify-start gap-3 rounded-[16px] px-3 sm:px-3 py-3 text-sidebar-foreground/85 transition-all hover:bg-red-500/10 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 touch-target ${
            effectiveCollapsed && !isMobile ? "justify-center px-0 w-11 h-11 mx-auto" : ""
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-1" />
          {(!effectiveCollapsed || isMobile) && <span className="text-xs font-bold whitespace-nowrap animate-in fade-in duration-300">Sign Out</span>}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* ═══════ DESKTOP SIDEBAR spacer ═══════ */}
      <div className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-16" : "w-[210px]"
      }`} />

      {/* ═══════ DESKTOP SIDEBAR (fixed on desktop) ═══════ */}
      <aside 
        className={`hidden lg:flex fixed top-0 left-0 z-40 h-screen flex-col bg-sidebar transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.15)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.4)] border-r border-sidebar-border/60 ${
          effectiveCollapsed ? "w-16" : "w-[210px]"
        }`}
      >
        {sidebarContent(false)}
      </aside>

      {/* ═══════ MOBILE DRAWER OVERLAY ═══════ */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm drawer-overlay-in"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* ═══════ MOBILE DRAWER PANEL ═══════ */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-[280px] sm:w-[320px] flex flex-col bg-sidebar border-r border-sidebar-border shadow-2xl transition-transform duration-300 ease-out safe-area-top ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {sidebarContent(true)}
      </aside>
    </>
  );
};

export default AppSidebar;
