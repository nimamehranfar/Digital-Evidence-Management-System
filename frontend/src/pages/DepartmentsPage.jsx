import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as departmentApi from "../api/departmentApi";
import { Plus, Trash2, Save, X, Building2, RefreshCw, Pencil } from "lucide-react";

export default function DepartmentsPage() {
  const { canManageDepartments, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await departmentApi.getDepartments();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load departments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const sorted = useMemo(() => (items || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || "")), [items]);

  function startEdit(d) {
    setEditingId(d.id);
    setEditName(d.name || "");
    setEditDesc(d.description || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDesc("");
  }

  async function saveEdit(id) {
    setError("");
    try {
      const updated = await departmentApi.updateDepartment(id, { name: editName, description: editDesc });
      setItems((prev) => (prev || []).map((d) => (d.id === id ? updated : d)));
      cancelEdit();
    } catch (e) {
      setError(e.message || "Update failed");
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this department? This will cascade-delete its cases and evidence.")) return;
    setError("");
    try {
      await departmentApi.deleteDepartment(id);
      setItems((prev) => (prev || []).filter((d) => d.id !== id));
    } catch (e) {
      setError(e.message || "Delete failed");
    }
  }

  async function create() {
    setError("");
    try {
      const created = await departmentApi.createDepartment({ name: createName, description: createDesc });
      setItems((prev) => [created, ...(prev || [])]);
      setCreateName("");
      setCreateDesc("");
      setShowCreate(false);
    } catch (e) {
      setError(e.message || "Create failed");
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Departments</h1>
          <p>{isAdmin ? "Governance: manage departments." : "Browse departments (read-only)."}</p>
        </div>

        <div className="button-group">
          <button className="btn btn-secondary" onClick={refresh}>
            <RefreshCw size={18} /> Refresh
          </button>
          {canManageDepartments() ? (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={18} /> New department
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      ) : null}

      {loading ? <p className="muted">Loading…</p> : null}

      {showCreate ? (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="card-header">
            <h2>Create department</h2>
            <button className="btn btn-icon" onClick={() => setShowCreate(false)} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label>Name</label>
              <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g., Cybercrime" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="Optional" />
            </div>
            <div className="button-group">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={create} disabled={!createName.trim()}>
                <Save size={18} /> Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-header">
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Building2 size={18} /> Department list
          </h2>
        </div>
        <div className="card-content">
          {sorted.length === 0 ? <p className="muted">No departments found.</p> : null}

          {sorted.map((d) => {
            const isEditing = editingId === d.id;
            return (
              <div key={d.id} className="list-item">
                <div className="list-item-body">
                  {isEditing ? (
                    <>
                      <div className="form-group">
                        <label>Name</label>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                      </div>
                      <div className="button-group">
                        <button className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
                        <button className="btn btn-primary" onClick={() => saveEdit(d.id)} disabled={!editName.trim()}>
                          <Save size={18} /> Save
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="list-item-title">{d.name || d.id}</div>
                      <div className="list-item-meta">
                        <span>{d.id}</span>
                        {d.description ? (
                          <>
                            <span>•</span>
                            <span>{d.description}</span>
                          </>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>

                {!isEditing && canManageDepartments() ? (
                  <div className="button-group">
                    <button className="btn btn-secondary btn-sm" onClick={() => startEdit(d)}>
                      <Pencil size={16} /> Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(d.id)}>
                      <Trash2 size={16} /> Delete
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
