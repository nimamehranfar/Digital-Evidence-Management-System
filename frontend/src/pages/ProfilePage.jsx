/**
 * ProfilePage.jsx
 *
 * Shows the current user's identity, role, and department only.
 *
 * CHANGED (Problem 2):
 *   - Removed useCase() import and usage entirely.
 *   - Removed cases.length and evidenceCount stat cards.
 *   - Admin no longer sees misleading investigative counts.
 *   - Profile now shows only safe identity/role/tenant info.
 */
import { useAuth } from "../context/AuthContext";
import { Shield, User, Lock } from "lucide-react";
import {useState} from "react";

// const ROLE_DESCRIPTIONS = {
//   admin:        "Governance only — manage departments and user role assignments.",
//   detective:    "Full operational access across all departments, cases and evidence.",
//   case_officer: "CRUD within assigned department only.",
//   prosecutor:   "Read-only access to all departments, cases and evidence.",
// };


function maskValue(value) {
    if (!value || value === "—") return "—";
    const s = String(value);
    if (s.length <= 4) return "••••";
    return `${s.slice(0, 2)}${"•".repeat(Math.max(4, s.length - 4))}${s.slice(-2)}`;
}

function Row({ label, value, mono = false, small = false, sensitive = false }) {
    const [visible, setVisible] = useState(false);

    const displayValue = sensitive && !visible ? maskValue(value) : (value || "—");

    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: ".5rem" }}>
      <span style={{ color: "var(--color-text-secondary)", fontSize: ".8125rem", flexShrink: 0 }}>
        {label}
      </span>

            <div style={{ display: "flex", alignItems: "flex-start", gap: ".5rem" }}>
        <span
            style={{
                fontFamily: mono ? "var(--font-mono, monospace)" : undefined,
                fontSize: small ? ".75rem" : ".875rem",
                textAlign: "right",
                wordBreak: "break-all",
            }}
        >
          {displayValue}
        </span>

                {sensitive && value && value !== "—" && (
                    <button
                        type="button"
                        onClick={() => setVisible(v => !v)}
                        style={{
                            fontSize: ".75rem",
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            color: "var(--color-primary)",
                            flexShrink: 0,
                        }}
                    >
                        {visible ? "Hide" : "Show"}
                    </button>
                )}
            </div>
        </div>
    );
}

export default function ProfilePage() {
  const { user, roles, isAdmin, isDetective, isCaseOfficer, isProsecutor } = useAuth();

  const roleLabel =
    isAdmin       ? "Admin"       :
    isDetective   ? "Detective"   :
    isCaseOfficer ? "Case Officer" :
    isProsecutor  ? "Prosecutor"  : roles.join(", ") || "—";

  const roleBadge =
    isAdmin       ? "badge-warning" :
    isDetective   ? "badge-primary" :
    isCaseOfficer ? "badge-info"    :
    isProsecutor  ? "badge-success" : "badge-gray";

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          {/*<p>*/}
          {/*  Session identity from{" "}*/}
          {/*  <code style={{ fontSize: ".85em", background: "var(--color-gray-100)", padding: ".1em .4em", borderRadius: 4 }}>*/}
          {/*    /api/auth/me*/}
          {/*  </code>*/}
          {/*</p>*/}
        </div>
      </div>

      <div className="grid-2">
        {/* Identity card */}
          <div className="card">
              <div className="card-header">
                  <h2 style={{display: "flex", alignItems: "center", gap: 8}}>
                      <User size={18}/> Identity
                  </h2>
              </div>
              <div className="card-content" style={{display: "flex", flexDirection: "column", gap: ".875rem"}}>
                  <Row label="Full Name" value={user?.name || "—"}/>
                  <Row label="User ID" value={user?.id || "—"} mono sensitive/>
                  <Row label="UPN / Email" value={user?.upn || user?.username || "—"} sensitive/>
                  <Row label="Tenant ID" value={user?.tenantId || "—"} mono small sensitive/>
                  {user?.department && <Row label="Department" value={user.department}/>}
              </div>


          </div>

          {/* Role card */}
          <div className="card">
              <div className="card-header">
                  <h2 style={{display: "flex", alignItems: "center", gap: 8}}>
                      <Shield size={18}/> Access Level
                  </h2>
              </div>
              <div className="card-content" style={{display: "flex", flexDirection: "column", gap: ".875rem"}}>
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                      <span style={{color: "var(--color-text-secondary)", fontSize: ".8125rem" }}>Role</span>
              <span className={`badge ${roleBadge}`}>{roleLabel}</span>
            </div>

            {/*{(roles || []).length > 0 && (*/}
            {/*  <div>*/}
            {/*    <p style={{ color: "var(--color-text-secondary)", fontSize: ".8125rem", marginBottom: ".375rem" }}>*/}
            {/*      Role description*/}
            {/*    </p>*/}
            {/*    {roles.map((r) => (*/}
            {/*      <p key={r} style={{ fontSize: ".875rem", marginBottom: ".25rem" }}>*/}
            {/*        {ROLE_DESCRIPTIONS[r] ?? r}*/}
            {/*      </p>*/}
            {/*    ))}*/}
            {/*  </div>*/}
            {/*)}*/}

            {/*{isAdmin && (*/}
            {/*  <div*/}
            {/*    className="alert alert-warning"*/}
            {/*    style={{ marginTop: ".5rem", fontSize: ".8125rem", display: "flex", gap: ".5rem", alignItems: "flex-start" }}*/}
            {/*  >*/}
            {/*    <Lock size={15} style={{ flexShrink: 0, marginTop: 2 }} />*/}
            {/*    <span>Admin has no access to cases or evidence data.</span>*/}
            {/*  </div>*/}
            {/*)}*/}
          </div>
        </div>
      </div>
    </div>
  );
}
