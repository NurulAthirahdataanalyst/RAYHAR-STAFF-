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
  X,
  Moon,
  Sun,
  PieChart,
  Settings,
  Calendar
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    "Leave Management": true,
    "Master": false,
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
    { title: "Settings", icon: Settings, path: "/settings", roles: ["hr_admin"] },
  ];

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Automatically expand menus containing the active route on mount/route change
  useEffect(() => {
    const initialOpen: Record<string, boolean> = {};
    menuItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) => location.pathname === child.path || location.pathname.startsWith(`${child.path}/`)
        );
        if (hasActiveChild) {
          initialOpen[item.title] = true;
        }
      }
    });
    setOpenMenus((prev) => ({ ...initialOpen, ...prev }));
  }, [location.pathname]);

  const filteredItems = menuItems.filter((item) =>
    item.roles.includes(role || "employee")
  );

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* HEADER */}
      <div className={`relative flex items-center justify-center bg-[#7B0099] overflow-hidden transition-all ${
        isCollapsed && !isMobile ? "h-20" : "h-24 px-4"
      }`}>
        {(!isCollapsed || isMobile) && (
          <Link to="/" className="flex items-center justify-center w-full h-full animate-in fade-in duration-300" onClick={isMobile ? onMobileClose : undefined}>
            <img 
              src={rayharLogo} 
              alt="Rayhar Group" 
              className="h-[80%] w-auto object-contain filter brightness-110" 
            />
          </Link>
        )}
        
        {/* Desktop collapse button */}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-[#1A1C1E] text-slate-400 shadow-sm transition-all hover:bg-purple-900/20 hover:text-white z-50"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
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
            const visibleChildren = item.children?.filter((child) =>
              child.roles.includes(role || "employee")
            );

            const hasChildren = !!visibleChildren && visibleChildren.length > 0;
            const isMenuOpen = !!openMenus[item.title];

            const handleParentClick = (e: React.MouseEvent) => {
              if (hasChildren) {
                toggleMenu(item.title);
              }
              if (isMobile) {
                onMobileClose();
              }
            };

            return (
              <div key={item.title} className="space-y-1">
                <Link
                  to={item.path}
                  title={isCollapsed && !isMobile ? item.title : ""}
                  onClick={handleParentClick}
                  className={`group relative flex items-center gap-4 rounded-[14px] px-4 sm:px-5 py-3 transition-all duration-300 touch-target ${
                    isActive
                      ? "bg-purple-600/10 text-white"
                      : "text-white/90 hover:bg-white/5 hover:text-white active:bg-white/10"
                  } ${isCollapsed && !isMobile ? "justify-center px-0 w-12 mx-auto" : ""}`}
                >
                  <item.icon
                    className={`h-5 w-5 shrink-0 transition-colors ${
                      isActive ? "text-purple-400" : "text-slate-500 group-hover:text-white"
                    }`}
                  />
                  {(!isCollapsed || isMobile) && (
                    <span className={`text-[13.5px] whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300 ${isActive ? "font-bold" : "font-medium"}`}>
                      {item.title}
                    </span>
                  )}

                  {hasChildren && (!isCollapsed || isMobile) && (
                    <ChevronDown
                      className={`h-4 w-4 ml-auto text-slate-400 transition-transform duration-300 ${
                        isMenuOpen ? "rotate-180 text-white" : "group-hover:text-white"
                      }`}
                    />
                  )}

                  {isActive && (!isCollapsed || isMobile) && (
                    <div className="absolute left-0 w-1 h-6 bg-[#7B0099] rounded-r-full" />
                  )}

                  {/* Floating popover for collapsed state */}
                  {isCollapsed && !isMobile && hasChildren && (
                    <div className="absolute left-full top-0 ml-2 opacity-0 translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto transition-all duration-300 z-50 bg-[#1E1E24] border border-white/10 rounded-[14px] p-1.5 w-52 shadow-2xl flex flex-col gap-0.5">
                      {visibleChildren.map((child) => {
                        const isChildActive = location.pathname === child.path;
                        return (
                          <Link
                            key={child.title}
                            to={child.path}
                            className={`group relative flex items-center justify-between rounded-[10px] px-3.5 py-2.5 text-[12.5px] transition-all duration-300 ${
                              isChildActive
                                ? "bg-purple-600/15 font-bold text-white"
                                : "text-white/80 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <child.icon className={`h-4 w-4 shrink-0 transition-colors ${isChildActive ? "text-purple-400" : "text-slate-500 group-hover:text-white"}`} />
                              <span className="transition-colors group-hover:text-white">{child.title}</span>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-white transition-colors" />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </Link>

                {(!isCollapsed || isMobile) && isMenuOpen && visibleChildren && (
                  <div className="relative ml-8 pl-1 space-y-1 my-1">
                    {visibleChildren.map((child, index) => {
                      const isChildActive = location.pathname === child.path;

                      return (
                        <Link
                          key={child.title}
                          to={child.path}
                          onClick={isMobile ? onMobileClose : undefined}
                          className={`group relative flex items-center gap-3 rounded-[14px] px-3 sm:px-4 py-2.5 text-[13px] transition-all duration-300 touch-target ${
                            isChildActive
                              ? "bg-purple-600/10 font-bold text-white"
                              : "text-white/80 hover:bg-white/5 hover:text-white active:bg-white/10"
                          }`}
                        >
                          {/* Connector Branch Lines */}
                          <span className="absolute left-[-14px] top-0 w-3 h-[50%] border-l border-b border-white/15 rounded-bl-[5px]" />
                          {index < visibleChildren.length - 1 && (
                            <span className="absolute left-[-14px] top-[50%] bottom-0 w-[1px] bg-white/15" />
                          )}

                          <child.icon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              isChildActive ? "text-purple-400" : "text-slate-500 group-hover:text-white"
                            }`}
                          />
                          <span>{child.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* FOOTER */}
      <div className="shrink-0 border-t border-white/5 p-4 sm:p-6 space-y-2 safe-area-bottom">
        <Button
          variant="ghost"
          onClick={toggleTheme}
          title={isCollapsed && !isMobile ? `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode` : ""}
          className={`group flex w-full justify-start gap-4 rounded-[16px] px-4 sm:px-5 py-6 text-white/90 transition-all hover:bg-white/5 hover:text-white touch-target ${
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
          className={`group flex w-full justify-start gap-4 rounded-[16px] px-4 sm:px-5 py-6 text-white/90 transition-all hover:bg-red-500/10 hover:text-red-500 touch-target ${
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
      <aside className={`hidden lg:flex sticky top-0 z-40 min-h-screen flex-col border-r border-border bg-[#1A1C1E] transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-72"
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
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-[280px] sm:w-[320px] flex flex-col bg-[#1A1C1E] shadow-2xl transition-transform duration-300 ease-out safe-area-top ${
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
