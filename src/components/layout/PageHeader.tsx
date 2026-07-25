import { useLocation, useNavigate } from "react-router-dom";

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  if (pathname === "/attendance") return "Employee Attendance";
  if (pathname === "/hr-analytics/attendance") return "Attendance Admin";
  if (pathname === "/hr-analytics/leave") return "Leave Analytics";
  if (pathname === "/leave") return "Leave Management";
  if (pathname === "/leave/apply") return "Leave Application";
  if (pathname === "/leave/admin") return "Leave Approvals";
  if (pathname === "/leave/entitlement") return "Leave Entitlement Management";
  if (pathname === "/leave/forms") return "My Leave Requests";
  if (pathname === "/employees") return "Employee Directory";
  if (pathname === "/branches") return "Branches";
  if (pathname === "/reports") return "Reports & Analytics";
  if (pathname === "/reports/department") return "Department & Branch Report";
  if (pathname === "/analytics") return "Employee Analytics";
  if (pathname === "/settings") return "Settings";
  if (pathname === "/calendar") return "Work Calendar";
  if (pathname === "/calendar/company-leave") return "Company Leave Calendar";
  if (pathname === "/profile") return "Profile";
  if (pathname === "/master") return "Administration";
  if (pathname === "/master/department") return "Department";
  if (pathname.startsWith("/master/department/")) {
    const name = pathname.split("/").pop()?.replace(/-/g, " ") || "Details";
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  if (pathname === "/master/designation") return "Designation";
  if (pathname === "/master/role") return "Role";
  if (pathname === "/outstation") return "Outstation Dashboard";
  if (pathname === "/outstation/assignment") return "Outstation Assignment";
  if (pathname === "/outstation/my") return "My Outstation";
  if (pathname === "/outstation/calendar") return "Outstation Calendar";
  if (pathname === "/outstation/analytics") return "Outstation Analytics";
  if (pathname === "/outstation/reports") return "Outstation Reports";
  if (pathname === "/leave/calendar") return "Leave Calendar";
  if (pathname === "/hr-analytics/calendar") return "Workforce Calendar";
  const last = pathname.split("/").filter(Boolean).pop() || "Page";
  return last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PageHeader() {
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <div className="w-full pb-4 border-b border-gray-200 dark:border-white/10 mb-2 mt-2 flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
          {title}
        </h1>
      </div>
      <div id="page-header-actions" className="flex items-center gap-2"></div>
    </div>
  );
}

