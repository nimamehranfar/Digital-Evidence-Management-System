import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as authApi from "../api/authApi";
import * as departmentApi from "../api/departmentApi";
import { RefreshCw, Save, Users, X, ChevronDown } from "lucide-react";

function normalizeUser(u) {
  return {
    id: u?.id || u?.oid || u?.userId || "",
    displayName: u?.displayName || u?.name || "",
    email: u?.email || u?.mail || u?.upn || "",
    department: u?.department || null,
    roles: Array.isArray(u?.roles) ? u.roles : [],
  };
}

const ROLE_BADGE = {
  admin:       "badge-warning",
  detective:   "badge-primary",
  case_officer:"badge-info",
  prosecutor:  "badge-success",
};

export default function UsersPage() {
  const { canManageUsers } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [saveError, setSaveError] = useState("");

  const [editId, setEditId]     = useState(null);
  const [editDept, setEditDept] = useState("");
  const [saving, setSaving]     = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [u, d] = await Promise.all([
        authApi.getUsers(),
        departmentApi.getDepartments(),
      ]);
      setUsers(Array.isArray(u) ? u.map(normalizeUser) : []);
      setDepartments(Array.isArray(d) ? d : []);
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const deptOptions = useMemo(() => {
    return (departments || [])
      .map((d) => ({ id: d.id, name: d.name || d.id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  function startEdit(u) {
    setEditId(u.id);
    setEditDept(u.department || "");
    setSaveError("");
  }

  async function commitEdit() {
    setSaving(true);
    setSaveError("");
    try {
      const updated = await authApi.updateUser(editId, { department: editDept || null });
      const norm = normalizeUser(updated);
      setUsers((prev) => prev.map((u) => (u.id === editId ? { ...u, ...norm } : u)));
      setEditId(null);
    } catch (e) {
      setSaveError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!canManageUsers()) {
    return (
      <div className="page-container centered-message">
        <div className="card card-compact" style={{ textAlign: "center" }}>
          <Users size={40} style={{ color: "var(--color-warning)", marginBottom: "1rem" }} />
          <h2>Admins only</h2>
          <p className="muted">Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p>
            Accounts are managed in Entra ID portal. Here you can assign a department to{" "}
            <span className={`badge badge-info`}>case_officer</span> users.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={refresh} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {error    && <div className="alert alert-error"   style={{ marginBottom: "var(--sp-md)" }}>{error}</div>}
      {saveError && <div className="alert alert-error"  style={{ marginBottom: "var(--sp-md)" }}>{saveError}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Display Name</th>
              <th>Email / UPN</th>
              <th>Roles</th>
              <th>Department</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>Loading users…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>
                No users returned from /api/users.
              </td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.displayName || "—"}</td>
                <td style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>{u.email || "—"}</td>
                <td>
                  <div style={{ display: "flex", gap: ".25rem", flexWrap: "wrap" }}>
                    {u.roles.map((r) => (
                      <span key={r} className={`badge ${ROLE_BADGE[r] || "badge-gray"}`}>{r}</span>
                    ))}
                    {u.roles.length === 0 && <span className="badge badge-gray">—</span>}
                  </div>
                </td>
                <td>
                  {editId === u.id ? (
                    <select
                      className="form-select"
                      style={{ fontSize: ".875rem", padding: ".375rem .625rem" }}
                      value={editDept}
                      onChange={(e) => setEditDept(e.target.value)}
                    >
                      <option value="">None</option>
                      {deptOptions.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ color: u.department ? "var(--color-text-primary)" : "var(--color-text-muted)", fontSize: ".875rem" }}>
                      {u.department || "—"}
                    </span>
                  )}
                </td>
                <td>
                  {editId === u.id ? (
                    <div style={{ display: "flex", gap: ".375rem" }}>
                      <button className="btn btn-sm btn-primary" onClick={commitEdit} disabled={saving}>
                        <Save size={14} /> {saving ? "…" : "Save"}
                      </button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setEditId(null)} disabled={saving}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-sm btn-ghost" onClick={() => startEdit(u)}>
                      Edit dept
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ marginTop: "var(--sp-lg)", fontSize: ".8125rem" }}>
        To create users, change roles, or reset passwords, use the{" "}
        <a href="https://entra.microsoft.com" target="_blank" rel="noreferrer">Microsoft Entra admin portal</a>.
      </p>
    </div>
  );
}
