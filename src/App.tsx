import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppLayout from "@/components/layout/AppLayout";

import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import LeaveOverview from "./pages/LeaveOverview";
import LeaveManagement from "./pages/LeaveManagement"; // Ini adalah file borang Rayhar anda
import LeaveAdmin from "./pages/LeaveAdmin";
import LeaveFormView from "./pages/LeaveFormView";
import Employees from "./pages/Employees";
import Branches from "./pages/Branches";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import RealTimeCalendar from "@/components/RealTimeCalendar";

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
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/attendance" element={<Attendance />} />

          {/* LEAVE SYSTEM FLOW */}
          {/* 1. Dashboard Cuti & Sejarah (Image 1 anda) */}
          <Route path="/leave" element={<LeaveOverview />} />

          {/* 2. Borang Permohonan Multi-step (Kod Rayhar) */}
          <Route path="/leave/apply" element={<LeaveManagement />} />

          {/* 3. Panel Kelulusan Admin */}
          <Route path="/leave/admin" element={<LeaveAdmin />} />

          {/* 4. Leave Form Application (View/Print own forms) */}
          <Route path="/leave/forms" element={<LeaveFormView />} />

          <Route path="/employees" element={<Employees />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/calendar" element={<RealTimeCalendar />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
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
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<AuthRoute />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;