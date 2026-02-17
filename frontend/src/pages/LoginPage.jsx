import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { USE_MOCK } from "../api/config";
import { Shield, AlertCircle, RefreshCw, LogOut, Loader } from "lucide-react";

export default function LoginPage() {
  const { user, loading, authError, login, logout, retryAuth, isAdmin } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [signing, setSigning]   = useState(false);
  const [mockRole, setMockRole] = useState("detective");
  const [mockDept, setMockDept] = useState("Homicide");

  // Where to go after a successful login
  const from = location.state?.from;
  const intendedPath =
    from && from.pathname && from.pathname !== "/login"
      ? from
      : null;

  // --------------------------------------------------------------------------
  // If the user is already logged in, send them to the right place immediately
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!loading && user) {
      if (intendedPath) {
        navigate(intendedPath, { replace: true });
      } else if (isAdmin) {
        navigate("/departments", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, loading, isAdmin, navigate, intendedPath]);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------
  async function handleLogin() {
    if (signing) return;
    setSigning(true);
    try {
      if (USE_MOCK) {
        // mockAuthApi.login expects { name, roles: string[], department }
        await login({
          name: mockRole.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) + " (Demo)",
          roles: [mockRole],
          department: mockRole === "case_officer" ? mockDept : undefined,
        });
        // AuthContext sets user → useEffect above will navigate
      } else {
        await login(); // triggers MSAL redirect — this page navigates away
      }
    } catch (e) {
      setSigning(false);
    }
  }

  async function handleLogout() {
    try { await logout(); } catch (_) {}
  }

  async function handleRetry() {
    setSigning(false);
    retryAuth();
  }

  // --------------------------------------------------------------------------
  // Determine what to show
  // --------------------------------------------------------------------------
  // MSAL account exists but /api/auth/me failed
  const hasError = Boolean(authError);

  // True while MSAL redirect is in flight (page will navigate away soon)
  const redirectInFlight = signing && !USE_MOCK;

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <div className="login-logo"><Shield size={48} /></div>
            <h1>Digital Evidence System</h1>
          </div>
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <Loader size={32} className="spinner" style={{ color: "var(--color-primary)" }} />
            <p style={{ marginTop: "1rem", color: "var(--color-text-secondary)" }}>
              Checking session…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <Shield size={48} />
          </div>
          <h1>Digital Evidence System</h1>
          <p className="login-subtitle">
            {USE_MOCK ? "Demo mode — select a role to continue" : "Secure access — authorised personnel only"}
          </p>
        </div>

        {/* Error state */}
        {hasError && (
          <div className="auth-error-box">
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="auth-error-title">Sign-in issue</p>
              <p className="auth-error-body">{authError}</p>
            </div>
          </div>
        )}

        {/* Redirect in flight */}
        {redirectInFlight && (
          <div className="auth-info-box">
            <Loader size={20} className="spinner" style={{ flexShrink: 0 }} />
            <p>Redirecting to Microsoft sign-in…</p>
          </div>
        )}

        {/* Mock role picker */}
        {USE_MOCK && !redirectInFlight && (
          <div className="mock-picker">
            <label className="form-label">Role</label>
            <select
              className="form-select"
              value={mockRole}
              onChange={(e) => setMockRole(e.target.value)}
            >
              <option value="detective">Detective (full access)</option>
              <option value="case_officer">Case Officer (department-scoped)</option>
              <option value="prosecutor">Prosecutor (read-only)</option>
              <option value="admin">Admin (governance only)</option>
            </select>

            {mockRole === "case_officer" && (
              <>
                <label className="form-label" style={{ marginTop: "0.75rem" }}>Department</label>
                <select
                  className="form-select"
                  value={mockDept}
                  onChange={(e) => setMockDept(e.target.value)}
                >
                  <option>Homicide</option>
                  <option>Narcotics</option>
                  <option>Cybercrime</option>
                  <option>Financial Crimes</option>
                </select>
              </>
            )}
          </div>
        )}

        {/* Primary action buttons */}
        {!redirectInFlight && (
          <div className="login-actions">
            {/* Main sign-in button */}
            <button
              className="btn btn-primary btn-full"
              onClick={handleLogin}
              disabled={signing}
            >
              {signing ? (
                <><Loader size={18} className="spinner" /> Starting sign-in…</>
              ) : hasError ? (
                "Try sign-in again"
              ) : USE_MOCK ? (
                `Sign in as ${mockRole}`
              ) : (
                <>
                  <MicrosoftLogo />
                  Sign in with Microsoft
                </>
              )}
            </button>

            {/* Show retry / sign-out when there's an error */}
            {hasError && (
              <>
                <button
                  className="btn btn-secondary btn-full"
                  onClick={handleRetry}
                >
                  <RefreshCw size={16} />
                  Retry (re-check session)
                </button>
                <button
                  className="btn btn-ghost btn-full"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  Sign out &amp; clear state
                </button>
              </>
            )}
          </div>
        )}

        {/* Footer note */}
        <p className="login-closed-note">
          {USE_MOCK
            ? "Mock mode: no real authentication is performed."
            : "This is a closed system. New accounts are created by administrators in the Entra ID portal."}
        </p>
      </div>
    </div>
  );
}

/** Inline Microsoft logo SVG — no external dependency */
function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <rect x="1"  y="1"  width="9" height="9" fill="#F25022" />
      <rect x="11" y="1"  width="9" height="9" fill="#7FBA00" />
      <rect x="1"  y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
