import { useLocation, useNavigate } from "react-router-dom";

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

  // Convert all-caps labels to Title Case for the breadcrumb display
  const toTitleCase = (str: string) =>
    str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  return (
    <div className="w-full pb-4 border-b border-gray-200 dark:border-white/10 mb-2 mt-4">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
        {title}
      </h1>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <span key={index} className="flex items-center gap-2">
              {isLast ? (
                <span className="text-gray-800 dark:text-gray-200 font-medium">
                  {toTitleCase(crumb.label)}
                </span>
              ) : (
                <span
                  onClick={crumb.path ? () => navigate(crumb.path!) : undefined}
                  className={`transition-colors ${
                    crumb.path
                      ? "hover:underline cursor-pointer"
                      : ""
                  }`}
                >
                  {toTitleCase(crumb.label)}
                </span>
              )}
              {!isLast && (
                <span className="text-gray-400 select-none">
                  &gt;
                </span>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}

