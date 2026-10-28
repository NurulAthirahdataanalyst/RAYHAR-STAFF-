import { Link, useLocation, useNavigate } from "react-router-dom";
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
  Users, Briefcase, 
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
  PanelLeftOpen,
  Plane,
  MapPinned,
  Database,
  History,
  ShieldCheck,
  ArrowRightLeft,
  Layers,
  MapPin,
  Boxes
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useCompany } from "@/modules/multi-company/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import rayharLogo from "@/assets/rayhar-logo.png";
import { DynamicSidebarLogo } from "@/modules/multi-company/components/DynamicSidebarLogo";

interface AppSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const AppSidebar = ({ mobileOpen, onMobileClose }: AppSidebarProps) => {
  const { role, hasPermission } = useRole();
  const { isModuleEnabled, isPermissionEnabled } = useCompany();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
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

  const adminSectionTitle = 
    role === "branch_leader" ? "BRANCH ADMINISTRATION" :
    role === "head_of_department" ? "HOD ADMINISTRATION" :
    (role === "managing_director" || role === "operation_manager") ? "MANAGEMENT & ADMINISTRATION" :
    "HR ADMINISTRATION";

  // Comprehensive RBAC-driven menu definition
  const allMenuItems: any[] = useMemo(() => {
    const norm = (role || "employee").toLowerCase().trim();
    const isHRAdmin = norm === "hr_admin" || norm === "admin" || norm === "hr";
    const isBL = norm === "branch_leader";
    const isHOD = norm === "head_of_department" || norm === "hod";
    const isMD_OM = norm === "managing_director" || norm === "operation_manager" || norm === "finance_manager" || norm === "md";
    const isEmployee = norm === "employee" || norm === "branch_officer";

    // 1. EMPLOYEE ROLE
    if (isEmployee) {
      return [
        { title: "Main Navigation", isSection: true },
        { title: "Dashboard", icon: LayoutDashboard, path: "/" },
        {
          title: "Calendar",
          icon: Calendar,
          path: "/calendar",
          children: [
            { title: "Work Calendar", icon: Calendar, path: "/calendar" },
            { title: "Company Leave Calendar", icon: CalendarDays, path: "/calendar/company-leave" },
          ],
        },
        {
          title: "Attendance",
          icon: Clock,
          path: "/attendance",
          children: [
            { title: "My Attendance", icon: Clock, path: "/attendance" },
          ],
        },
        {
          id: "main_outstation",
          title: "Outstation Management",
          icon: Plane,
          path: "/outstation/my",
          children: [
            { title: "My Outstation", icon: Plane, path: "/outstation/my" },
            { title: "My Outstation Calendar", icon: Calendar, path: "/outstation/my-calendar" },
          ],
        },
        {
          title: "Leave Management",
          icon: CalendarDays,
          path: "/leave",
          children: [
            { title: "Leave Application", icon: FilePlus2, path: "/leave/apply" },
            { title: "My Leave Requests", icon: FileText, path: "/leave/forms" },
          ],
        },
        { title: "Analytics", icon: BarChart3, path: "/analytics" },
        { title: "Reports", icon: FileSearch, path: "/reports" },
        { title: "GPS Location Tracker", icon: MapPinned, path: "/gps-location-tracker/history" },
      ];
    }

    // 2. HR ADMIN ROLE
    if (isHRAdmin) {
      return [
        { title: "Main Navigation", isSection: true },
        { title: "Dashboard", icon: LayoutDashboard, path: "/" },
        {
          title: "Calendar",
          icon: Calendar,
          path: "/calendar",
          children: [
            { title: "Work Calendar", icon: Calendar, path: "/calendar", permission: "calendar.work" },
            { title: "Company Leave Calendar", icon: CalendarDays, path: "/calendar/company-leave", permission: "calendar.company_leave" },
          ],
        },
        {
          title: "Attendance",
          icon: Clock,
          path: "/attendance",
          children: [
            { title: "My Attendance", icon: Clock, path: "/attendance" },
          ],
        },
        {
          id: "main_outstation",
          title: "Outstation Management",
          icon: Plane,
          path: "/outstation/my",
          children: [
            { title: "My Outstation", icon: Plane, path: "/outstation/my" },
            { title: "My Outstation Calendar", icon: Calendar, path: "/outstation/my-calendar" },
          ],
        },
        {
          title: "Leave Management",
          icon: CalendarDays,
          path: "/leave",
          children: [
            { title: "Leave Application", icon: FilePlus2, path: "/leave/apply" },
            { title: "My Leave Requests", icon: FileText, path: "/leave/forms" },
          ],
        },
        { title: "Analytics", icon: BarChart3, path: "/analytics" },

        { title: "HR ADMINISTRATION", isSection: true },
        {
          title: "Leave Administration",
          icon: ClipboardList,
          path: "/leave/admin",
          children: [
            { title: "Leave Approval", icon: ClipboardList, path: "/leave/admin" },
            { title: "Company Leave Calendar", icon: CalendarDays, path: "/calendar/company-leave" },
            { title: "Leave Entitlement Management", icon: CalendarDays, path: "/leave/entitlement" },
            { title: "Leave Calendar", icon: Calendar, path: "/leave/calendar" },
          ],
        },
        {
          id: "admin_outstation",
          title: "Outstation Management",
          icon: Plane,
          path: "/outstation",
          children: [
            { title: "Outstation Dashboard", icon: Plane, path: "/outstation" },
            { title: "Outstation Assignment", icon: Plane, path: "/outstation/assignment" },
            { title: "Outstation Analytics", icon: BarChart3, path: "/outstation/analytics" },
            { title: "Outstation Calendar", icon: Calendar, path: "/outstation/calendar" },
          ],
        },
        {
          title: "Organization & Entities",
          icon: Building2,
          path: "/organization/entities",
          children: [
            { title: "Company Entities", icon: Building2, path: "/organization/entities", permission: "organization.entities" },
            { title: "Personnel Entity", icon: Users, path: "/organization/personnel", permission: "organization.entities" },
            { title: "Company Modules", icon: Boxes, path: "/organization/modules", permission: "organization.modules" },
            { title: "Company Roles & RBAC", icon: ShieldCheck, path: "/organization/roles", permission: "organization.roles" },
            { title: "Employee Transfer Wizard", icon: ArrowRightLeft, path: "/organization/transfer", permission: "organization.transfer" },
            { title: "Transfer Career History", icon: History, path: "/organization/history", permission: "organization.history" },
            { title: "Branches & Geofence", icon: MapPin, path: "/organization/branches", permission: "organization.branches" },
            { title: "Departments", icon: Layers, path: "/organization/departments", permission: "organization.departments" },
          ],
        },
        {
          title: "Employee Management",
          icon: Users,
          path: "/master",
          children: [
            { title: "Employee Directory", icon: Users, path: "/employees" },
            { title: "Department", icon: Building2, path: "/master/department" },
            { title: "Role", icon: Settings, path: "/master/role" },
          ],
        },
        {
          title: "Branch Management",
          icon: Building2,
          path: "/branches",
          children: [
            { title: "Overview", icon: Building2, path: "/branches" },
            { title: "Temporary Assignment", icon: Briefcase, path: "/branches/temporary-assignments" },
          ],
        },
        {
          title: "Workforce Analytics",
          icon: PieChart,
          path: "/hr-analytics/attendance",
          children: [
            { title: "Attendance Dashboard", icon: BarChart3, path: "/hr-analytics/attendance" },
            { title: "Leave Analytics", icon: BarChart3, path: "/hr-analytics/leave" },
            { title: "Workforce Insights", icon: PieChart, path: "/hr-analytics/workforce" },
            { title: "Workforce Calendar", icon: Calendar, path: "/hr-analytics/calendar" },
          ],
        },
        {
          title: "Reports",
          icon: FileSearch,
          path: "/reports",
          children: [
            { title: "Attendance Reports", icon: FileSearch, path: "/reports/attendance" },
            { title: "Leave Reports", icon: FileSearch, path: "/reports/leave" },
            { title: "Outstation Reports", icon: FileSearch, path: "/outstation/reports" },
            { title: "Department & Branch Report", icon: Building2, path: "/reports/department" },
          ],
        },
        {
          title: "GPS Location Tracker",
          icon: MapPinned,
          path: "/gps-location-tracker",
          children: [
            { title: "Live Tracker", icon: MapPinned, path: "/gps-location-tracker" },
          ],
        },
        { title: "Settings", icon: Settings, path: "/settings" },
      ];
    }

    // 3. BRANCH LEADER & 4. HEAD OF DEPARTMENT
    if (isBL || isHOD) {
      const sectionTitle = isBL ? "BRANCH ADMINISTRATION" : "HOD ADMINISTRATION";
      return [
        { title: "Main Navigation", isSection: true },
        { title: "Dashboard", icon: LayoutDashboard, path: "/" },
        {
          title: "Calendar",
          icon: Calendar,
          path: "/calendar",
          children: [
            { title: "Work Calendar", icon: Calendar, path: "/calendar" },
            { title: "Company Leave Calendar", icon: CalendarDays, path: "/calendar/company-leave" },
          ],
        },
        {
          title: "Attendance",
          icon: Clock,
          path: "/attendance",
          children: [
            { title: "My Attendance", icon: Clock, path: "/attendance" },
            { title: "Team Attendance", icon: Users, path: "/team-attendance" },
          ],
        },
        {
          id: "main_outstation",
          title: "Outstation Management",
          icon: Plane,
          path: "/outstation/my",
          children: [
            { title: "My Outstation", icon: Plane, path: "/outstation/my" },
            { title: "My Outstation Calendar", icon: Calendar, path: "/outstation/my-calendar" },
          ],
        },
        {
          title: "Leave Management",
          icon: CalendarDays,
          path: "/leave",
          children: [
            { title: "Leave Application", icon: FilePlus2, path: "/leave/apply" },
            { title: "My Leave Requests", icon: FileText, path: "/leave/forms" },
          ],
        },
        { title: "Analytics", icon: BarChart3, path: "/analytics" },

        { title: sectionTitle, isSection: true },
        {
          title: "Approval Center",
          icon: CheckSquare,
          path: "/leave/admin",
          children: [
            { title: "Leave Approval", icon: ClipboardList, path: "/leave/admin" },
            { title: "Team Leave Requests", icon: FileCheck, path: "/leave/team" },
            { title: "Leave Calendar", icon: Calendar, path: "/leave/calendar" },
          ],
        },
        { title: "Employee Directory", icon: Users, path: "/employees" },
        {
          id: "admin_outstation",
          title: "Outstation Management",
          icon: Plane,
          path: "/outstation",
          children: [
            { title: "Outstation Dashboard", icon: Plane, path: "/outstation" },
            { title: "Outstation Assignment", icon: Plane, path: "/outstation/assignment" },
            { title: "Outstation Analytics", icon: BarChart3, path: "/outstation/analytics" },
            { title: "Outstation Calendar", icon: Calendar, path: "/outstation/calendar" },
          ],
        },
        { title: "Temporary Assignments", icon: Building2, path: "/branches/temporary-assignments" },
        {
          title: "Workforce Analytics",
          icon: PieChart,
          path: "/hr-analytics/attendance",
          children: [
            { title: "Attendance Dashboard", icon: BarChart3, path: "/hr-analytics/attendance" },
            { title: "Leave Analytics", icon: BarChart3, path: "/hr-analytics/leave" },
            { title: "Workforce Insights", icon: PieChart, path: "/hr-analytics/workforce" },
            { title: "Workforce Calendar", icon: Calendar, path: "/hr-analytics/calendar" },
          ],
        },
        {
          title: "Reports",
          icon: FileSearch,
          path: "/reports",
          children: [
            { title: "Attendance Reports", icon: FileSearch, path: "/reports/attendance" },
            { title: "Leave Reports", icon: FileSearch, path: "/reports/leave" },
            { title: "Outstation Reports", icon: FileSearch, path: "/outstation/reports" },
          ],
        },
        {
          title: "GPS Location Tracker",
          icon: MapPinned,
          path: "/gps-location-tracker",
          children: [
            { title: "Live Tracker", icon: MapPinned, path: "/gps-location-tracker" },
            { title: "Location History", icon: History, path: "/gps-location-tracker/history" },
          ],
        },
      ];
    }

    // 5. MANAGING DIRECTOR & OPERATION MANAGER
    if (isMD_OM) {
      return [
        { title: "Main Navigation", isSection: true },
        { title: "Dashboard", icon: LayoutDashboard, path: "/" },
        {
          title: "Calendar",
          icon: Calendar,
          path: "/calendar",
          children: [
            { title: "Work Calendar", icon: Calendar, path: "/calendar" },
            { title: "Company Leave Calendar", icon: CalendarDays, path: "/calendar/company-leave" },
          ],
        },
        {
          title: "Attendance",
          icon: Clock,
          path: "/attendance",
          children: [
            { title: "My Attendance", icon: Clock, path: "/attendance" },
          ],
        },
        {
          id: "main_outstation",
          title: "Outstation Management",
          icon: Plane,
          path: "/outstation/my",
          children: [
            { title: "My Outstation", icon: Plane, path: "/outstation/my" },
            { title: "My Outstation Calendar", icon: Calendar, path: "/outstation/my-calendar" },
          ],
        },
        {
          title: "Leave Management",
          icon: CalendarDays,
          path: "/leave",
          children: [
            { title: "Leave Application", icon: FilePlus2, path: "/leave/apply" },
            { title: "My Leave Requests", icon: FileText, path: "/leave/forms" },
          ],
        },
        { title: "Analytics", icon: BarChart3, path: "/analytics" },

        { title: "MANAGEMENT & ADMINISTRATION", isSection: true },
        {
          title: "Approval Center",
          icon: CheckSquare,
          path: "/leave/admin",
          children: [
            { title: "Leave Approval", icon: ClipboardList, path: "/leave/admin" },
            { title: "Leave Entitlement Management", icon: CalendarDays, path: "/leave/entitlement" },
            { title: "Leave Calendar", icon: Calendar, path: "/leave/calendar" },
          ],
        },
        {
          id: "admin_outstation",
          title: "Outstation Management",
          icon: Plane,
          path: "/outstation",
          children: [
            { title: "Outstation Dashboard", icon: Plane, path: "/outstation" },
            { title: "Outstation Assignment", icon: Plane, path: "/outstation/assignment" },
            { title: "Outstation Analytics", icon: BarChart3, path: "/outstation/analytics" },
            { title: "Outstation Calendar", icon: Calendar, path: "/outstation/calendar" },
          ],
        },
        {
          title: "Organization & Entities",
          icon: Building2,
          path: "/organization/entities",
          children: [
            { title: "Company Entities", icon: Building2, path: "/organization/entities", permission: "organization.entities" },
            { title: "Personnel Entity", icon: Users, path: "/organization/personnel", permission: "organization.entities" },
            { title: "Company Modules", icon: Boxes, path: "/organization/modules", permission: "organization.modules" },
            { title: "Company Roles & RBAC", icon: ShieldCheck, path: "/organization/roles", permission: "organization.roles" },
            { title: "Employee Transfer Wizard", icon: ArrowRightLeft, path: "/organization/transfer", permission: "organization.transfer" },
            { title: "Transfer Career History", icon: History, path: "/organization/history", permission: "organization.history" },
            { title: "Branches & Geofence", icon: MapPin, path: "/organization/branches", permission: "organization.branches" },
            { title: "Departments", icon: Layers, path: "/organization/departments", permission: "organization.departments" },
          ],
        },
        {
          title: "Employee Management",
          icon: Users,
          path: "/master",
          children: [
            { title: "Employee Directory", icon: Users, path: "/employees" },
            { title: "Department", icon: Building2, path: "/master/department" },
            { title: "Role", icon: Settings, path: "/master/role" },
          ],
        },
        {
          title: "Branch Management",
          icon: Building2,
          path: "/branches",
          children: [
            { title: "Overview", icon: Building2, path: "/branches" },
            { title: "Temporary Assignment", icon: Briefcase, path: "/branches/temporary-assignments" },
          ],
        },
        {
          title: "Workforce Analytics",
          icon: PieChart,
          path: "/hr-analytics/attendance",
          children: [
            { title: "Attendance Dashboard", icon: BarChart3, path: "/hr-analytics/attendance" },
            { title: "Leave Analytics", icon: BarChart3, path: "/hr-analytics/leave" },
            { title: "Workforce Insights", icon: PieChart, path: "/hr-analytics/workforce" },
            { title: "Workforce Calendar", icon: Calendar, path: "/hr-analytics/calendar" },
          ],
        },
        {
          title: "Reports",
          icon: FileSearch,
          path: "/reports",
          children: [
            { title: "Attendance Reports", icon: FileSearch, path: "/reports/attendance" },
            { title: "Leave Reports", icon: FileSearch, path: "/reports/leave" },
            { title: "Outstation Reports", icon: FileSearch, path: "/outstation/reports" },
            { title: "Department & Branch Report", icon: Building2, path: "/reports/department" },
          ],
        },
        {
          title: "GPS Location Tracker",
          icon: MapPinned,
          path: "/gps-location-tracker",
          children: [
            { title: "Live Tracker", icon: MapPinned, path: "/gps-location-tracker" },
          ],
        },
        { title: "Settings", icon: Settings, path: "/settings" },
      ];
    }

    // 6. CUSTOM ROLES (Dynamic Permission Fallback)
    return [
      { title: "Main Navigation", isSection: true },
      { title: "Dashboard", icon: LayoutDashboard, path: "/", permission: "dashboard.view" },
      {
        title: "Calendar",
        icon: Calendar,
        path: "/calendar",
        children: [
          { title: "Work Calendar", icon: Calendar, path: "/calendar", permission: "calendar.work" },
          { title: "Company Leave Calendar", icon: CalendarDays, path: "/calendar/company-leave", permission: "calendar.company_leave" },
        ],
      },
      {
        title: "Attendance",
        icon: Clock,
        path: "/attendance",
        children: [
          { title: "My Attendance", icon: Clock, path: "/attendance", permission: "attendance.my" },
          { title: "Team Attendance", icon: Users, path: "/team-attendance", permission: "attendance.team" },
        ],
      },
      {
        id: "main_outstation",
        title: "Outstation Management",
        icon: Plane,
        path: "/outstation/my",
        children: [
          { title: "My Outstation", icon: Plane, path: "/outstation/my", permission: "outstation.my" },
          { title: "My Outstation Calendar", icon: Calendar, path: "/outstation/my-calendar", permission: "outstation.my_calendar" },
        ],
      },
      {
        title: "Leave Management",
        icon: CalendarDays,
        path: "/leave",
        children: [
          { title: "Leave Application", icon: FilePlus2, path: "/leave/apply", permission: "leave.apply" },
          { title: "My Leave Requests", icon: FileText, path: "/leave/forms", permission: "leave.my_requests" },
        ],
      },
      { title: "Analytics", icon: BarChart3, path: "/analytics", permission: "analytics.employee" },

      { title: "ADMINISTRATION", isSection: true },
      {
        title: "Approval Center",
        icon: CheckSquare,
        path: "/leave/admin",
        children: [
          { title: "Leave Approval", icon: ClipboardList, path: "/leave/admin", permission: "leave.approval" },
          { title: "Team Leave Requests", icon: FileCheck, path: "/leave/team", permission: "leave.team_requests" },
          { title: "Company Leave Calendar", icon: CalendarDays, path: "/calendar/company-leave", permission: "calendar.company_leave" },
          { title: "Leave Entitlement Management", icon: CalendarDays, path: "/leave/entitlement", permission: "leave.entitlement" },
          { title: "Leave Calendar", icon: Calendar, path: "/leave/calendar", permission: "leave.calendar" },
        ],
      },
      { title: "Employee Directory", icon: Users, path: "/employees", permission: "employee.directory" },
      {
        id: "admin_outstation",
        title: "Outstation Management",
        icon: Plane,
        path: "/outstation",
        children: [
          { title: "Outstation Dashboard", icon: Plane, path: "/outstation", permission: "outstation.dashboard" },
          { title: "Outstation Assignment", icon: Plane, path: "/outstation/assignment", permission: "outstation.assignment" },
          { title: "Outstation Analytics", icon: BarChart3, path: "/outstation/analytics", permission: "outstation.analytics" },
          { title: "Outstation Calendar", icon: Calendar, path: "/outstation/calendar", permission: "outstation.calendar" },
        ],
      },
      {
        title: "Employee Management",
        icon: Users,
        path: "/master",
        children: [
          { title: "Employee Directory", icon: Users, path: "/employees", permission: "employee.directory" },
          { title: "Department", icon: Building2, path: "/master/department", permission: "employee.department" },
          { title: "Role", icon: Settings, path: "/master/role", permission: "employee.role" },
        ],
      },
      {
        title: "Branch Management",
        icon: Building2,
        path: "/branches",
        children: [
          { title: "Overview", icon: Building2, path: "/branches", permission: "employee.branch" },
          { title: "Temporary Assignment", icon: Briefcase, path: "/branches/temporary-assignments", permission: "employee.temporary_assignment" },
        ],
      },
      {
        title: "Workforce Analytics",
        icon: PieChart,
        path: "/hr-analytics/attendance",
        children: [
          { title: "Attendance Dashboard", icon: BarChart3, path: "/hr-analytics/attendance", permission: "analytics.attendance" },
          { title: "Leave Analytics", icon: BarChart3, path: "/hr-analytics/leave", permission: "analytics.leave" },
          { title: "Workforce Insights", icon: PieChart, path: "/hr-analytics/workforce", permission: "analytics.workforce" },
          { title: "Workforce Calendar", icon: Calendar, path: "/hr-analytics/calendar", permission: "analytics.workforce_calendar" },
        ],
      },
      {
        title: "Reports",
        icon: FileSearch,
        path: "/reports",
        children: [
          { title: "Attendance Reports", icon: FileSearch, path: "/reports/attendance", permission: "report.attendance" },
          { title: "Leave Reports", icon: FileSearch, path: "/reports/leave", permission: "report.leave" },
          { title: "Outstation Reports", icon: FileSearch, path: "/outstation/reports", permission: "report.outstation" },
          { title: "Department & Branch Report", icon: Building2, path: "/reports/department", permission: "report.department" },
        ],
      },
      {
        title: "GPS Location Tracker",
        icon: MapPinned,
        path: "/gps-location-tracker",
        children: [
          { title: "Live Tracker", icon: MapPinned, path: "/gps-location-tracker", permission: "gps.live_tracker" },
          { title: "Location History", icon: History, path: "/gps-location-tracker/history", permission: "gps.location_history" },
        ],
      },
      { title: "Settings", icon: Settings, path: "/settings", permission: "settings.manage" },
    ];
  }, [role]);

