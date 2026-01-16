import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CaseProvider } from "./context/CaseContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CasesPage from "./pages/CasesPage";
import CaseDetailPage from "./pages/CaseDetailPage";
import UploadPage from "./pages/UploadPage";
import SearchPage from "./pages/SearchPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import UsersPage from "./pages/UsersPage";
import ProfilePage from "./pages/ProfilePage";
import "./styles/main.css";

export default function App() {
  return (
      <AuthProvider>
        <CaseProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="cases" element={
                  <ProtectedRoute requiredRole={["detective", "prosecutor", "case_officer"]}>
                    <CasesPage />
                  </ProtectedRoute>} />
                <Route path="cases/:caseId" element={
                  <ProtectedRoute requiredRole={["detective", "prosecutor", "case_officer"]}>
                    <CaseDetailPage />
                  </ProtectedRoute>} />
                <Route path="upload" element={
                  <ProtectedRoute requiredRole={["detective", "case_officer"]}>
                    <UploadPage />
                  </ProtectedRoute>} />
                <Route path="search" element={
                  <ProtectedRoute requiredRole={["detective", "prosecutor", "case_officer"]}>
                    <SearchPage />
                  </ProtectedRoute>} />
                <Route path="analytics" element={
                  <ProtectedRoute requiredRole={["detective", "prosecutor"]}>
                    <AnalyticsPage />
                  </ProtectedRoute>
                } />
                <Route path="users" element={
                  <ProtectedRoute requiredRole={["admin"]}>
                    <UsersPage />
                  </ProtectedRoute>
                } />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </CaseProvider>
      </AuthProvider>
  );
}