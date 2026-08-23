export interface BreadcrumbSegment {
  label: string;
  path?: string;
}

export function getBreadcrumbs(pathname: string, search?: string): BreadcrumbSegment[] {
  const home: BreadcrumbSegment = { label: "HOME", path: "/" };

  if (pathname === "/") return [home, { label: "DASHBOARD" }];
  
  // Calendar Pages
  if (pathname === "/calendar") return [home, { label: "CALENDAR", path: "/calendar" }, { label: "WORK CALENDAR" }];
  if (pathname === "/calendar/company-leave") return [home, { label: "CALENDAR", path: "/calendar" }, { label: "COMPANY LEAVE CALENDAR" }];

  // Attendance Pages
  if (pathname === "/attendance") return [home, { label: "ATTENDANCE" }, { label: "EMPLOYEE ATTENDANCE" }];
  if (pathname === "/team-attendance" || pathname === "/attendance/team") return [home, { label: "ATTENDANCE" }, { label: "TEAM ATTENDANCE" }];
  
  // Leave Management Pages (General & Team)
  if (pathname === "/leave/team") return [home, { label: "LEAVE MANAGEMENT" }, { label: "TEAM LEAVE REQUEST" }];
  if (pathname === "/leave") return [home, { label: "LEAVE MANAGEMENT" }, { label: "LEAVE OVERVIEW" }];
  if (pathname === "/leave/apply") return [home, { label: "LEAVE MANAGEMENT", path: "/leave" }, { label: "LEAVE APPLICATION" }];
  if (pathname === "/leave/forms") return [home, { label: "LEAVE MANAGEMENT", path: "/leave" }, { label: "MY LEAVE REQUEST" }];

  // Outstation Management Pages
  if (pathname === "/outstation") return [home, { label: "OUTSTATION MANAGEMENT", path: "/outstation" }, { label: "OUTSTATION DASHBOARD" }];
  if (pathname === "/outstation/assignment") return [home, { label: "OUTSTATION MANAGEMENT", path: "/outstation" }, { label: "OUTSTATION ASSIGNMENT" }];
  if (pathname === "/outstation/calendar") return [home, { label: "OUTSTATION MANAGEMENT", path: "/outstation" }, { label: "OUTSTATION CALENDAR" }];
  if (pathname === "/outstation/my-calendar" || pathname === "/outstation/my_calendar") return [home, { label: "OUTSTATION MANAGEMENT", path: "/outstation/my" }, { label: "MY OUTSTATION CALENDAR" }];
  if (pathname === "/outstation/my") return [home, { label: "OUTSTATION MANAGEMENT", path: "/outstation" }, { label: "MY OUTSTATION" }];
  if (pathname === "/outstation/analytics") return [home, { label: "OUTSTATION MANAGEMENT", path: "/outstation" }, { label: "OUTSTATION ANALYTICS" }];
  if (pathname === "/outstation/reports") return [home, { label: "OUTSTATION MANAGEMENT", path: "/outstation" }, { label: "OUTSTATION REPORTS" }];

  // Analytics Pages
  if (pathname === "/analytics") return [home, { label: "ANALYTICS" }, { label: "EMPLOYEE ANALYTICS" }];

  // Leave Administration Pages
  if (pathname === "/leave/admin") return [home, { label: "LEAVE ADMINISTRATION", path: "/leave/admin" }, { label: "LEAVE APPROVALS" }];
  if (pathname === "/leave/calendar") return [home, { label: "LEAVE ADMINISTRATION", path: "/leave/admin" }, { label: "LEAVE CALENDAR" }];
  if (pathname === "/leave/entitlement") {
    if (search) {
      const params = new URLSearchParams(search);
      const module = params.get("module");
      if (module) {
        return [
          home, 
          { label: "LEAVE ADMINISTRATION", path: "/leave/admin" }, 
          { label: "LEAVE ENTITLEMENT MANAGEMENT", path: "/leave/entitlement" },
          { label: module.toUpperCase().replace(/-/g, ' ') }
        ];
      }
    }
    return [home, { label: "LEAVE ADMINISTRATION", path: "/leave/admin" }, { label: "LEAVE ENTITLEMENT MANAGEMENT" }];
  }

  // Employee Management Pages
  if (pathname === "/master") return [home, { label: "EMPLOYEE MANAGEMENT", path: "/master" }, { label: "MASTER HUB CONTROL" }];
  if (pathname === "/employees") return [home, { label: "EMPLOYEE MANAGEMENT", path: "/master" }, { label: "EMPLOYEE DIRECTORY" }];
  if (pathname === "/master/department") return [home, { label: "EMPLOYEE MANAGEMENT", path: "/master" }, { label: "DEPARTMENT" }];
  if (pathname.startsWith("/master/department/")) {
    const deptName = pathname.split("/").pop()?.replace(/-/g, " ").toUpperCase() || "DETAILS";
    return [home, { label: "EMPLOYEE MANAGEMENT", path: "/master" }, { label: "DEPARTMENT", path: "/master/department" }, { label: deptName }];
  }
  if (pathname === "/master/role") return [home, { label: "EMPLOYEE MANAGEMENT", path: "/master" }, { label: "ROLE" }];

  // Branch Management Pages
  if (pathname === "/branches") return [home, { label: "BRANCH MANAGEMENT", path: "/branches" }, { label: "BRANCH OVERVIEW" }];
  if (pathname === "/branches/temporary-assignment" || pathname === "/branches/temporary-assignments") return [home, { label: "BRANCH MANAGEMENT", path: "/branches" }, { label: "TEMPORARY ASSIGNMENTS" }];

  // Workforce Analytics Pages
  if (pathname === "/hr-analytics/attendance") return [home, { label: "WORKFORCE ANALYTICS", path: "/hr-analytics/attendance" }, { label: "ATTENDANCE DASHBOARD" }];
  if (pathname === "/hr-analytics/leave") return [home, { label: "WORKFORCE ANALYTICS", path: "/hr-analytics/attendance" }, { label: "LEAVE ANALYTICS" }];
  if (pathname === "/hr-analytics/workforce") return [home, { label: "WORKFORCE ANALYTICS", path: "/hr-analytics/attendance" }, { label: "WORKFORCE INSIGHT" }];
  if (pathname === "/hr-analytics/calendar") return [home, { label: "WORKFORCE ANALYTICS", path: "/hr-analytics/attendance" }, { label: "WORKFORCE CALENDAR" }];

  // Reports Pages
  if (pathname === "/reports") return [home, { label: "REPORTS" }, { label: "WORKFORCE REPORTS & ANALYTICS" }];
  if (pathname === "/reports/attendance") return [home, { label: "REPORTS", path: "/reports" }, { label: "ATTENDANCE REPORTS" }];
  if (pathname === "/reports/leave") return [home, { label: "REPORTS", path: "/reports" }, { label: "LEAVE REPORTS" }];
  if (pathname === "/reports/department") return [home, { label: "REPORTS", path: "/reports" }, { label: "DEPARTMENT & BRANCH REPORTS" }];

  // Setting Pages
  if (pathname === "/settings") {
    const base: BreadcrumbSegment[] = [home, { label: "HR ADMINISTRATOR" }, { label: "SETTINGS", path: "/settings" }];
    if (search) {
      const params = new URLSearchParams(search);
      const tab = params.get("tab");
      if (tab) {
        let tabLabel = tab.toUpperCase();
        if (tab === "system") tabLabel = "SYSTEM CONFIGURATION";
        else if (tab === "personnel") tabLabel = "PERSONNEL MANAGEMENT";
        else if (tab === "branch") tabLabel = "BRANCH MANAGEMENT";
        else if (tab === "department") tabLabel = "DEPARTMENT MANAGEMENT";
        base.push({ label: tabLabel });
      }
    }
    return base;
  }
  if (pathname === "/profile") return [home, { label: "PROFILE" }];

  // Fallback
  const segments = pathname.split("/").filter(Boolean);
  const result: BreadcrumbSegment[] = [home];
  segments.forEach((seg, i) => {
    const label = seg.replace(/-/g, " ").toUpperCase();
    const path = "/" + segments.slice(0, i + 1).join("/");
    result.push(i < segments.length - 1 ? { label, path } : { label });
  });
  return result;
}
