import {
  LayoutDashboard, CalendarDays, CalendarHeart, Clock3, UsersRound, MapPinned,
  BriefcaseBusiness, CalendarRange, Route, ChartColumnIncreasing, FileSpreadsheet,
  ClipboardList, FilePenLine, NotebookPen, Users, ChartPie, BadgeCheck,
  CalendarCheck2, WalletCards, ShieldEllipsis, ContactRound, Building2, UserCog,
  Building, ArrowRightLeft, MonitorSmartphone, ChartNoAxesCombined, ScanSearch,
  CalendarClock, FileClock, FileCheck2, FileBarChart2, Settings, User, LucideIcon
} from "lucide-react";

export interface PageInfo {
  title: string;
  subtitle: string | null;
  icon: LucideIcon;
}

export function getPageTitleInfo(pathname: string, userRole?: string): PageInfo {
  // Dashboard
  if (pathname === "/") return {
    title: "Dashboard",
    subtitle: "Good afternoon! Here's your workforce overview and today's key business insights.",
    icon: LayoutDashboard
  };

  // Calendar
  if (pathname === "/calendar") return {
    title: "Work Calendar",
    subtitle: "View company working days, weekends, and scheduled events.",
    icon: CalendarDays
  };
  if (pathname === "/calendar/company-leave") return {
    title: "Company Leave Calendar",
    subtitle: "Manage organization-wide holidays and company leave schedules.",
    icon: CalendarHeart
  };

  // Attendance
  if (pathname === "/attendance") return {
    title: "Employee Attendance",
    subtitle: "Track employee attendance, punctuality, and daily working hours.",
    icon: Clock3
  };
  if (pathname === "/team-attendance" || pathname === "/attendance/team") return {
    title: "Team Attendance",
    subtitle: "Monitor attendance records across your assigned team members.",
    icon: UsersRound
  };

  // Outstation Management
  if (pathname === "/outstation") return {
    title: "Outstation Dashboard",
    subtitle: "Manage official business travel, location check-ins, and assignment schedules.",
    icon: MapPinned
  };
  if (pathname === "/outstation/assignment") return {
    title: "Outstation Assignment",
    subtitle: "Assign employees to official business travel and field duties.",
    icon: BriefcaseBusiness
  };
  if (pathname === "/outstation/calendar") return {
    title: "Outstation Calendar",
    subtitle: "View upcoming and ongoing outstation schedules.",
    icon: CalendarRange
  };
  if (pathname === "/outstation/my-calendar" || pathname === "/outstation/my_calendar") return {
    title: "My Outstation Calendar",
    subtitle: "View your personal scheduled business trips and travel calendar.",
    icon: CalendarRange
  };
  if (pathname === "/outstation/my") return {
    title: "My Outstation",
    subtitle: "Track your assigned business trips and travel history.",
    icon: Route
  };
  if (pathname === "/outstation/analytics") return {
    title: "Outstation Analytics",
    subtitle: "Analyze travel trends, branch movements, and assignment performance.",
    icon: ChartColumnIncreasing
  };
  if (pathname === "/outstation/reports") return {
    title: "Outstation Reports",
    subtitle: "Generate and export comprehensive business travel reports.",
    icon: FileSpreadsheet
  };

  // Leave Management
  if (pathname === "/leave") return {
    title: "Leave Overview",
    subtitle: "Monitor leave balances, requests, and overall leave activity.",
    icon: ClipboardList
  };
  if (pathname === "/leave/apply") return {
    title: "Leave Application",
    subtitle: "Submit and manage your leave application quickly and efficiently.",
    icon: FilePenLine
  };
  if (pathname === "/leave/forms") return {
    title: "My Leave Request",
    subtitle: "Track your leave requests, approval progress, and leave history.",
    icon: NotebookPen
  };
  if (pathname === "/leave/team") return {
    title: "Team Leave Request",
    subtitle: "Review and manage leave requests submitted by your team.",
    icon: Users
  };

  // Analytics
  if (pathname === "/analytics") return {
    title: "Employee Analytics",
    subtitle: "Discover workforce trends through attendance and employee performance insights.",
    icon: ChartPie
  };

  // Leave Administration
  if (pathname === "/leave/admin") return {
    title: "Leave Approvals",
    subtitle: "Review, approve, or reject employee leave applications.",
    icon: BadgeCheck
  };
  if (pathname === "/leave/calendar") return {
    title: "Leave Calendar",
    subtitle: "View approved leave schedules across the organization.",
    icon: CalendarCheck2
  };
  if (pathname === "/leave/entitlement") return {
    title: "Leave Entitlement Management",
    subtitle: "Configure annual leave allocations and employee leave entitlements.",
    icon: WalletCards
  };

  // Employee Management
  if (pathname === "/master") return {
    title: "Master Hub Control",
    subtitle: "Manage employee records, organizational structure, and system access.",
    icon: ShieldEllipsis
  };
  if (pathname === "/employees") return {
    title: "Employee Directory",
    subtitle: "Browse and manage employee profiles across the organization.",
    icon: ContactRound
  };
  if (pathname === "/master/department") return {
    title: "Department",
    subtitle: "Organize and manage departments within the company.",
    icon: Building2
  };
  if (pathname.startsWith("/master/department/")) {
    return {
      title: "Department Overview",
      subtitle: "Manage department-specific configurations and employee assignments.",
      icon: Building2
    };
  }
  if (pathname === "/master/role") return {
    title: "Role",
    subtitle: "Configure employee roles and system permissions.",
    icon: UserCog
  };

  // Branch Management
  if (pathname === "/branches") return {
    title: "Branch Overview",
    subtitle: "View branch performance, workforce distribution, and operational status.",
    icon: Building
  };
  if (pathname === "/branches/temporary-assignment") return {
    title: "Branch Temporary Assignment",
    subtitle: "Assign employees temporarily to different company branches.",
    icon: ArrowRightLeft
  };

  // Workforce Analytics
  if (pathname === "/hr-analytics/attendance") return {
    title: "Attendance Dashboard",
    subtitle: "Monitor live workforce attendance, presence, and daily workforce status.",
    icon: MonitorSmartphone
  };
  if (pathname === "/hr-analytics/leave") return {
    title: "Leave Analytics",
    subtitle: "Analyze leave utilization, approval patterns, and workforce availability.",
    icon: ChartNoAxesCombined
  };
  if (pathname === "/hr-analytics/workforce") return {
    title: "Workforce Insight",
    subtitle: "Gain actionable insights into workforce performance and attendance behavior.",
    icon: ScanSearch
  };
  if (pathname === "/hr-analytics/calendar") return {
    title: "Workforce Calendar",
    subtitle: "Visualize attendance, leave, company holidays, and workforce schedules.",
    icon: CalendarClock
  };

  // Reports
  if (pathname === "/reports/attendance") return {
    title: "Attendance Reports",
    subtitle: "Generate attendance record following the month filter",
    icon: FileClock
  };
  if (pathname === "/reports") return {
    title: "Workforce Reports & Analytics",
    subtitle: "Generate detailed attendance reports for monitoring and compliance.",
    icon: FileClock
  };
  if (pathname === "/reports/leave") return {
    title: "Leave Reports",
    subtitle: "Export leave records, balances, and approval summaries.",
    icon: FileCheck2
  };
  if (pathname === "/reports/department") return {
    title: "Department & Branch Reports",
    subtitle: "Analyze workforce performance across departments and branches.",
    icon: FileBarChart2
  };

  // Settings & Profile
  if (pathname === "/settings") return {
    title: "Portal Configurations",
    subtitle: "Configure global branches, staff roles, and check-in parameters.",
    icon: Settings
  };
  if (pathname === "/profile") return {
    title: "My Profile",
    subtitle: "Manage your personal information and account settings.",
    icon: User
  };

  const last = pathname.split("/").filter(Boolean).pop() || "Page";
  const fallbackTitle = last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { title: fallbackTitle, subtitle: null, icon: LayoutDashboard };
}
