import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
import { Shield, User, Building2, FileText, Briefcase, Lock } from "lucide-react";

const ROLE_DESCRIPTIONS = {
  admin:       "Governance only — manage departments and user role assignments.",
  detective:   "Full operational access across all departments, cases and evidence.",
  case_officer: "CRUD within assigned department only.",
  prosecutor:  "Read-only access to all departments, cases and evidence.",
};

export default function ProfilePage() {
  const { user, roles, isAdmin, isDetective, isCaseOfficer, isProsecutor } = useAuth();
  const { getAccessibleCases, evidence } = useCase();

  const cases = getAccessibleCases() || [];
  const evidenceCount = useMemo(() => {
    const ids = new Set(cases.map((c) => c.id));
    return (evidence || []).filter((e) => ids.has(e.caseId)).length;
  }, [cases, evidence]);

  const roleLabel =
    isAdmin       ? "Admin"       :
    isDetective   ? "Detective"   :
    isCaseOfficer ? "Case Officer":
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
          <p>Session identity from <code style={{ fontSize: ".85em", background: "var(--color-gray-100)", padding: ".1em .4em", borderRadius: 4 }}>/api/auth/me</code></p>
        </div>
      </div>

      <div className="grid-2">
        {/* Identity card */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <User size={18} /> Identity
            </h2>
          </div>
          <div className="card-content" style={{ display: "flex", flexDirection: "column", gap: ".875rem" }}>
            <Row label="Full Name"   value={user?.name || "—"} />
            <Row label="User ID"     value={user?.id || "—"} mono />
            <Row label="UPN / Email" value={user?.upn || "—"} />
            <Row label="Tenant ID"   value={user?.tenantId || "—"} mono small />
          </div>
        </div>

        {/* Role & access */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Shield size={18} /> Role &amp; Access
            </h2>
          </div>
          <div className="card-content" style={{ display: "flex", flexDirection: "column", gap: ".875rem" }}>
            <div>
              <div className="form-label">Assigned Role</div>
              <span className={`badge ${roleBadge}`}>{roleLabel}</span>
            </div>
            {ROLE_DESCRIPTIONS[roles[0]] && (
              <p style={{ fontSize: ".875rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                {ROLE_DESCRIPTIONS[roles[0]]}
              </p>
            )}
            {user?.department && (
              <Row label="Department" value={user.department} />
            )}
            <hr style={{ border: "none", borderTop: "1px solid var(--color-border)" }} />
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <Metric icon={<Briefcase size={16} />} label="Cases" value={cases.length} />
              <Metric icon={<FileText  size={16} />} label="Evidence" value={evidenceCount} />
              <Metric icon={<Building2 size={16} />} label="Department" value={user?.department || "All"} />
            </div>
          </div>
        </div>
      </div>

      {/* Permissions summary */}
      <div className="card" style={{ marginTop: "var(--sp-xl)" }}>
        <div className="card-header">
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Lock size={18} /> Permissions
          </h2>
        </div>
        <div className="card-content">
          <PermTable role={roles[0]} department={user?.department} />
          <p className="muted" style={{ marginTop: "1rem", fontSize: ".8125rem" }}>
            Closed system: account creation and role assignment are managed by administrators in the Entra ID portal, not inside the app.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, small }) {
  return (
    <div>
      <div className="form-label">{label}</div>
      <p style={{
        fontFamily: mono ? "monospace" : undefined,
        fontSize: small ? ".8125rem" : ".9375rem",
        color: "var(--color-text-primary)",
        wordBreak: "break-all",
      }}>
        {value}
      </p>
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: ".375rem", fontSize: ".9375rem" }}>
      <span style={{ color: "var(--color-primary)" }}>{icon}</span>
      <span style={{ color: "var(--color-text-secondary)" }}>{label}:</span>
      <strong>{value}</strong>
    </div>
  );
}

const PERMS = {
  admin:       { cases: "—",   evidence: "—",   upload: "—",   departments: "✓",  users: "✓" },
  detective:   { cases: "Full", evidence: "Full", upload: "✓",   departments: "Read", users: "—" },
  case_officer:{ cases: "Dept", evidence: "Dept", upload: "✓",   departments: "Read", users: "—" },
  prosecutor:  { cases: "Read", evidence: "Read", upload: "—",   departments: "Read", users: "—" },
};

function PermTable({ role }) {
  const p = PERMS[role] || {};
  const rows = [
    ["Cases",       p.cases       || "—"],
    ["Evidence",    p.evidence    || "—"],
    ["Upload",      p.upload      || "—"],
    ["Departments", p.departments || "—"],
    ["Users",       p.users       || "—"],
  ];
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Access</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([resource, access]) => (
            <tr key={resource}>
              <td style={{ fontWeight: 500 }}>{resource}</td>
              <td>
                <span className={`badge ${access === "—" ? "badge-gray" : access === "Read" ? "badge-info" : "badge-success"}`}>
                  {access}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
