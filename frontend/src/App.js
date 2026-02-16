import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CaseProvider } from "./context/CaseContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import CasesPage from "./pages/CasesPage";
import CaseDetailPage from "./pages/CaseDetailPage";
import UploadPage from "./pages/UploadPage";
import SearchPage from "./pages/SearchPage";
import UsersPage from "./pages/UsersPage";
import ProfilePage from "./pages/ProfilePage";

import "./styles/main.css";

function HomeRedirect() {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/departments" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <CaseProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomeRedirect />} />

              {/* Governance (admin) and read-only for investigative roles */}
              <Route
                path="departments"
                element={
                  <ProtectedRoute requiredRole={["admin", "detective", "case_officer", "prosecutor"]}>
                    <DepartmentsPage />
                  </ProtectedRoute>
                }
              />

              {/* Investigative pages (admin must be blocked) */}
              <Route
                path="dashboard"
                element={<ProtectedRoute requiredRole={["detective", "case_officer", "prosecutor"]}><DashboardPage /></ProtectedRoute>}
              />
              <Route
                path="cases"
                element={<ProtectedRoute requiredRole={["detective", "case_officer", "prosecutor"]}><CasesPage /></ProtectedRoute>}
              />
              <Route
                path="cases/:caseId"
                element={<ProtectedRoute requiredRole={["detective", "case_officer", "prosecutor"]}><CaseDetailPage /></ProtectedRoute>}
              />
              <Route
                path="upload"
                element={<ProtectedRoute requiredRole={["detective", "case_officer"]}><UploadPage /></ProtectedRoute>}
              />
              <Route
                path="search"
                element={<ProtectedRoute requiredRole={["detective", "case_officer", "prosecutor"]}><SearchPage /></ProtectedRoute>}
              />

              {/* Admin only */}
              <Route path="users" element={<ProtectedRoute requiredRole={["admin"]}><UsersPage /></ProtectedRoute>} />

              {/* Everyone */}
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CaseProvider>
    </AuthProvider>
  );
}
