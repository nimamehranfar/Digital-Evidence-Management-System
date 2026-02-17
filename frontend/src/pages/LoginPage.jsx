import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { USE_MOCK } from "../api/config";
import { Shield, LogIn } from "lucide-react";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mockRole, setMockRole] = useState("detective");
  const [mockDepartment, setMockDepartment] = useState("dept-1");
  const [err, setErr] = useState("");
  const [loginInFlight, setLoginInFlight] = useState(false);

  // If already logged in, go home.
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  // Reset one-click "in flight" state if the user comes back from redirect or reloads.
  useEffect(() => {
    setLoginInFlight(false);
  }, [location.key]);

  const canClick = useMemo(() => !loading && !loginInFlight, [loading, loginInFlight]);

  async function onLogin() {
    setErr("");
    if (!canClick) return;

    setLoginInFlight(true);

    try {
      if (USE_MOCK) {
        await login({ role: mockRole, department: mockDepartment });
        return;
      }
      // Real mode triggers redirect. If MSAL throws synchronously, allow retry immediately.
      await login();
    } catch (e) {
      const msg = String(e?.message || e || "");
      // If MSAL thinks an interaction is still in progress, we allow re-click without waiting.
      // realAuthApi.login() already clears the stuck flag before calling loginRedirect.
      if (msg.includes("interaction_in_progress")) {
        setErr("Sign-in was already in progress. Click Sign in again to retry.");
      } else {
        setErr(msg || "Sign-in failed. Try again.");
      }
      setLoginInFlight(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <div className="card" style={{ marginTop: 40 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
          <div className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Shield size={16} />
            DEMS
          </div>
          <div>
            <h1 style={{ margin: 0, textAlign: "left" }}>Digital Evidence Management System</h1>
            <p className="muted" style={{ marginTop: 6, textAlign: "left" }}>
              Closed system. Users are created/invited in Microsoft Entra. No self-registration.
            </p>
          </div>
        </div>

        {err ? (
          <div className="alert alert-error" style={{ marginBottom: 14 }}>
            {err}
          </div>
        ) : null}

        {USE_MOCK ? (
          <div className="grid-2">
            <div>
              <label className="label">Mock role</label>
              <select className="input" value={mockRole} onChange={(e) => setMockRole(e.target.value)}>
                <option value="admin">admin</option>
                <option value="detective">detective</option>
                <option value="case_officer">case_officer</option>
                <option value="prosecutor">prosecutor</option>
              </select>
            </div>
            <div>
              <label className="label">Mock department (case_officer only)</label>
              <input className="input" value={mockDepartment} onChange={(e) => setMockDepartment(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="muted" style={{ marginBottom: 14 }}>
            You will be redirected to Microsoft to sign in.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onLogin} disabled={!canClick}>
            <LogIn size={16} />
            {loginInFlight ? "Signing in..." : "Sign in with Microsoft"}
          </button>
        </div>

        <div className="muted" style={{ marginTop: 14 }}>
          Tip: If you ever get &quot;interaction_in_progress&quot;, just click the button again.
        </div>
      </div>
    </div>
  );
}
