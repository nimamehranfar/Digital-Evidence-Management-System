import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, roles } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-container">
        <div className="card">
          <h2>Loading…</h2>
          <p>Checking session and permissions.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && Array.isArray(requiredRole)) {
    const ok = requiredRole.some((r) => roles.includes(r));
    if (!ok) {
      return (
        <div className="page-container">
          <div className="card">
            <h2>Not authorized</h2>
            <p>Your role does not allow access to this page.</p>
          </div>
        </div>
      );
    }
  }

  return children;
}
