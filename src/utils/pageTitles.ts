export function getPageTitleInfo(pathname: string): { title: string; subtitle: string | null } {
  if (pathname === "/") return { title: "Workforce Overview", subtitle: "Monitor employee activity, attendance status, leave updates, and workforce performance in real time" };
  
  if (pathname === "/calendar") return { title: "Workforce Calendar", subtitle: "Manage working schedules, company holidays, and important workforce events" };
  if (pathname === "/calendar/company-leave") return { title: "Company Leave Calendar", subtitle: "All global leave dates that affect attendance calculation." };
  
  if (pathname === "/attendance") return { title: "Attendance Performance Insights", subtitle: "Track attendance patterns, punctuality, and daily workforce presence" };
  if (pathname === "/team-attendance" || pathname === "/attendance/team") return { title: "Daily Team Attendance Overview", subtitle: "Review employee attendance records, clock-in activities, and working hours for today" };
  
  if (pathname === "/outstation") return { title: "Outstation Dashboard", subtitle: "Monitor employee business travel across all branches." };
  if (pathname === "/outstation/assignment") return { title: "Outstation Assignment", subtitle: "Manage employee outstation requests, approvals, and travel activities" };
  if (pathname === "/outstation/analytics") return { title: "Outstation Insight", subtitle: "Assign employees to official business travel and field duties." };
  if (pathname === "/outstation/calendar") return { title: "Outstation Calendar", subtitle: "View upcoming and ongoing outstation schedules." };
  if (pathname === "/outstation/my") return { title: "My Outstation", subtitle: "Track your assigned business trips and travel history." };
  if (pathname === "/outstation/reports") return { title: "Outstation Reports", subtitle: "Generate and export outstation travel reports." };
  
  if (pathname === "/leave") return { title: "Leave Management Overview", subtitle: "Monitor leave applications, approvals, balances, and employee leave utilization" };
  if (pathname === "/leave/apply") return { title: "Leave Application", subtitle: "Submit and manage employee leave requests." };
  if (pathname === "/leave/forms") return { title: "My Leave Requests", subtitle: "Track your leave applications and approval progress." };
  if (pathname === "/leave/team") return { title: "Team Leave Request", subtitle: "Track employee leave request and approval progress" };
  
  // Leave Administration
  if (pathname === "/leave/admin") return { title: "Leave Approvals", subtitle: "Review and approve employee leave requests." };
  if (pathname === "/leave/calendar") return { title: "Leave Calendar", subtitle: "Monitor leave schedules across departments and branches." };
  if (pathname === "/leave/entitlement") return { title: "Leave Entitlement Management", subtitle: "Configure employee leave quotas and entitlements." };
  
  // Employee Management
  if (pathname === "/master") return { title: "Master Hub Control", subtitle: "Manage employees, organizational settings, and system configuration." };
  if (pathname === "/employees") return { title: "Employee Directory", subtitle: "Browse and manage employee information across the organization." };
  if (pathname === "/master/department") return { title: "Department Management", subtitle: "Manage organizational departments and reporting structure." };
  if (pathname.startsWith("/master/department/")) {
    const deptName = pathname.split("/").pop()?.replace(/-/g, " ") || "Department Details";
    return { title: deptName, subtitle: "Manage department-specific configurations and employee assignments." };
  }
  if (pathname === "/master/role") return { title: "Role Management", subtitle: "Configure user roles and access permissions." };
  
  // Branch Management
  if (pathname === "/branches") return { title: "Branch Overview", subtitle: "Monitor branch information, workforce distribution, and operations." };
  if (pathname === "/branches/temporary-assignment") return { title: "Temporary Branch Assignment", subtitle: "Assign employees to another branch for temporary duties." };
  
  // Workforce Analytics
  if (pathname === "/hr-analytics/attendance") return { title: "Attendance Dashboard", subtitle: "Organization-wide attendance performance" };
  if (pathname === "/hr-analytics/leave") return { title: "Leave Insights", subtitle: "Leave Utilization Analytics" };
  if (pathname === "/hr-analytics/workforce") return { title: "Workforce Insights", subtitle: "Company Attendance & Workforce Analytics" };
  if (pathname === "/hr-analytics/calendar") return { title: "Workforce Calendar", subtitle: "View attendance, leave, outstation, and company events in one calendar." };
  
  // Reports
  if (pathname === "/reports") return { title: "Attendance Reports", subtitle: "Generate attendance summaries and export detailed records." };
  if (pathname === "/reports/leave") return { title: "Leave Reports", subtitle: "Generate leave utilization and approval reports." };
  if (pathname === "/reports/department") return { title: "Department & Branch Reports", subtitle: "Analyze workforce performance by department and branch." };
  
  // Settings
  if (pathname === "/settings") return { title: "Portal Configurations", subtitle: "Configure global branches, staff roles, and check-in parameters" };
  if (pathname === "/profile") return { title: "My Profile", subtitle: "Manage your personal information and account settings." };
  
  const last = pathname.split("/").filter(Boolean).pop() || "Page";
  const fallbackTitle = last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { title: fallbackTitle, subtitle: null };
}
