import { useLocation, useNavigate } from "react-router-dom";
import { Home, ChevronRight } from "lucide-react";

interface BreadcrumbSegment {
  label: string;
  path?: string;
}

function getBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const home: BreadcrumbSegment = { label: "HOME", path: "/" };

  if (pathname === "/") return [home, { label: "DASHBOARD" }];
  if (pathname === "/attendance") return [home, { label: "ATTENDANCE" }, { label: "EMPLOYEE ATTENDANCE" }];
  if (pathname === "/hr-analytics/attendance") return [home, { label: "ATTENDANCE" }, { label: "ATTENDANCE ADMIN" }];
  if (pathname === "/hr-analytics/leave") return [home, { label: "LEAVE MANAGEMENT" }, { label: "LEAVE ANALYTICS" }];
  if (pathname === "/leave") return [home, { label: "LEAVE MANAGEMENT" }, { label: "OVERVIEW" }];
  if (pathname === "/leave/apply") return [home, { label: "LEAVE MANAGEMENT", path: "/leave" }, { label: "LEAVE APPLICATION" }];
  if (pathname === "/leave/admin") return [home, { label: "LEAVE MANAGEMENT", path: "/leave" }, { label: "LEAVE APPROVALS" }];
  if (pathname === "/leave/forms") return [home, { label: "LEAVE MANAGEMENT", path: "/leave" }, { label: "MY LEAVE REQUESTS" }];
  if (pathname === "/employees") return [home, { label: "ADMINISTRATION" }, { label: "EMPLOYEE DIRECTORY" }];
  if (pathname === "/branches") return [home, { label: "ADMINISTRATION" }, { label: "BRANCHES" }];
  if (pathname === "/reports") return [home, { label: "REPORTS & ANALYTICS" }, { label: "REPORTS" }];
  if (pathname === "/analytics") return [home, { label: "REPORTS & ANALYTICS" }, { label: "EMPLOYEE ANALYTICS" }];
  if (pathname === "/settings") return [home, { label: "ADMINISTRATION" }, { label: "SETTINGS" }];
  if (pathname === "/calendar") return [home, { label: "CALENDAR" }];
  if (pathname === "/profile") return [home, { label: "PROFILE" }];
  if (pathname === "/master") return [home, { label: "ADMINISTRATION" }, { label: "OVERVIEW" }];
  if (pathname === "/master/department") return [home, { label: "ADMINISTRATION" }, { label: "DEPARTMENT" }];
  if (pathname.startsWith("/master/department/")) {
    const deptName = pathname.split("/").pop()?.replace(/-/g, " ").toUpperCase() || "DETAILS";
    return [home, { label: "ADMINISTRATION" }, { label: "DEPARTMENT", path: "/master/department" }, { label: deptName }];
  }
  if (pathname === "/master/designation") return [home, { label: "ADMINISTRATION" }, { label: "DESIGNATION" }];
  if (pathname === "/master/role") return [home, { label: "ADMINISTRATION" }, { label: "ROLE" }];

  const segments = pathname.split("/").filter(Boolean);
  const result: BreadcrumbSegment[] = [home];
  segments.forEach((seg, i) => {
    const label = seg.replace(/-/g, " ").toUpperCase();
    const path = "/" + segments.slice(0, i + 1).join("/");
    result.push(i < segments.length - 1 ? { label, path } : { label });
  });
  return result;
}

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  if (pathname === "/attendance") return "Employee Attendance";
  if (pathname === "/hr-analytics/attendance") return "Attendance Admin";
  if (pathname === "/hr-analytics/leave") return "Leave Analytics";
  if (pathname === "/leave") return "Leave Management";
  if (pathname === "/leave/apply") return "Leave Application";
  if (pathname === "/leave/admin") return "Leave Approvals";
  if (pathname === "/leave/forms") return "My Leave Requests";
  if (pathname === "/employees") return "Employee Directory";
  if (pathname === "/branches") return "Branches";
  if (pathname === "/reports") return "Reports & Analytics";
  if (pathname === "/analytics") return "Employee Analytics";
  if (pathname === "/settings") return "Settings";
  if (pathname === "/calendar") return "Work Calendar";
  if (pathname === "/profile") return "Profile";
  if (pathname === "/master") return "Administration";
  if (pathname === "/master/department") return "Department";
  if (pathname.startsWith("/master/department/")) {
    const name = pathname.split("/").pop()?.replace(/-/g, " ") || "Details";
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  if (pathname === "/master/designation") return "Designation";
  if (pathname === "/master/role") return "Role";
  const last = pathname.split("/").filter(Boolean).pop() || "Page";
  return last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PageHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const crumbs = getBreadcrumbs(location.pathname);
  const title = getPageTitle(location.pathname);

  return (
    <div className="flex flex-col mb-5 w-full">
      <h1 className="text-xl sm:text-2xl font-black text-foreground mb-1 leading-tight">{title}</h1>
      <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const isFirst = index === 0;
          return (
            <span key={index} className="flex items-center gap-1">
              {isFirst && (
                <Home
                  className="w-3 h-3 text-muted-foreground/60 shrink-0 cursor-pointer hover:text-[#7B0099] transition-colors"
                  onClick={() => navigate("/")}
                />
              )}
              {isLast ? (
                <span className="text-[10px] sm:text-[11px] font-bold text-[#7B0099] dark:text-purple-400 uppercase tracking-widest">
                  {crumb.label}
                </span>
              ) : (
                <span
                  onClick={crumb.path ? () => navigate(crumb.path!) : undefined}
                  className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-colors ${
                    crumb.path
                      ? "text-muted-foreground hover:text-foreground cursor-pointer"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {crumb.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
