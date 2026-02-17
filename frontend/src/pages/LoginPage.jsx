import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { USE_MOCK } from "../api/config";
import { msalInstance } from "../auth/msalInstance";

export default function LoginPage() {
  const { user, login, logout, loading, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mockRole, setMockRole] = useState("detective");
  const [mockDept, setMockDept] = useState("dept-1");
  const [mockName, setMockName] = useState("Mock User");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const hasCachedMsalAccount = !USE_MOCK && msalInstance.getAllAccounts().length > 0;

  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [user]);

  // If we have a cached MSAL account but /api/auth/me failed, show the reason.
  useEffect(() => {
    if (!user && authError) setError(authError);
  }, [authError]);

  async function onLogin() {
    setError("");
    setBusy(true);
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
      setBusy(false);
    }
  }

  async function onLogoutAndRetry() {
    setError("");
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
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

        {!USE_MOCK && hasCachedMsalAccount && !user ? (
          <div className="alert" style={{ marginTop: "1rem" }}>
            <strong>Microsoft sign-in detected</strong>
            <div className="muted" style={{ marginTop: ".5rem" }}>
              You have a cached Microsoft account, but the app could not load <code>/api/auth/me</code>.
              This usually means the API token could not be minted for the correct tenant/scope, or the backend rejected it.
            </div>
            <div style={{ display: "flex", gap: ".5rem", marginTop: "1rem", flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={onLogin} disabled={loading || busy}>
                Try sign-in again
              </button>
              <button className="btn" onClick={onLogoutAndRetry} disabled={loading || busy}>
                Sign out
              </button>
            </div>
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

            <button className="btn btn-primary" onClick={onLogin} disabled={loading || busy}>
              Continue
            </button>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            onClick={onLogin}
            disabled={loading || busy}
            style={{ marginTop: "1rem" }}
            title={busy ? "Sign-in is starting..." : ""}
          >
            {busy ? "Starting sign-in…" : "Sign in with Microsoft"}
          </button>
        )}

        <p className="muted" style={{ marginTop: "1rem" }}>
          Closed system: no self-registration. Accounts are created/invited by administrators in Entra ID.
        </p>
      </div>
    </div>
  );
}
