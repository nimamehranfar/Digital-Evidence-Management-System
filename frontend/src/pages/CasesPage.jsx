import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
import * as departmentApi from "../api/departmentApi";
import { Plus, Search, Briefcase, Trash2, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";
import { useEffect } from "react";

const STATUS_BADGE = {
  OPEN:    "badge-info",
  ACTIVE:  "badge-primary",
  PENDING: "badge-warning",
  CLOSED:  "badge-gray",
};

export default function CasesPage() {
  const { canCreateOrEditCases, canDeleteCases } = useAuth();
  const { getAccessibleCases, createCase, deleteCase, loading, reload } = useCase();

  const cases = getAccessibleCases() || [];

  const [query, setQuery]   = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departments, setDepartments] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", department: "", status: "OPEN", description: "" });
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    departmentApi.getDepartments().then((d) => setDepartments(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const titleMatch = !query || (c.title || "").toLowerCase().includes(query.toLowerCase());
      const deptMatch  = !deptFilter   || c.department === deptFilter;
      const statMatch  = !statusFilter || (c.status || "").toUpperCase() === statusFilter;
      return titleMatch && deptMatch && statMatch;
    });
  }, [cases, query, deptFilter, statusFilter]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.department) {
      setCreateError("Title and department are required.");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      await createCase({
        title: form.title.trim(),
        department: form.department,
        status: form.status,
        description: form.description.trim() || undefined,
      });
      setShowCreate(false);
      setForm({ title: "", department: "", status: "OPEN", description: "" });
    } catch (err) {
      setCreateError(err.message || "Failed to create case");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this case and all its evidence?")) return;
    setPageError("");
    try { await deleteCase(id); }
    catch (e) { setPageError(e.message || "Delete failed"); }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Cases</h1>
          <p>{filtered.length} case{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={reload}>
            <RefreshCw size={15} /> Refresh
          </button>
          {canCreateOrEditCases() && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              <Plus size={15} /> New Case
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: "var(--sp-lg)", padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", alignItems: "center" }}>
          <div className="search-box" style={{ flex: "1 1 220px" }}>
            <Search size={16} className="search-icon" />
            <input
              className="search-input"
              placeholder="Search cases…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className="form-select" style={{ flex: "1 1 160px" }} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name || d.id}</option>)}
          </select>
          <select className="form-select" style={{ flex: "1 1 140px" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {pageError && <div className="alert alert-error" style={{ marginBottom: "var(--sp-md)" }}>{pageError}</div>}

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Department</th>
              <th>Status</th>
              <th>Created</th>
              {canDeleteCases() && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>
                <Briefcase size={32} style={{ color: "var(--color-gray-300)", marginBottom: ".5rem", display: "block", margin: "0 auto .5rem" }} />
                No cases found.
              </td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/cases/${c.id}`} style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                    {c.title || c.id}
                  </Link>
                </td>
                <td>{c.department || "—"}</td>
                <td>
                  <span className={`badge ${STATUS_BADGE[(c.status||"OPEN").toUpperCase()] || "badge-gray"}`}>
                    {c.status || "OPEN"}
                  </span>
                </td>
                <td style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>
                  {c.createdAt ? format(new Date(c.createdAt), "PP") : "—"}
                </td>
                {canDeleteCases() && (
                  <td>
                    <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(c.id)} title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>New Case</h2>
              <button className="btn-icon" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {createError && <div className="alert alert-error" style={{ marginBottom: "1rem" }}>{createError}</div>}
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Case title" />
                </div>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select className="form-select" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}>
                    <option value="">Select department…</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name || d.id}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Status</label>
                  <select className="form-select" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="OPEN">Open</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Optional description" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Creating…" : "Create Case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
