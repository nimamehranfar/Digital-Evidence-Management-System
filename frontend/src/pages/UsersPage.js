import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as authApi from "../api/authApi";
import * as departmentApi from "../api/departmentApi";
import { RefreshCw, Save, Users, Building2 } from "lucide-react";

function normalizeUser(u) {
  // Backend users container shape (Part 3):
  // { id (oid), department, displayName, email }
  // Tokens (/api/auth/me) return { id, name, roles, department? }
  return {
    id: u?.id || u?.oid || u?.userId,
    displayName: u?.displayName || u?.name || "",
    email: u?.email || u?.mail || "",
    department: u?.department || null,
    roles: Array.isArray(u?.roles) ? u.roles : [],
  };
}

export default function UsersPage() {
  const { canManageUsers } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editOid, setEditOid] = useState(null);
  const [editDept, setEditDept] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [u, d] = await Promise.all([authApi.getUsers(), departmentApi.getDepartments()]);
      setUsers(Array.isArray(u) ? u.map(normalizeUser) : []);
      setDepartments(Array.isArray(d) ? d : []);
    } catch (e) {
      setError(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const deptOptions = useMemo(() => {
    const opts = (departments || []).map((x) => ({ id: x.id, name: x.name || x.id }));
    opts.sort((a, b) => a.name.localeCompare(b.name));
    return opts;
  }, [departments]);

  function startEdit(u) {
    setEditOid(u.id);
    setEditDept(u.department || "");
  }

  function cancelEdit() {
    setEditOid(null);
    setEditDept("");
  }

  async function save() {
    setError("");
    try {
      const updated = await authApi.updateUser(editOid, { department: editDept || null });
      const normalized = normalizeUser(updated);
      setUsers((prev) => (prev || []).map((u) => (u.id === editOid ? { ...u, ...normalized } : u)));
      cancelEdit();
    } catch (e) {
      setError(e.message || "Update failed");
    }
  }

  if (!canManageUsers()) {
    return (
      <div className="page-container">
        <div className="card">
          <h2>Not authorized</h2>
          <p>Only admins can manage users.</p>
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
            Closed system: users are created/invited and assigned app roles in Entra ID portal. The frontend only assigns the
            department for <code>case_officer</code> users.
          </p>
        </div>

        <div className="button-group">
          <button className="btn btn-secondary" onClick={refresh}>
            <RefreshCw size={18} /> Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      ) : null}

      {loading ? <p className="muted">Loading…</p> : null}

      <div className="card">
        <div className="card-header">
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={18} /> User list
          </h2>
        </div>
        <div className="card-content">
          {(users || []).length === 0 ? <p className="muted">No users found.</p> : null}

          {(users || []).map((u) => {
            const isEditing = editOid === u.id;

            return (
              <div key={u.id} className="list-item">
                <div className="list-item-body">
                  <div className="list-item-title">{u.displayName || u.email || u.id}</div>
                  <div className="list-item-meta">
                    <span>{u.email || "—"}</span>
                    <span>•</span>
                    <span>oid: {u.id}</span>
                    <span>•</span>
                    <span>
                      <Building2 size={14} style={{ marginRight: 6 }} />
                      {u.department || "no department"}
                    </span>
                  </div>

                  {isEditing ? (
                    <div style={{ marginTop: "0.75rem" }}>
                      <div className="form-group">
                        <label>Department for case_officer</label>
                        <select value={editDept} onChange={(e) => setEditDept(e.target.value)}>
                          <option value="">(none)</option>
                          {deptOptions.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.id})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="button-group">
                        <button className="btn btn-secondary" onClick={cancelEdit}>
                          Cancel
                        </button>
                        <button className="btn btn-primary" onClick={save}>
                          <Save size={18} /> Save
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {!isEditing ? (
                  <div className="button-group">
                    <button className="btn btn-secondary btn-sm" onClick={() => startEdit(u)}>
                      Assign department
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
