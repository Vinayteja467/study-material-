import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, ProtectedRoute, RoleRoute, useAuth } from './context/AuthContext.jsx';
import { Sidebar } from './components/Sidebar.jsx';

// Pages
import { Login } from './pages/Login.jsx';
import { Unauthorized } from './pages/Unauthorized.jsx';
import { TeacherDashboard } from './pages/TeacherDashboard.jsx';
import { StudentDashboard } from './pages/StudentDashboard.jsx';
import { TeacherMaterials } from './pages/TeacherMaterials.jsx';
import { TeacherStudents } from './pages/TeacherStudents.jsx';
import { WorkspaceSelector } from './pages/WorkspaceSelector.jsx';
import { AIWorkspace } from './pages/AIWorkspace.jsx';
import { Attendance } from './pages/Attendance.jsx';
import { Analytics } from './pages/Analytics.jsx';
import { AdminDashboard } from './pages/AdminDashboard.jsx';
import { MockTestSystem } from './pages/MockTestSystem.jsx';
import { LandingPage } from './pages/LandingPage.jsx';

// Initialize React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// App Main Layout including Sidebar
const DashboardLayout = () => {
  const { role } = useAuth();
  return (
    <div className="flex bg-[#FFF8F0] min-h-screen font-poppins text-slate-800">
      <Sidebar role={role} />
      <main className="flex-grow h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Entry Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Dynamic Routes */}
            <Route element={<ProtectedRoute />}>
              
              {/* Full-Screen Workspaces (Maximum real estate for PDF rendering) */}
              <Route path="/workspace/:materialId" element={<AIWorkspace />} />

              {/* Sidebar Contained Workspaces */}
              <Route element={<DashboardLayout />}>
                
                {/* Dashboards branched by User Role */}
                <Route
                  path="/dashboard"
                  element={
                    <RoleRoute
                      teacherComponent={TeacherDashboard}
                      studentComponent={StudentDashboard}
                    />
                  }
                />
                
                {/* Shared Materials Archive */}
                <Route path="/materials" element={<TeacherMaterials />} />
                
                {/* Workspace list selector */}
                <Route path="/workspace" element={<WorkspaceSelector />} />

                {/* Shared Attendance Tracker */}
                <Route path="/attendance" element={<Attendance />} />

                {/* Shared Analytics Panel */}
                <Route path="/analytics" element={<Analytics />} />

                {/* Shared Mock timed evaluations listing & exams */}
                <Route path="/tests" element={<MockTestSystem />} />

                {/* Teacher-only pages */}
                <Route element={<ProtectedRoute requiredRole="Teacher" />}>
                  <Route path="/teacher" element={<TeacherDashboard />} />
                  <Route path="/students" element={<TeacherStudents />} />
                </Route>

                {/* Student-only pages */}
                <Route element={<ProtectedRoute requiredRole="Student" />}>
                  <Route path="/student" element={<StudentDashboard />} />
                </Route>

                {/* Admin-only pages */}
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>

              </Route>

            </Route>

            {/* Fallback Catch */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
