import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppLayout from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import LeaveOverview from "./pages/LeaveOverview";
import LeaveManagement from "./pages/LeaveManagement";
import LeaveAdmin from "./pages/LeaveAdmin";
import LeaveCalendar from "./pages/LeaveCalendar";
import LeaveAnalytics from "./pages/LeaveAnalytics";
import EmployeeAnalytics from "./pages/EmployeeAnalytics";
import LeaveFormView from "./pages/LeaveFormView";
import Employees from "./pages/Employees";
import Branches from "./pages/Branches";
import TemporaryAssignments from "./pages/TemporaryAssignments";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import SettingsPage from "./pages/Settings";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import CalendarPage from "./pages/Calendar";
import MasterPlaceholder from "./pages/master/Placeholder";
import Department from "./pages/master/Department";
import DepartmentDetails from "./pages/master/DepartmentDetails";
import MasterOverview from "./pages/master/Overview";
import LeaveEntitlementManagement from "./pages/master/LeaveEntitlementManagement";
import Role from "./pages/master/Role";
import AttendanceDashboard from "./pages/hr-analytics/AttendanceDashboard";
import TeamAttendance from "./pages/TeamAttendance";
import TeamLeaveRequests from "./pages/TeamLeaveRequests";
import WorkforceInsights from "./pages/hr-analytics/WorkforceInsights";
import WorkforceCalendar from "./pages/hr-analytics/WorkforceCalendar";
import AttendanceReports from "./pages/reports/AttendanceReports";
import LeaveReports from "./pages/reports/LeaveReports";
import DepartmentReports from "./pages/reports/DepartmentReports";
import CompanyLeaveCalendar from "./pages/CompanyLeaveCalendar";
import OutstationDashboard from "./pages/outstation/OutstationDashboard";
import OutstationAssignment from "./pages/outstation/OutstationAssignment";
import MyOutstation from "./pages/outstation/MyOutstation";
import OutstationCalendar from "./pages/outstation/OutstationCalendar";
import OutstationAnalytics from "./pages/outstation/OutstationAnalytics";
import OutstationReports from "./pages/outstation/OutstationReports";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <RoleProvider>
      <ErrorBoundary>
        <AppLayout>
          <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/calendar/company-leave" element={<CompanyLeaveCalendar />} />

          {/* LEAVE SYSTEM FLOW */}
          <Route path="/leave" element={<LeaveOverview />} />
          <Route path="/leave/apply" element={<LeaveManagement />} />
          <Route path="/leave/admin" element={<LeaveAdmin />} />
          <Route path="/leave/calendar" element={<LeaveCalendar />} />
          <Route path="/leave/entitlement" element={<LeaveEntitlementManagement />} />
          <Route path="/leave/forms" element={<LeaveFormView />} />

          <Route path="/employees" element={<Employees />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/branches/temporary-assignments" element={<TemporaryAssignments />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/analytics" element={<EmployeeAnalytics />} />
          <Route path="/hr-analytics" element={<Navigate to="/hr-analytics/attendance" replace />} />
          <Route path="/hr-analytics/attendance" element={<AttendanceDashboard />} />
          <Route path="/hr-analytics/leave" element={<LeaveAnalytics />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/calendar" element={<CalendarPage />} />

          {/* Team-specific routes for Branch Leader / HOD */}
          <Route path="/team-attendance" element={<TeamAttendance />} />
          <Route path="/leave/team" element={<TeamLeaveRequests />} />
          <Route path="/hr-analytics/workforce" element={<WorkforceInsights />} />
          <Route path="/hr-analytics/calendar" element={<WorkforceCalendar />} />
          <Route path="/reports/attendance" element={<AttendanceReports />} />
          <Route path="/reports/leave" element={<LeaveReports />} />
          <Route path="/reports/department" element={<DepartmentReports />} />

          {/* Master Section */}
          <Route path="/master" element={<MasterOverview />} />
          <Route path="/master/department" element={<Department />} />
          <Route path="/master/department/:deptName" element={<DepartmentDetails />} />
          <Route path="/master/leave-entitlement" element={<LeaveEntitlementManagement />} />
          <Route path="/master/designation" element={<MasterPlaceholder title="Designation" />} />
          <Route path="/master/role" element={<Role />} />

          {/* Outstation Management */}
          <Route path="/outstation" element={<OutstationDashboard />} />
          <Route path="/outstation/assignment" element={<OutstationAssignment />} />
          <Route path="/outstation/my" element={<MyOutstation />} />
          <Route path="/outstation/calendar" element={<OutstationCalendar />} />
          <Route path="/outstation/analytics" element={<OutstationAnalytics />} />
          <Route path="/outstation/reports" element={<OutstationReports />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
      </ErrorBoundary>
    </RoleProvider>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Analytics />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<AuthRoute />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
