import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
import * as caseApi from "../api/caseApi";
import { ArrowLeft, Trash2, Save, RefreshCw, Plus, FileText } from "lucide-react";
import { format } from "date-fns";

export default function CaseDetailPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const { canCreateOrEditCases, canDeleteCases, canDeleteEvidence, canAddEvidence, isProsecutor } = useAuth();
  const { cases, evidence, updateCase, deleteCase, addCaseNote, deleteEvidence, refreshEvidenceStatus, reload } = useCase();

  const [caseItem, setCaseItem] = useState(null);
  const [status, setStatus] = useState("OPEN");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const local = (cases || []).find((c) => c.id === caseId);
    if (local) {
      setCaseItem(local);
      setTitle(local.title || "");
      setStatus(local.status || "OPEN");
      return;
    }
    // Fallback fetch
    caseApi.getCase(caseId).then((c) => {
      setCaseItem(c);
      setTitle(c.title || "");
      setStatus(c.status || "OPEN");
    }).catch(() => {});
  }, [caseId, cases]);

  const caseEvidence = useMemo(() => {
    return (evidence || []).filter((e) => e.caseId === caseId).slice().sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
  }, [evidence, caseId]);

  async function onSave() {
    setError("");
    try {
      const updated = await updateCase(caseId, { title: title.trim(), status });
      setCaseItem(updated);
    } catch (e) {
      setError(e.message || "Update failed");
    }
  }

  async function onDeleteCase() {
    if (!window.confirm("Delete this case? This will delete all evidence under it.")) return;
    setError("");
    try {
      await deleteCase(caseId);
      navigate("/cases");
    } catch (e) {
      setError(e.message || "Delete failed");
    }
  }

  async function onAddNote() {
    setError("");
    try {
      await addCaseNote(caseId, note.trim());
      setNote("");
      alert("Note added.");
    } catch (e) {
      setError(e.message || "Add note failed");
    }
  }

  async function onDeleteEvidence(evidenceId) {
    if (!window.confirm("Delete this evidence item?")) return;
    setError("");
    try {
      await deleteEvidence(evidenceId);
    } catch (e) {
      setError(e.message || "Delete failed");
    }
  }

  async function onRefreshStatus(evidenceId) {
    setError("");
    try {
      await refreshEvidenceStatus(evidenceId);
      await reload();
    } catch (e) {
      setError(e.message || "Refresh failed");
    }
  }

  if (!caseItem) {
    return (
      <div className="page-container">
        <p className="muted">Loading case…</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link to="/cases" className="link-button">
            <ArrowLeft size={18} /> Back to cases
          </Link>
          <h1 style={{ marginTop: "0.5rem" }}>{caseItem.title || caseItem.id}</h1>
          <p className="muted">
            Department: {caseItem.department} • Created: {caseItem.createdAt ? format(new Date(caseItem.createdAt), "PPp") : "—"}
          </p>
        </div>

        <div className="button-group">
          <button className="btn btn-secondary" onClick={reload}>
            <RefreshCw size={18} /> Refresh
          </button>
          {canAddEvidence() ? (
            <Link className="btn btn-primary" to={`/upload?caseId=${encodeURIComponent(caseId)}`}>
              <Plus size={18} /> Upload evidence
            </Link>
          ) : null}
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h2>Case details</h2>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canCreateOrEditCases()} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canCreateOrEditCases()}>
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            {canCreateOrEditCases() ? (
              <div className="button-group">
                <button className="btn btn-primary" onClick={onSave} disabled={!title.trim()}>
                  <Save size={18} /> Save
                </button>
                {canDeleteCases() ? (
                  <button className="btn btn-danger" onClick={onDeleteCase}>
                    <Trash2 size={18} /> Delete case
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="muted">{isProsecutor ? "Read-only role: edit actions are disabled." : "No edit permissions."}</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Notes</h2>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label>Add note</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} disabled={!canCreateOrEditCases()} />
            </div>
            {canCreateOrEditCases() ? (
              <button className="btn btn-secondary" onClick={onAddNote} disabled={!note.trim()}>
                Add note
              </button>
            ) : (
              <p className="muted">Notes are writable only for detective/case_officer.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={18} /> Evidence
          </h2>
        </div>
        <div className="card-content">
          {caseEvidence.length === 0 ? <p className="muted">No evidence for this case yet.</p> : null}
          {caseEvidence.map((e) => (
            <div key={e.id} className="list-item">
              <div className="list-item-body">
                <div className="list-item-title">{e.fileName || e.id}</div>
                <div className="list-item-meta">
                  <span>Status: {(e.status || "").toUpperCase()}</span>
                  <span>•</span>
                  <span>{e.uploadedAt ? format(new Date(e.uploadedAt), "PPp") : "—"}</span>
                </div>
              </div>

              <div className="button-group">
                <button className="btn btn-secondary btn-sm" onClick={() => onRefreshStatus(e.id)}>
                  Refresh status
                </button>
                {canDeleteEvidence() ? (
                  <button className="btn btn-danger btn-sm" onClick={() => onDeleteEvidence(e.id)}>
                    <Trash2 size={16} /> Delete
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
