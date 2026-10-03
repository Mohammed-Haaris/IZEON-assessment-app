import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { StudentDashboard } from "./pages/StudentDashboard";
import { AssessmentRound1 } from "./pages/AssessmentRound1";
import { AssessmentRound2 } from "./pages/AssessmentRound2";
import { AdminDashboard } from "./pages/AdminDashboard";

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-slate-400">
        Authenticating...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "ADMIN") return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
};

export function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 font-sans antialiased selection:bg-[#16499c] selection:text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Student Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assessment/round1"
                element={
                  <ProtectedRoute>
                    <AssessmentRound1 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assessment/round2"
                element={
                  <ProtectedRoute>
                    <AssessmentRound2 />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
