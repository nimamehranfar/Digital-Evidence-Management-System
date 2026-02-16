import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
import { Plus, RefreshCw, X, Save } from "lucide-react";
import { format } from "date-fns";

export default function CasesPage() {
  const { canCreateOrEditCases, isProsecutor, user } = useAuth();
  const { getAccessibleCases, createCase, reload } = useCase();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState(user?.department || "");
  const [status, setStatus] = useState("OPEN");
  const [error, setError] = useState("");

  const cases = getAccessibleCases();

  const sorted = useMemo(() => {
    return (cases || []).slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [cases]);

  async function onCreate() {
    setError("");
    try {
      const payload = { title: title.trim(), department: department.trim(), status: status.trim() };
      await createCase(payload);
      setShowCreate(false);
      setTitle("");
      setStatus("OPEN");
    } catch (e) {
      setError(e.message || "Create failed");
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Cases</h1>
          <p>{isProsecutor ? "Read-only access." : "Manage and review cases."}</p>
        </div>

        <div className="button-group">
          <button className="btn btn-secondary" onClick={reload}>
            <RefreshCw size={18} /> Refresh
          </button>
          {canCreateOrEditCases() ? (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={18} /> New case
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {showCreate ? (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="card-header">
            <h2>Create case</h2>
            <button className="btn btn-icon" onClick={() => setShowCreate(false)} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Case title" />
            </div>
            <div className="form-group">
              <label>Department</label>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="department id (e.g., dept-1)"
                disabled={!!user?.department}
              />
              {user?.department ? <p className="muted">Case Officer is locked to their assigned department.</p> : null}
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
            <div className="button-group">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={onCreate} disabled={!title.trim() || !department.trim()}>
                <Save size={18} /> Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-header">
          <h2>Case list</h2>
        </div>
        <div className="card-content">
          {sorted.length === 0 ? <p className="muted">No cases available.</p> : null}
          {sorted.map((c) => (
            <Link key={c.id} to={`/cases/${c.id}`} className="list-item">
              <div className="list-item-body">
                <div className="list-item-title">{c.title || c.id}</div>
                <div className="list-item-meta">
                  <span>{c.department}</span>
                  <span>•</span>
                  <span>{(c.status || "").toUpperCase()}</span>
                  <span>•</span>
                  <span>{c.createdAt ? format(new Date(c.createdAt), "PPp") : "—"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
