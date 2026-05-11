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
  Menu,
  Moon,
  Sun
} from "lucide-react";
import { useState } from "react";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import rayharLogo from "@/assets/rayhar-logo.png";

const AppSidebar = () => {
  const { role } = useRole();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Roles that can see admin-level menus
  const ADMIN_ROLES = ["branch_leader", "hr_admin", "managing_director", "finance_manager", "head_of_department"];
  const ALL_ROLES = ["employee", "branch_officer", ...ADMIN_ROLES];
  // Roles that can approve leave
  const APPROVER_ROLES = ["managing_director", "finance_manager", "head_of_department"];

  const menuItems = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/", roles: ALL_ROLES },
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
    { title: "Branches", icon: Building2, path: "/branches", roles: ["hr_admin", "managing_director", "finance_manager"] },
    { title: "Reports", icon: BarChart3, path: "/reports", roles: ADMIN_ROLES },
  ];

  const filteredItems = menuItems.filter((item) =>
    item.roles.includes(role || "employee")
  );

  return (
    <aside className={`sticky top-0 z-50 flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out ${
      isCollapsed ? "w-20" : "w-72"
    }`}>
      
      {/* HEADER */}
      <div className={`relative flex items-center justify-center bg-gradient-to-r from-[#601b8a] to-[#7a1fa2] overflow-hidden transition-all ${
        isCollapsed ? "h-20" : "h-24 px-4"
      }`}>
        {!isCollapsed && (
          <Link to="/" className="flex items-center justify-center w-full h-full animate-in fade-in duration-300">
            <img 
              src={rayharLogo} 
              alt="Rayhar Group" 
              className="h-[80%] w-auto object-contain" 
            />
          </Link>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute -right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-purple-50 hover:text-[#601b8a] z-50`}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* MENU */}
      <div className="flex-1 overflow-y-auto pt-6">
        <nav className="space-y-2 px-4">
          {filteredItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === item.path
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            const visibleChildren = item.children?.filter((child) =>
              child.roles.includes(role || "branch_leader")
            );

            return (
              <div key={item.title} className="space-y-1">
                <Link
                  to={item.path}
                  title={isCollapsed ? item.title : ""}
                  className={`group relative flex items-center gap-4 rounded-[16px] px-5 py-3.5 transition-all duration-300 ${
                    isActive
                      ? "bg-[#601b8a] text-white shadow-md"
                      : "text-muted-foreground hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-[#601b8a] dark:hover:text-purple-400"
                  } ${isCollapsed ? "justify-center px-0 w-12 mx-auto" : ""}`}
                >
                  <item.icon
                    className={`h-5 w-5 shrink-0 transition-colors ${
                      isActive ? "text-[#fdf001]" : "text-muted-foreground/60 group-hover:text-[#601b8a] dark:group-hover:text-purple-400"
                    }`}
                  />
                  {!isCollapsed && (
                    <span className={`text-[14px] whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300 ${isActive ? "font-bold" : "font-semibold"}`}>
                      {item.title}
                    </span>
                  )}

                  {isActive && !isCollapsed && (
                    <div className="absolute right-4 h-1.5 w-1.5 rounded-full bg-[#fdf001]" />
                  )}
                </Link>

                {!isCollapsed && visibleChildren?.map((child) => {
                  const isChildActive = location.pathname === child.path;

                  return (
                    <Link
                      key={child.title}
                      to={child.path}
                      className={`group ml-7 flex items-center gap-3 rounded-[14px] px-4 py-2.5 text-[13px] transition-all duration-300 ${
                        isChildActive
                          ? "bg-purple-50 dark:bg-purple-900/20 font-bold text-[#601b8a] dark:text-purple-400"
                          : "text-muted-foreground/60 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-[#601b8a] dark:hover:text-purple-400"
                      }`}
                    >
                      <child.icon
                        className={`h-4 w-4 ${
                          isChildActive ? "text-[#601b8a] dark:text-purple-400" : "text-muted-foreground/40 group-hover:text-[#601b8a] dark:group-hover:text-purple-400"
                        }`}
                      />
                      <span>{child.title}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* FOOTER */}
      <div className="shrink-0 border-t border-slate-50 dark:border-slate-800 p-6 space-y-2">
        <Button
          variant="ghost"
          onClick={toggleTheme}
          title={isCollapsed ? `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode` : ""}
          className={`group flex w-full justify-start gap-4 rounded-[16px] px-5 py-6 text-slate-400 transition-all hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-[#601b8a] dark:hover:text-purple-400 ${
            isCollapsed ? "justify-center px-0 w-12 mx-auto" : ""
          }`}
        >
          {theme === "light" ? (
            <Moon className="h-5 w-5 shrink-0" />
          ) : (
            <Sun className="h-5 w-5 shrink-0" />
          )}
          {!isCollapsed && (
            <span className="text-sm font-bold whitespace-nowrap animate-in fade-in duration-300">
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          onClick={() => signOut()}
          title={isCollapsed ? "Log Out" : ""}
          className={`group flex w-full justify-start gap-4 rounded-[16px] px-5 py-6 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 ${
            isCollapsed ? "justify-center px-0 w-12 mx-auto" : ""
          }`}
        >
          <LogOut className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-x-1" />
          {!isCollapsed && <span className="text-sm font-bold whitespace-nowrap animate-in fade-in duration-300">Log Out System</span>}
        </Button>
      </div>
    </aside>
  );
};

export default AppSidebar;