  // Helper to map sidebar item to its parent functional module
  const getModuleKeyForMenuItem = useCallback((item: any): string | null => {
    const t = (item.title || "").toLowerCase();
    const p = (item.path || "").toLowerCase();
    const id = (item.id || "").toLowerCase();

    if (t === "dashboard" || p === "/") return "dashboard";
    if (t.includes("calendar")) return "calendar";
    if (t.includes("attendance")) return "attendance";
    if (t === "leave administration" || p.includes("/leave/admin")) return "leave_admin";
    if (t.includes("leave")) return "leave_management";
    if (id.includes("outstation") || t.includes("outstation") || p.includes("/outstation")) return "outstation";
    if (t === "employee management" || p === "/master" || p === "/employees") return "employee_management";
    if (t === "branch management" || p === "/branches") return "employee_management";
    if (t.includes("analytics") || p.includes("/analytics") || p.includes("/hr-analytics")) return "analytics";
    if (t.includes("reports") || p.includes("/reports")) return "reports";
    if (t.includes("gps") || p.includes("gps")) return "gps";
    if (t === "settings" || p === "/settings") return "settings";
    if (t === "organization & entities" || p.startsWith("/organization")) return "organization_entities";
    return null;
  }, []);

  // RBAC Permission & Company Module Filter
  const filteredItems = useMemo(() => {
    const items: any[] = [];
    let currentSection: any = null;
    let sectionHasItems = false;

    for (const item of allMenuItems) {
      if (item.isSection) {
        currentSection = item;
        sectionHasItems = false;
        continue;
      }

      // Check if parent module is enabled for current active company
      const modKey = getModuleKeyForMenuItem(item);
      if (modKey && !isModuleEnabled(modKey)) {
        continue;
      }

      let isVisible = false;
      let resolvedItem = { ...item };

      if (item.children) {
        const visibleChildren = item.children.filter((child: any) => {
          const childMod = getModuleKeyForMenuItem(child);
          if (childMod && !isModuleEnabled(childMod)) return false;
          if (child.permission && !isPermissionEnabled(child.permission)) return false;
          return !child.permission || hasPermission(child.permission);
        });
        if (visibleChildren.length > 0) {
          isVisible = true;
          resolvedItem.children = visibleChildren;
        }
      } else {
        isVisible = (!item.permission || (isPermissionEnabled(item.permission) && hasPermission(item.permission)));
      }

      if (isVisible) {
        if (currentSection && !sectionHasItems) {
          items.push(currentSection);
          sectionHasItems = true;
        }
        items.push(resolvedItem);
      }
    }
    return items;
  }, [allMenuItems, hasPermission, isModuleEnabled, isPermissionEnabled, getModuleKeyForMenuItem]);

