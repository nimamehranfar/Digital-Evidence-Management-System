import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldOff, Loader } from "lucide-react";

/**
 * Wraps routes with auth + optional role checks.
 *
 * redirect-back flow:
 *   - If not authenticated → Navigate to /login with { state: { from: location } }
 *   - LoginPage reads state.from and navigates there after a successful login
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, roles } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">Loading…</p>
      </div>
    );
  }

  if (!user) {
    // Remember where the user was trying to go
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  if (requiredRole && Array.isArray(requiredRole)) {
    const hasRole = requiredRole.some((r) => roles.includes(r));
    if (!hasRole) {
      return (
        <div className="page-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div className="card" style={{ textAlign: "center", maxWidth: 420, padding: "2.5rem" }}>
            <ShieldOff size={48} style={{ color: "var(--color-danger)", marginBottom: "1rem" }} />
            <h2 style={{ marginBottom: "0.5rem" }}>Access Denied</h2>
            <p style={{ color: "var(--color-text-secondary)" }}>
              Your role ({roles.join(", ") || "none"}) does not have permission to access this page.
            </p>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.75rem" }}>
              Required: {requiredRole.join(" or ")}
            </p>
          </div>
        </div>
      );
    }
  }

  return children;
}
