import { sanitizeInternalPath } from "@/utils/security";

export interface BreadcrumbSegment {
  label: string;
  path?: string;
}

export function getBreadcrumbs(rawPathname: string, rawSearch?: string, _role?: string): BreadcrumbSegment[] {
  const pathname = typeof rawPathname === "string" ? rawPathname : "/";
  const search = typeof rawSearch === "string" ? rawSearch : "";
  const home: BreadcrumbSegment = { label: "HOME", path: "/" };

  if (pathname === "/") return [home, { label: "MY WORKSPACE" }, { label: "DASHBOARD" }];

  // Calendar Pages
  if (pathname === "/calendar") return [home, { label: "CALENDAR", path: "/calendar" }, { label: "WORK CALENDAR" }];
  if (pathname === "/calendar/company-leave") {
    return [home, { label: "CALENDAR", path: "/calendar" }, { label: "COMPANY LEAVE CALENDAR" }];
  }

  // Attendance Pages
  if (pathname === "/attendance") return [home, { label: "MY WORKSPACE" }, { label: "MY ATTENDANCE" }];
  if (pathname === "/team-attendance" || pathname === "/attendance/team") return [home, { label: "ATTENDANCE" }, { label: "TEAM ATTENDANCE" }];

  // Leave Pages (Personal & Team)
  if (pathname === "/leave/team") return [home, { label: "APPROVAL CENTER", path: "/leave/admin" }, { label: "TEAM LEAVE REQUESTS" }];
  if (pathname === "/leave") return [home, { label: "MY LEAVE" }, { label: "LEAVE OVERVIEW" }];
  if (pathname === "/leave/apply") return [home, { label: "MY LEAVE", path: "/leave" }, { label: "LEAVE APPLICATION" }];
  if (pathname === "/leave/forms") return [home, { label: "MY LEAVE", path: "/leave" }, { label: "MY LEAVE REQUESTS" }];

  // Outstation Pages (Personal vs Operations)
  if (pathname === "/outstation/my-calendar" || pathname === "/outstation/my_calendar") {
    return [home, { label: "MY OUTSTATION", path: "/outstation/my" }, { label: "MY OUTSTATION CALENDAR" }];
  }
  if (pathname === "/outstation/my") return [home, { label: "MY OUTSTATION", path: "/outstation/my" }, { label: "MY OUTSTATION" }];
  if (pathname === "/outstation") return [home, { label: "OUTSTATION OPERATIONS", path: "/outstation" }, { label: "OUTSTATION DASHBOARD" }];
  if (pathname === "/outstation/assignment") return [home, { label: "OUTSTATION OPERATIONS", path: "/outstation" }, { label: "OUTSTATION ASSIGNMENT" }];
  if (pathname === "/outstation/calendar") return [home, { label: "OUTSTATION OPERATIONS", path: "/outstation" }, { label: "OUTSTATION CALENDAR" }];
  if (pathname === "/outstation/analytics") return [home, { label: "OUTSTATION OPERATIONS", path: "/outstation" }, { label: "OUTSTATION ANALYTICS" }];
  if (pathname === "/outstation/reports") return [home, { label: "REPORTS", path: "/reports" }, { label: "OUTSTATION REPORTS" }];

  // Personal Analytics
  if (pathname === "/analytics") return [home, { label: "MY WORKSPACE" }, { label: "MY ANALYTICS" }];

  // Leave Administration Pages
  if (pathname === "/leave/admin") return [home, { label: "LEAVE ADMINISTRATION", path: "/leave/admin" }, { label: "LEAVE APPROVAL" }];
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
          { label: module.toUpperCase().replace(/-/g, " ") }
        ];
      }
    }
    return [home, { label: "LEAVE ADMINISTRATION", path: "/leave/admin" }, { label: "LEAVE ENTITLEMENT MANAGEMENT" }];
  }

  // People & Workforce Pages
  if (pathname === "/employees") return [home, { label: "PEOPLE & WORKFORCE", path: "/employees" }, { label: "EMPLOYEE DIRECTORY" }];
  if (pathname === "/branches/temporary-assignment" || pathname === "/branches/temporary-assignments") {
    return [home, { label: "PEOPLE & WORKFORCE", path: "/employees" }, { label: "TEMPORARY ASSIGNMENTS" }];
  }
  if (pathname.startsWith("/master/department/")) {
    return [home, { label: "COMPANY SETUP" }, { label: "DEPARTMENTS", path: "/organization/departments" }, { label: "DEPARTMENT OVERVIEW" }];
  }

  // GPS Location Tracker
  if (pathname === "/gps-location-tracker") return [home, { label: "HR ADMINISTRATION" }, { label: "GPS LIVE TRACKER" }];
  if (pathname === "/gps-location-tracker/history") return [home, { label: "GPS LOCATION TRACKER" }, { label: "LOCATION HISTORY" }];

  // Workforce Analytics Pages
  if (pathname === "/hr-analytics/attendance") return [home, { label: "WORKFORCE ANALYTICS", path: "/hr-analytics/attendance" }, { label: "ATTENDANCE DASHBOARD" }];
  if (pathname === "/hr-analytics/leave") return [home, { label: "WORKFORCE ANALYTICS", path: "/hr-analytics/attendance" }, { label: "LEAVE ANALYTICS" }];
  if (pathname === "/hr-analytics/workforce") return [home, { label: "WORKFORCE ANALYTICS", path: "/hr-analytics/attendance" }, { label: "WORKFORCE INSIGHTS" }];
  if (pathname === "/hr-analytics/calendar") return [home, { label: "WORKFORCE ANALYTICS", path: "/hr-analytics/attendance" }, { label: "WORKFORCE CALENDAR" }];

  // Reports Pages
  if (pathname === "/reports") return [home, { label: "REPORTS" }, { label: "WORKFORCE REPORTS & ANALYTICS" }];
  if (pathname === "/reports/attendance") return [home, { label: "REPORTS", path: "/reports" }, { label: "ATTENDANCE REPORTS" }];
  if (pathname === "/reports/leave") return [home, { label: "REPORTS", path: "/reports" }, { label: "LEAVE REPORTS" }];
  if (pathname === "/reports/department") return [home, { label: "REPORTS", path: "/reports" }, { label: "DEPARTMENT & BRANCH REPORTS" }];

  // Company Setup vs Group & Entities Pages
  if (pathname.startsWith("/organization")) {
    if (pathname === "/organization/branches" || pathname.endsWith("/branches")) {
      return [home, { label: "COMPANY SETUP" }, { label: "BRANCHES & GEOFENCE" }];
    }
    if (pathname === "/organization/departments" || pathname.endsWith("/departments")) {
      return [home, { label: "COMPANY SETUP" }, { label: "DEPARTMENTS" }];
    }
    if (pathname === "/organization/roles" || pathname.endsWith("/roles")) {
      return [home, { label: "COMPANY SETUP" }, { label: "ROLES & PERMISSIONS (RBAC)" }];
    }
    if (pathname === "/organization/transfer" || pathname.endsWith("/transfer")) {
      return [
        home,
        { label: "GROUP & ENTITIES", path: "/organization/entities" },
        { label: "INTER-COMPANY TRANSFERS", path: "/organization/transfer" },
        { label: "TRANSFER WIZARD" }
      ];
    }
    if (pathname === "/organization/history" || pathname.endsWith("/history")) {
      return [
        home,
        { label: "GROUP & ENTITIES", path: "/organization/entities" },
        { label: "INTER-COMPANY TRANSFERS", path: "/organization/transfer" },
        { label: "CAREER HISTORY" }
      ];
    }
    if (pathname === "/organization/modules" || pathname.endsWith("/modules")) {
      return [home, { label: "GROUP & ENTITIES", path: "/organization/entities" }, { label: "COMPANY MODULES" }];
    }
    return [home, { label: "GROUP & ENTITIES", path: "/organization/entities" }, { label: "COMPANY ENTITIES" }];
  }

  // Settings Page (under Company Setup)
  if (pathname === "/settings") {
    const base: BreadcrumbSegment[] = [home, { label: "COMPANY SETUP" }, { label: "SETTINGS", path: "/settings" }];
    if (search) {
      const params = new URLSearchParams(search);
      const tab = (params.get("tab") || "").toLowerCase();
      if (tab) {
        let tabLabel = tab.toUpperCase();
        if (tab === "attendance") tabLabel = "ATTENDANCE CONFIG";
        else if (tab === "schedule") tabLabel = "WORK SCHEDULES";
        else if (tab === "leave") tabLabel = "LEAVE & APPROVALS";
        else if (tab === "system") tabLabel = "SYSTEM ACTIVITY";
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
    const path = sanitizeInternalPath("/" + segments.slice(0, i + 1).join("/"), "/");
    result.push(i < segments.length - 1 ? { label, path } : { label });
  });
  return result;
}
