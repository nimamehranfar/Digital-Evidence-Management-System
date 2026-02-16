import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
import { Shield, User, Building2, FileText, Briefcase } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { getAccessibleCases, evidence } = useCase();

  const cases = getAccessibleCases();
  const evidenceCount = useMemo(() => {
    const ids = new Set((cases || []).map((c) => c.id));
    return (evidence || []).filter((e) => ids.has(e.caseId)).length;
  }, [cases, evidence]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p>Session info from <code>/api/auth/me</code>.</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <User size={18} /> Identity
            </h2>
          </div>
          <div className="card-content">
            <p><strong>Name:</strong> {user?.name || "—"}</p>
            <p><strong>User ID:</strong> {user?.id || "—"}</p>
            <p><strong>Tenant:</strong> {user?.tenantId || "—"}</p>
            <p style={{ marginTop: "0.75rem" }}>
              <strong>Roles:</strong> {(user?.roles || []).join(", ") || "—"}
            </p>
            <p>
              <strong>Department:</strong> {user?.department || "—"}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Shield size={18} /> Access summary
            </h2>
          </div>
          <div className="card-content">
            <p style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Briefcase size={18} /> Accessible cases: <strong>{cases.length}</strong>
            </p>
            <p style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={18} /> Evidence items visible: <strong>{evidenceCount}</strong>
            </p>
            <p style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Building2 size={18} /> Department scope: <strong>{user?.department || "all (detective/prosecutor)"}</strong>
            </p>
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              Closed system: account creation, invitations, and role assignment happen in Entra ID portal (not in the app).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
