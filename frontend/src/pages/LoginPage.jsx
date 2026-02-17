import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { USE_MOCK } from "../api/config";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mockRole, setMockRole] = useState("detective");
  const [mockDept, setMockDept] = useState("dept-1");
  const [mockName, setMockName] = useState("Mock User");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [user]);

  async function onLogin() {
    setError("");
    try {
      if (USE_MOCK) {
        await login({
          name: mockName,
          roles: [mockRole],
          department: mockRole === "case_officer" ? mockDept : null,
        });
      } else {
        await login(); // MSAL redirect
      }
    } catch (e) {
      setError(e.message || "Login failed");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Digital Evidence Management System</h1>
        <p className="muted">
          {USE_MOCK
            ? "Mock mode: select a role to simulate /api/auth/me."
            : "Sign in with Microsoft Entra ID (Workforce)."}
        </p>

        {error ? (
          <div className="alert alert-error" style={{ marginTop: "1rem" }}>
            {error}
          </div>
        ) : null}

        {USE_MOCK ? (
          <div style={{ marginTop: "1rem" }}>
            <div className="form-group">
              <label>Display name</label>
              <input value={mockName} onChange={(e) => setMockName(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select value={mockRole} onChange={(e) => setMockRole(e.target.value)}>
                <option value="admin">admin (governance only)</option>
                <option value="detective">detective (full CRUD)</option>
                <option value="case_officer">case_officer (dept scoped)</option>
                <option value="prosecutor">prosecutor (read-only)</option>
              </select>
            </div>

            {mockRole === "case_officer" ? (
              <div className="form-group">
                <label>Department (case_officer)</label>
                <input value={mockDept} onChange={(e) => setMockDept(e.target.value)} placeholder="dept-1" />
              </div>
            ) : null}

            <button className="btn btn-primary" onClick={onLogin} disabled={loading}>
              Continue
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={onLogin} disabled={loading} style={{ marginTop: "1rem" }}>
            Sign in with Microsoft
          </button>
        )}

        <p className="muted" style={{ marginTop: "1rem" }}>
          Closed system: no self-registration. Accounts are created/invited by administrators in Entra ID.
        </p>
      </div>
    </div>
  );
}
