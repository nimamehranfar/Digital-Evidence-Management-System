import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Shield, AlertCircle } from "lucide-react";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const user = await login(username, password);

            // Redirect based on role
            if (user.role === "admin") {
                navigate("/users");
            } else {
                navigate("/dashboard");
            }
        } catch (err) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <Shield size={48} className="login-logo" />
                    <h1>Digital Evidence System</h1>
                    <p>Secure authentication required</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="alert alert-error">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={loading}
                    >
                        {loading ? "Authenticating..." : "Sign In"}
                    </button>
                </form>

                <div className="login-footer">
                    <div className="demo-credentials">
                        <h3>Demo Credentials:</h3>

                        <div className="credential-item">
                            <strong>Admin (System Management):</strong> admin / admin123
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: '1rem', marginBottom: '0.5rem' }}>
                            Manages users, roles, departments. NO investigative access.
                        </div>

                        <div className="credential-item">
                            <strong>Detective (Full Access):</strong> detective / detective123
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: '1rem', marginBottom: '0.5rem' }}>
                            Cross-department investigative access. Can create/edit/delete cases.
                        </div>

                        <div className="credential-item">
                            <strong>Case Officer (Department-Limited):</strong> officer_hq / officer123
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: '1rem', marginBottom: '0.5rem' }}>
                            Can investigate cases only within their department.
                        </div>

                        <div className="credential-item">
                            <strong>Prosecutor (Read-Only):</strong> prosecutor / prosecutor123
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: '1rem', marginBottom: '0.5rem' }}>
                            View-only access to all cases and evidence. Legal review.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}