import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as departmentApi from "../api/departmentApi";
import { Plus, Trash2, Pencil, RefreshCw, Building2, X, Save } from "lucide-react";

export default function DepartmentsPage() {
  const { canManageDepartments } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId]         = useState(null);
  const [formName, setFormName]     = useState("");
  const [formDesc, setFormDesc]     = useState("");
  const [formError, setFormError]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const d = await departmentApi.getDepartments();
      setDepartments(Array.isArray(d) ? d : []);
    } catch (e) {
      setError(e.message || "Failed to load departments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  function openCreate() {
    setEditId(null);
    setFormName("");
    setFormDesc("");
    setFormError("");
    setShowCreate(true);
  }

  function openEdit(dept) {
    setEditId(dept.id);
    setFormName(dept.name || "");
    setFormDesc(dept.description || "");
    setFormError("");
    setShowCreate(true);
  }

  function closeModal() {
    setShowCreate(false);
    setEditId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formName.trim()) { setFormError("Name is required."); return; }
    setSubmitting(true);
    setFormError("");
    try {
      if (editId) {
        const updated = await departmentApi.updateDepartment(editId, {
          name: formName.trim(),
          description: formDesc.trim() || undefined,
        });
        setDepartments((prev) => prev.map((d) => (d.id === editId ? { ...d, ...updated } : d)));
      } else {
        const created = await departmentApi.createDepartment({
          name: formName.trim(),
          description: formDesc.trim() || undefined,
        });
        setDepartments((prev) => [...prev, created]);
      }
      closeModal();
    } catch (e) {
      setFormError(e.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(dept) {
    if (!window.confirm(`Delete "${dept.name || dept.id}"? Cases assigned to this department will be affected.`)) return;
    setError("");
    try {
      await departmentApi.deleteDepartment(dept.id);
      setDepartments((prev) => prev.filter((d) => d.id !== dept.id));
    } catch (e) {
      setError(e.message || "Delete failed");
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Departments</h1>
          <p>{departments.length} department{departments.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={refresh} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
          {canManageDepartments() && (
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus size={15} /> New Department
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: "var(--sp-md)" }}>{error}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>ID</th>
              <th>Description</th>
              {canManageDepartments() && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>Loading…</td></tr>
            )}
            {!loading && departments.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>
                <Building2 size={32} style={{ color: "var(--color-gray-300)", display: "block", margin: "0 auto .5rem" }} />
                No departments yet.
                {canManageDepartments() && (
                  <> <button className="link-button" onClick={openCreate}>Create one →</button></>
                )}
              </td></tr>
            )}
            {departments.map((d) => (
              <tr key={d.id}>
                <td style={{ fontWeight: 600 }}>{d.name || "—"}</td>
                <td style={{ fontFamily: "monospace", fontSize: ".8125rem", color: "var(--color-text-secondary)" }}>{d.id}</td>
                <td style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>{d.description || "—"}</td>
                {canManageDepartments() && (
                  <td>
                    <div style={{ display: "flex", gap: ".375rem" }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => openEdit(d)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(d)} title="Delete" style={{ color: "var(--color-danger)" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editId ? "Edit Department" : "New Department"}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="alert alert-error" style={{ marginBottom: "1rem" }}>{formError}</div>}
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    className="form-input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. NYPD"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    rows={2}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Save size={15} /> {submitting ? "Saving…" : editId ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
