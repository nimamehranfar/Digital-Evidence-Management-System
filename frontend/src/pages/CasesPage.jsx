/**
 * CasesPage.jsx
 *
 * CHANGED:
 *   - Added `deptMap` (useMemo) that builds a { [id]: name } lookup from the
 *     `departments` state.  The departments list was already being fetched on
 *     mount for the filter dropdown, so no extra API call is needed.
 *   - Table cell for Department now renders `deptMap[c.department]` (the human-
 *     readable name) with the raw ID as a fallback if the department is somehow
 *     not in the loaded list.
 */
import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
import * as departmentApi from "../api/departmentApi";
import { Plus, Search, Briefcase, Trash2, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";

const STATUS_BADGE = {
  OPEN:    "badge-info",
  ON_HOLD: "badge-warning",
  CLOSED:  "badge-gray",
  ACTIVE:  "badge-info",
  PENDING: "badge-warning",
};

function normalizeCaseStatus(s) {
  const u = String(s || "").toUpperCase();
  if (u === "ACTIVE")               return "OPEN";
  if (u === "PENDING")              return "ON_HOLD";
  if (u === "ONHOLD" || u === "ON-HOLD") return "ON_HOLD";
  return u;
}

export default function CasesPage() {
  const { canCreateOrEditCases, canDeleteCases } = useAuth();
  const { getAccessibleCases, createCase, deleteCase, loading, reloadCases } = useCase();

  const cases = getAccessibleCases() || [];

  const [query,        setQuery]        = useState("");
  const [deptFilter,   setDeptFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departments,  setDepartments]  = useState([]);
  const [showCreate,   setShowCreate]   = useState(false);
  const [createError,  setCreateError]  = useState("");
  const [creating,     setCreating]     = useState(false);
  const [form,         setForm]         = useState({ title: "", department: "", status: "OPEN", description: "" });
  const [pageError,    setPageError]    = useState("");

  // ── Fetch fresh cases when this page mounts ─────────────────────────────────
  useEffect(() => {
    reloadCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Department list for the filter dropdown AND for name resolution in the table.
  useEffect(() => {
    departmentApi
      .getDepartments()
      .then((d) => setDepartments(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // ── Department ID → name lookup ─────────────────────────────────────────────
  // Built from the same `departments` array that powers the filter dropdown.
  // No extra API call required.
  const deptMap = useMemo(() => {
    const map = {};
    for (const d of departments) {
      if (d.id) map[d.id] = d.name || d.id;
    }
    return map;
  }, [departments]);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const titleMatch  = !query        || (c.title || "").toLowerCase().includes(query.toLowerCase());
      const deptMatch   = !deptFilter   || c.department === deptFilter;
      const statMatch   = !statusFilter || normalizeCaseStatus(c.status) === statusFilter;
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
        title:       form.title.trim(),
        department:  form.department,
        status:      form.status,
        description: form.description.trim() || undefined,
      });
      setShowCreate(false);
      setForm({ title: "", department: "", status: "OPEN", description: "" });
    } catch (err) {
      setCreateError(err.message || "Could not create case");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(caseId, title) {
    if (!window.confirm(`Delete case "${title}"? All evidence will be removed.`)) return;
    setPageError("");
    try {
      await deleteCase(caseId);
    } catch (err) {
      setPageError(err.message || "Delete failed");
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Cases</h1>
          <p>{filtered.length} {filtered.length !== 1 ? "cases" : "case"}</p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={reloadCases}
            disabled={loading}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          {canCreateOrEditCases() && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowCreate((v) => !v)}
            >
              <Plus size={15} /> New Case
            </button>
          )}
        </div>
      </div>

      {pageError && (
        <div className="alert alert-error" style={{ marginBottom: "var(--sp-md)" }}>
          {pageError}
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: "var(--sp-md)" }}>
        <div className="card-content" style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
            <input
              className="form-input"
              style={{ paddingLeft: 32 }}
              placeholder="Search by title…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            style={{ flex: "0 1 180px" }}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name || d.id}</option>
            ))}
          </select>
          <select
            className="form-select"
            style={{ flex: "0 1 150px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="CLOSED">Closed</option>
          </select>
          {(query || deptFilter || statusFilter) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setQuery(""); setDeptFilter(""); setStatusFilter(""); }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Create form */}
      {showCreate && canCreateOrEditCases() && (
        <div className="card" style={{ marginBottom: "var(--sp-md)", borderColor: "var(--color-primary-light)" }}>
          <div className="card-header"><h2>New Case</h2></div>
          <form className="card-content" onSubmit={handleCreate}>
            {createError && (
              <div className="alert alert-error" style={{ marginBottom: "var(--sp-sm)" }}>
                {createError}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                className="form-input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Valentine st Homicide"
                required
              />
            </div>
            <div className="form-row" style={{ display: "flex", gap: ".75rem" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Department *</label>
                <select
                  className="form-select"
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  required
                >
                  <option value="">Select department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name || d.id}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="OPEN">Open</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>
            {/*<div className="form-group">*/}
            {/*  <label className="form-label">Description</label>*/}
            {/*  <textarea*/}
            {/*    className="form-textarea"*/}
            {/*    value={form.description}*/}
            {/*    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}*/}
            {/*    placeholder="Optional description"*/}
            {/*    style={{ minHeight: 70 }}*/}
            {/*  />*/}
            {/*</div>*/}
            <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>
                {creating ? "Creating…" : "Create Case"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cases table */}
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
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>
                  <Briefcase size={32} style={{ color: "var(--color-gray-300)", display: "block", margin: "0 auto .5rem" }} />
                  {cases.length === 0 ? "No cases yet." : "No cases match your filters."}
                </td>
              </tr>
            )}
            {!loading && filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/cases/${c.id}`} className="link-primary">
                    {c.title || c.id}
                  </Link>
                </td>
                {/*
                  FIX: previously rendered `c.department` directly, which is the
                  raw department ID stored on the case document (e.g. "dept-001").
                  Now we look up the human-readable name from `deptMap`, which is
                  built from the same `departments` array already fetched for the
                  filter dropdown.  If for any reason the ID isn't in the map
                  (e.g. the department was deleted), we fall back to showing the
                  raw ID rather than showing nothing.
                */}
                <td style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>
                  {deptMap[c.department] || c.department || "—"}
                </td>
                <td>
                  <span className={`badge ${STATUS_BADGE[normalizeCaseStatus(c.status)] || "badge-gray"}`}>
                    {normalizeCaseStatus(c.status)}
                  </span>
                </td>
                <td style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>
                  {c.createdAt ? format(new Date(c.createdAt), "PP") : "—"}
                </td>
                {canDeleteCases() && (
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-danger btn-sm btn-icon"
                      title="Delete case"
                      onClick={() => handleDelete(c.id, c.title)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
