import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CaseProvider } from "./context/CaseContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import LoginPage      from "./pages/LoginPage";
import DashboardPage  from "./pages/DashboardPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import CasesPage      from "./pages/CasesPage";
import CaseDetailPage from "./pages/CaseDetailPage";
import UploadPage     from "./pages/UploadPage";
import SearchPage     from "./pages/SearchPage";
import UsersPage      from "./pages/UsersPage";
import ProfilePage    from "./pages/ProfilePage";

import "./styles/main.css";

/**
 * After a successful login, redirect to wherever the user originally wanted to go.
 * ProtectedRoute stores the attempted path in location.state.from.
 * If there's no remembered path, fall back to the role default.
 */
function HomeRedirect() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Respect redirect-back state passed by ProtectedRoute
  const from = location.state?.from;
  if (from && from.pathname && from.pathname !== "/" && from.pathname !== "/login") {
    return <Navigate to={from} replace />;
  }

  if (isAdmin) return <Navigate to="/departments" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <CaseProvider>
        <BrowserRouter>
          <Routes>
            {/* Public route — login page handles already-authenticated users */}
            <Route path="/login" element={<LoginPage />} />

            {/* All protected pages share the Layout shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomeRedirect />} />

              {/* Departments: governance for admin, read for investigative roles */}
              <Route
                path="departments"
                element={
                  <ProtectedRoute requiredRole={["admin", "detective", "case_officer", "prosecutor"]}>
                    <DepartmentsPage />
                  </ProtectedRoute>
                }
              />

              {/* Investigative pages — admin is explicitly blocked */}
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute requiredRole={["detective", "case_officer", "prosecutor"]}>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="cases"
                element={
                  <ProtectedRoute requiredRole={["detective", "case_officer", "prosecutor"]}>
                    <CasesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="cases/:caseId"
                element={
                  <ProtectedRoute requiredRole={["detective", "case_officer", "prosecutor"]}>
                    <CaseDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="upload"
                element={
                  <ProtectedRoute requiredRole={["detective", "case_officer"]}>
                    <UploadPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="search"
                element={
                  <ProtectedRoute requiredRole={["detective", "case_officer", "prosecutor"]}>
                    <SearchPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin only */}
              <Route
                path="users"
                element={
                  <ProtectedRoute requiredRole={["admin"]}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />

              {/* Everyone who is authenticated */}
              <Route
                path="profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all → home redirect (handles /dashboard, /cases etc on hard reload) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CaseProvider>
    </AuthProvider>
  );
}
