import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requiredRole }) {
    const { user, loading, hasPermission } = useAuth();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && !hasPermission(requiredRole)) {
        return (
            <div className="access-denied">
                <div className="access-denied-content">
                    <h1>Access Denied</h1>
                    <p>You don't have permission to view this page.</p>
                    <Navigate to="/dashboard" replace />
                </div>
            </div>
        );
    }

    return children;
}