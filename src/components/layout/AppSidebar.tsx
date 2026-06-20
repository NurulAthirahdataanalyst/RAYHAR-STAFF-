import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Clock, 
  CalendarDays, 
  ClipboardList,
  FilePlus2,
  FileSearch,
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
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    "Leave Management": true,
    "Master": true
  });

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
  // Roles that can approve leave
  const APPROVER_ROLES = ["managing_director", "finance_manager", "head_of_department"];

  const menuItems = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/", roles: ALL_ROLES },
    { title: "Calendar", icon: Calendar, path: "/calendar", roles: ALL_ROLES },
    { title: "Attendance", icon: Clock, path: "/attendance", roles: ALL_ROLES },
    {
      title: "Leave Management",
      icon: CalendarDays,
      path: "/leave",
      roles: ALL_ROLES,
      children: [
        { title: "Apply for Leave", icon: FilePlus2, path: "/leave/apply", roles: ALL_ROLES },
        { title: "Leave Form Application", icon: FileSearch, path: "/leave/forms", roles: ALL_ROLES },
        { title: "Leave Approval", icon: ClipboardList, path: "/leave/admin", roles: [...ADMIN_ROLES] },

      ],
    },
    { title: "Staff", icon: Users, path: "/employees", roles: ADMIN_ROLES },
    {
      title: "Master",
      icon: Users,
      path: "/master",
      roles: ["hr_admin"],
      children: [
        { title: "Department", icon: Building2, path: "/master/department", roles: ["hr_admin"] },
        { title: "User", icon: Users, path: "/employees", roles: ["hr_admin"] },
      ],
    },
    { title: "Branches", icon: Building2, path: "/branches", roles: ["hr_admin", "managing_director", "finance_manager"] },
    { title: "Analytical", icon: BarChart3, path: "/reports", roles: ["hr_admin"] },
    // All other roles (employees, managers, HOD, etc.) get the Employee Performance Insights page
    { title: "Analytical", icon: BarChart3, path: "/analytics", roles: ALL_ROLES.filter(r => r !== "hr_admin") },
    { title: "Configuration", icon: Settings, path: "/settings", roles: ["hr_admin"] },
  ];


  const filteredItems = menuItems.filter((item) =>
    item.roles.includes(role || "employee")
  );

  // Automatically expand submenus if any child page is active
  useEffect(() => {
    filteredItems.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => location.pathname === child.path);
        if (hasActiveChild) {
          setExpandedMenus(prev => {
            if (prev[item.title]) return prev;
            return { ...prev, [item.title]: true };
          });
        }
      }
    });
  }, [location.pathname, filteredItems]);

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* HEADER */}
      <div className={`relative flex items-center justify-center bg-transparent border-b border-blue-100/50 overflow-hidden transition-all ${
        isCollapsed && !isMobile ? "h-20" : "h-24 px-4"
      }`}>
        {/* Mobile or Expanded Desktop view: show logo (and toggle on right for desktop) */}
        {(!isCollapsed || isMobile) ? (
          <div className="flex items-center justify-between w-full h-full gap-2">
            <Link to="/" className="flex items-center justify-start h-full max-w-[70%] animate-in fade-in duration-300" onClick={isMobile ? onMobileClose : undefined}>
              <img 
                src={rayharLogo} 
                alt="Rayhar Group" 
                className="h-[75%] w-auto object-contain filter brightness-110" 
              />
            </Link>
            
            {/* Desktop Menu toggle button on the right */}
            {!isMobile && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="flex h-10 w-10 items-center justify-center text-slate-600 hover:text-[#7B0099] hover:bg-slate-200/50 rounded-xl transition-all duration-300 shrink-0"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            )}
          </div>
        ) : (
          /* Collapsed Desktop view: show only centered Menu button */
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex h-10 w-10 items-center justify-center text-slate-600 hover:text-[#7B0099] hover:bg-slate-200/50 rounded-xl transition-all duration-300"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200/50 text-slate-700 hover:bg-slate-200 hover:text-[#7B0099] transition-all"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* MENU */}
      <div className={`flex-1 scrollbar-none pt-6 pb-2 ${isCollapsed && !isMobile ? "overflow-visible" : "overflow-y-auto"}`}>
        {(!isCollapsed || isMobile) && (
          <div className="px-7 mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/80">
              Menu Navigation
            </span>
          </div>
        )}
        <nav className="space-y-1.5 px-3 sm:px-4">
          {filteredItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === item.path
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            const isExactActive = location.pathname === item.path;
            const visibleChildren = item.children?.filter((child) =>
              child.roles.includes(role || "employee")
            );
            const hasChildren = visibleChildren && visibleChildren.length > 0;
            const isMenuExpanded = expandedMenus[item.title];

            return (
              <div key={item.title} className="relative group/menu-item space-y-1">
                <Link
                  to={item.path}
                  onClick={(e) => {
                    if (isMobile) {
                      onMobileClose();
                    }
                    if (hasChildren && !isCollapsed) {
                      // Automatically open the menu when navigating to it
                      setExpandedMenus(prev => ({ ...prev, [item.title]: true }));
                    }
                  }}
                  className={`group relative flex items-center gap-4 rounded-[14px] px-4 sm:px-5 py-3 transition-all duration-300 touch-target ${
                    isExactActive
                      ? "bg-[#7B0099] text-white shadow-sm font-bold"
                      : "text-slate-600 hover:bg-slate-200/60 hover:text-[#7B0099] active:bg-slate-200/80"
                  } ${isCollapsed && !isMobile ? "justify-center px-0 w-12 mx-auto" : ""}`}
                >
                  <item.icon
                    className={`h-5 w-5 shrink-0 transition-colors ${
                      isExactActive 
                        ? "text-white" 
                        : isActive 
                          ? "text-[#7B0099]" 
                          : "text-slate-400 group-hover:text-[#7B0099]"
                    }`}
                  />
                  {(!isCollapsed || isMobile) && (
                    <span className={`text-[13.5px] whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300 ${isExactActive ? "font-bold text-white" : isActive ? "text-[#7B0099] font-bold" : "text-slate-600 group-hover:text-[#7B0099] font-medium"}`}>
                      {item.title}
                    </span>
                  )}

                  {/* Collapse/Expand chevron indicator */}
                  {hasChildren && (!isCollapsed || isMobile) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpandedMenus(prev => ({ ...prev, [item.title]: !prev[item.title] }));
                      }}
                      className="ml-auto p-1 rounded-md text-slate-400 hover:text-[#7B0099] hover:bg-slate-200/50 transition-all"
                      aria-label={isMenuExpanded ? "Collapse submenu" : "Expand submenu"}
                    >
                      {isMenuExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                </Link>

                {/* Submenu for Expanded State (Desktop or Mobile) */}
                {hasChildren && isMenuExpanded && (!isCollapsed || isMobile) && (
                  <div className="relative pl-9 pr-2 py-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Vertical tree line */}
                    <div className="absolute left-[26px] top-0 bottom-[18px] w-[1.5px] bg-slate-300/80" />
                    
                    {visibleChildren.map((child) => {
                       const isChildActive = location.pathname === child.path;
                       return (
                        <Link
                          key={child.title}
                          to={child.path}
                          onClick={isMobile ? onMobileClose : undefined}
                          className={`group relative flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-[13px] transition-all duration-300 touch-target ${
                            isChildActive
                              ? "bg-purple-600/15 font-bold text-[#7B0099]"
                              : "text-slate-600 hover:bg-slate-200/50 hover:text-[#7B0099] active:bg-slate-200/80"
                          }`}
                        >
                          {/* Horizontal stub connector line */}
                          <div className="absolute -left-[10px] top-1/2 -translate-y-1/2 w-[10px] h-[1.5px] bg-slate-300/80" />
                          
                          <child.icon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              isChildActive ? "text-[#7B0099]" : "text-slate-400 group-hover:text-[#7B0099]"
                            }`}
                          />
                          <span>{child.title}</span>
                        </Link>
                       );
                    })}
                  </div>
                )}

                {/* Submenu Popover Card for Collapsed State */}
                {hasChildren && isCollapsed && !isMobile && (
                  <div className="absolute left-full top-0 ml-3 z-50 hidden group-hover/menu-item:block min-w-[200px] bg-[#EBF2FC] border border-blue-100/80 rounded-[18px] p-2.5 shadow-[0_8px_30px_rgba(123,0,153,0.08)] animate-in fade-in zoom-in-95 duration-200">
                    {/* Category Header */}
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#7B0099]/85 border-b border-blue-100/50 mb-2">
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
                            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs transition-all duration-200 ${
                              isChildActive
                                ? "bg-purple-600/15 font-bold text-[#7B0099]"
                                : "text-slate-600 hover:bg-slate-200/50 hover:text-[#7B0099]"
                            }`}
                          >
                            <child.icon
                              className={`h-4 w-4 shrink-0 transition-colors ${
                                isChildActive ? "text-[#7B0099]" : "text-slate-400"
                              }`}
                            />
                            <span className="whitespace-nowrap">{child.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tooltip Popover Card for Collapsed State (No Children) */}
                {!hasChildren && isCollapsed && !isMobile && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 hidden group-hover/menu-item:block bg-[#EBF2FC] border border-blue-100 rounded-[12px] px-3.5 py-2 shadow-[0_8px_25px_rgba(123,0,153,0.08)] animate-in fade-in zoom-in-95 duration-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 whitespace-nowrap">
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
      <div className="shrink-0 border-t border-blue-100/50 p-4 sm:p-6 space-y-2 safe-area-bottom">
        <Button
          variant="ghost"
          onClick={toggleTheme}
          title={isCollapsed && !isMobile ? `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode` : ""}
          className={`group flex w-full justify-start gap-4 rounded-[16px] px-4 sm:px-5 py-6 text-slate-600 transition-all hover:bg-slate-200/50 hover:text-[#7B0099] touch-target ${
            isCollapsed && !isMobile ? "justify-center px-0 w-12 mx-auto" : ""
          }`}
        >
          {theme === "light" ? (
            <Moon className="h-5 w-5 shrink-0" />
          ) : (
            <Sun className="h-5 w-5 shrink-0" />
          )}
          {(!isCollapsed || isMobile) && (
            <span className="text-sm font-bold whitespace-nowrap animate-in fade-in duration-300">
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          onClick={() => signOut()}
          title={isCollapsed && !isMobile ? "Log Out" : ""}
          className={`group flex w-full justify-start gap-4 rounded-[16px] px-4 sm:px-5 py-6 text-slate-600 transition-all hover:bg-red-500/10 hover:text-red-600 touch-target ${
            isCollapsed && !isMobile ? "justify-center px-0 w-12 mx-auto" : ""
          }`}
        >
          <LogOut className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-x-1" />
          {(!isCollapsed || isMobile) && <span className="text-sm font-bold whitespace-nowrap animate-in fade-in duration-300">Log Out System</span>}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* ═══════ DESKTOP SIDEBAR (hidden on mobile) ═══════ */}
      <aside className={`hidden lg:flex sticky top-0 z-40 min-h-screen flex-col border-r border-blue-100/80 bg-[#EBF2FC] transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}>
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
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-[280px] sm:w-[320px] flex flex-col bg-[#EBF2FC] shadow-2xl transition-transform duration-300 ease-out safe-area-top ${
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