  // Automatically expand submenus if any child page is active
  useEffect(() => {
    let activeParentKey = "";
    for (const item of filteredItems) {
      if (item.children) {
        const hasActiveChild = item.children.some((child: any) =>
          child.path && (location.pathname === child.path || (child.path !== item.path && location.pathname.startsWith(`${child.path}/`)))
        );
        const isParentActive = item.path && location.pathname === item.path;
        if (hasActiveChild || isParentActive) {
          activeParentKey = (item as any).id || item.title;
          break;
        }
      }
    }
    if (activeParentKey) {
      setExpandedMenus({ [activeParentKey]: true });
    } else {
      setExpandedMenus({});
    }
  }, [location.pathname, filteredItems]);

  const sidebarContent = (isMobile: boolean) => (
    <>
      <div className={`relative shrink-0 flex items-center justify-center border-b border-purple-950/20 dark:border-b-white/5 overflow-hidden transition-all bg-[#942392] ${
        effectiveCollapsed && !isMobile ? "h-20" : "h-20 px-3"
      }`}>
        {/* Mobile or Expanded Desktop view: show logo (and toggle on right for desktop) */}
        {(!effectiveCollapsed || isMobile) ? (
          <div className="flex items-center justify-between w-full h-full gap-2">
            <Link to="/" className="flex items-center justify-start h-full animate-in fade-in duration-300 max-w-[210px] overflow-hidden" onClick={isMobile ? onMobileClose : undefined}>
              <DynamicSidebarLogo isCollapsed={false} variant="sidebar" />
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
      <div className={`flex-1 overflow-y-auto scrollbar-none pt-6 pb-4 border-r border-sidebar-border`}>
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

            const visibleChildren = item.children || [];
            const hasChildren = !!visibleChildren?.length;
            const hasActiveChild = hasChildren && visibleChildren.some((child: any) =>
              child.path && (location.pathname === child.path || (child.path !== item.path && location.pathname.startsWith(`${child.path}/`)))
            );
            const isActive =
              item.path === "/"
                ? location.pathname === item.path
                : (item.path && location.pathname === item.path) || hasActiveChild || (!hasChildren && item.path && location.pathname.startsWith(`${item.path}/`));
            const menuKey = (item as any).id || item.title;
            const isMenuExpanded = expandedMenus[menuKey];
            const ItemIcon = item.icon;

            return (
              <HoverCard key={menuKey} openDelay={0} closeDelay={100} open={effectiveCollapsed && !isMobile ? undefined : false}>
                <div className="relative group/menu-item space-y-1">
                  <HoverCardTrigger asChild>
                    <Link
                      to={item.path || visibleChildren[0]?.path || "#"}
                      onClick={(e) => {
                        const targetPath = item.path || visibleChildren[0]?.path;
                        if (hasChildren) {
                          e.preventDefault();
                          setExpandedMenus({
                            [menuKey]: true
                          });
                          if (targetPath) {
                            if (isMobile) {
                              onMobileClose();
                            }
                            navigate(targetPath);
                          }
                          return;
                        }
                        setExpandedMenus({});
                        if (isMobile) {
                          onMobileClose();
                        }
                      }}
                      className={`group relative flex items-center gap-2.5 transition-all duration-300 touch-target ${
                        effectiveCollapsed && !isMobile 
                          ? "justify-center px-0 w-11 h-11 mx-auto rounded-xl" 
                          : "px-3.5 py-2 rounded-r-2xl mr-4"
                      } ${
                        isActive
                          ? effectiveCollapsed && !isMobile
                            ? "bg-[#FDE047]/10 text-white font-semibold shadow-[inset_3px_0_0_0_#FDE047]"
                            : "bg-[#FDE047]/10 text-white font-semibold border-l-[3px] border-[#FDE047]"
                          : effectiveCollapsed && !isMobile
                            ? "text-sidebar-foreground/70 hover:bg-white/[0.06] hover:text-white"
                            : "text-sidebar-foreground/70 hover:bg-white/[0.02] hover:text-white border-l-[3px] border-transparent"
                      }`}
                    >
                      {ItemIcon && (
                        <ItemIcon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive 
                              ? "text-[#FDE047]" 
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
                            setExpandedMenus(prev => (
                              prev[menuKey] ? {} : { [menuKey]: true }
                            ));
                          }}
                          className="ml-auto p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-all"
                          aria-label={isMenuExpanded ? "Collapse submenu" : "Expand submenu"}
                        >
                          {isMenuExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      )}
                    </Link>
                  </HoverCardTrigger>

                  {/* Submenu for Expanded State (Desktop or Mobile) */}
                  {hasChildren && isMenuExpanded && (!effectiveCollapsed || isMobile) && (
                    <div className="relative pl-[2.25rem] pr-6 py-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="absolute left-[1.1rem] top-0 bottom-4 w-px bg-sidebar-border"></div>
                      {visibleChildren.map((child: any) => {
                        const isChildActive = child.path && (location.pathname === child.path || (child.path !== item.path && location.pathname.startsWith(`${child.path}/`)));
                        return (
                          <Link
                            key={child.title}
                            to={child.path}
                            onClick={() => {
                              setExpandedMenus({ [menuKey]: true });
                              if (isMobile) onMobileClose();
                            }}
                            className={`group relative flex items-center gap-3 rounded-[14px] px-4 py-2 text-[11px] transition-all duration-300 touch-target ${
                              isChildActive
                                ? "bg-[#FDE047]/10 font-semibold text-white"
                                : "text-sidebar-foreground/60 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <div className={`absolute -left-[1.1rem] top-1/2 w-[1.1rem] border-t transition-colors ${isChildActive ? 'border-[#FDE047]/50' : 'border-sidebar-border group-hover:border-white/10'}`}></div>
                            <span className="whitespace-nowrap truncate">{child.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* HoverCardContent for Collapsed State */}
                  {effectiveCollapsed && !isMobile && (
                    <HoverCardContent side="right" align="start" sideOffset={12} className="w-auto p-0 border-none bg-transparent shadow-none !z-[100] animate-in fade-in zoom-in-95 duration-200">
                      {hasChildren ? (
                        <div className="min-w-[200px] bg-sidebar border border-sidebar-border rounded-[18px] p-2 shadow-[0_8px_30px_rgba(123,0,153,0.08)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                          {/* Category Header */}
                          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60 border-b border-white/5 mb-2">
                            {item.title}
                          </div>
                          {/* Submenu Items */}
                          <div className="space-y-1">
                            {visibleChildren.map((child: any) => {
                              const isChildActive = child.path && (location.pathname === child.path || (child.path !== item.path && location.pathname.startsWith(`${child.path}/`)));
                              return (
                                <Link
                                  key={child.title}
                                  to={child.path}
                                  className={`flex items-center gap-3 rounded-[14px] px-3 py-2 text-[11px] transition-all duration-200 ${
                                    isChildActive
                                      ? "bg-[#FDE047]/10 font-semibold text-white"
                                      : "text-white/70 hover:bg-white/5 hover:text-white"
                                  }`}
                                >
                                  <span className="whitespace-nowrap truncate">{child.title}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-sidebar border border-sidebar-border rounded-[12px] px-3.5 py-2 shadow-[0_8px_25px_rgba(123,0,153,0.08)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.5)]">
                          <span className="text-[11px] font-bold text-white whitespace-nowrap">
                            {item.title}
                          </span>
                        </div>
                      )}
                    </HoverCardContent>
                  )}
                </div>
              </HoverCard>
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
          className={`group flex w-full justify-start items-center gap-2.5 rounded-[16px] px-2.5 sm:px-2.5 py-2.5 text-sidebar-foreground/85 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground touch-target ${
            effectiveCollapsed && !isMobile ? "justify-center px-0 w-11 h-11 mx-auto" : ""
          }`}
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4 shrink-0 text-purple-200/70" />
          ) : (
            <Sun className="h-4 w-4 shrink-0 text-yellow-300" />
          )}
          {(!effectiveCollapsed || isMobile) && (
            <div className="flex items-center justify-between flex-1 min-w-0">
              <span className="text-xs font-bold whitespace-nowrap animate-in fade-in duration-300">
                Dark Mode
              </span>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full transition-colors ${
                theme === "dark" 
                  ? "bg-[#942392] text-white shadow-xs" 
                  : "bg-white/10 text-white/50 border border-white/10"
              }`}>
                {theme === "dark" ? "ON" : "OFF"}
              </span>
            </div>
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
