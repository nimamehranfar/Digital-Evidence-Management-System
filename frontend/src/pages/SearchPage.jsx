import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as evidenceApi from "../api/evidenceApi";
import { Search, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function SearchPage() {
  const { canDeleteEvidence, user, isProsecutor } = useAuth();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [caseId, setCaseId] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const department = user?.department || "";

  async function runSearch() {
    setLoading(true);
    setError("");
    try {
      const data = await evidenceApi.searchEvidence({
        q: q.trim(),
        status: status || undefined,
        caseId: caseId.trim() || undefined,
        department: department || undefined,
      });
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function remove(evidenceId) {
    if (!window.confirm("Delete this evidence item?")) return;
    setError("");
    try {
      await evidenceApi.deleteEvidence(evidenceId);
      setResults((prev) => (prev || []).filter((x) => x.id !== evidenceId));
    } catch (e) {
      setError(e.message || "Delete failed");
    }
  }

  const hint = useMemo(() => {
    if (department) return `Department-scoped view (case_officer): ${department}`;
    return "Backend enforces department RBAC.";
  }, [department]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Search evidence</h1>
          <p>{hint}</p>
        </div>
        <div className="button-group">
          <button className="btn btn-secondary" onClick={runSearch} disabled={loading}>
            <Search size={18} /> Search
          </button>
          <button className="btn btn-secondary" onClick={() => { setQ(""); setStatus(""); setCaseId(""); setResults([]); setError(""); }}>
            <RefreshCw size={18} /> Reset
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header">
          <h2>Filters</h2>
        </div>
        <div className="card-content">
          <div className="grid-2">
            <div className="form-group">
              <label>Query</label>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="keywords…" />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">(any)</option>
                <option value="UPLOADED">UPLOADED</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>

            <div className="form-group">
              <label>Case ID</label>
              <input value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="optional caseId" />
            </div>
          </div>

          <div className="button-group">
            <button className="btn btn-primary" onClick={runSearch} disabled={loading}>
              <Search size={18} /> Run search
            </button>
          </div>

          {isProsecutor ? <p className="muted">Read-only role: delete is disabled.</p> : null}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Results</h2>
        </div>
        <div className="card-content">
          {loading ? <p className="muted">Searching…</p> : null}
          {!loading && results.length === 0 ? <p className="muted">No results.</p> : null}

          {results.map((e) => (
            <div key={e.id} className="list-item">
              <div className="list-item-body">
                <div className="list-item-title">{e.fileName || e.id}</div>
                <div className="list-item-meta">
                  <span>case: {e.caseId}</span>
                  <span>•</span>
                  <span>dept: {e.department}</span>
                  <span>•</span>
                  <span>status: {(e.status || "").toUpperCase()}</span>
                  <span>•</span>
                  <span>{e.uploadedAt ? format(new Date(e.uploadedAt), "PPp") : "—"}</span>
                </div>
                {e.extractedText ? <p className="muted" style={{ marginTop: "0.5rem" }}>{String(e.extractedText).slice(0, 200)}{String(e.extractedText).length > 200 ? "…" : ""}</p> : null}
              </div>

              {canDeleteEvidence() ? (
                <div className="button-group">
                  <button className="btn btn-danger btn-sm" onClick={() => remove(e.id)}>
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
