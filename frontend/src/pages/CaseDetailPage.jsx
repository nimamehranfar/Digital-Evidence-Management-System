import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
import * as caseApi from "../api/caseApi";
import {
  ArrowLeft, Trash2, Save, RefreshCw, Plus, FileText,
  CheckCircle, XCircle, Clock, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_CHIP_MAP = {
  COMPLETED:  "status-chip-completed",
  PROCESSING: "status-chip-processing",
  UPLOADED:   "status-chip-uploaded",
  FAILED:     "status-chip-failed",
};

function EvidenceChip({ status }) {
  const s = (status || "UPLOADED").toUpperCase();
  return (
    <span className={`status-chip ${STATUS_CHIP_MAP[s] || "status-chip-uploaded"}`}>
      {s === "COMPLETED"  && <CheckCircle  size={11} />}
      {s === "FAILED"     && <XCircle      size={11} />}
      {s === "PROCESSING" && <Clock        size={11} />}
      {!["COMPLETED","FAILED","PROCESSING"].includes(s) && <AlertCircle size={11} />}
      {s}
    </span>
  );
}

export default function CaseDetailPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { canCreateOrEditCases, canDeleteCases, canDeleteEvidence, canAddEvidence, isProsecutor } = useAuth();
  const { cases, evidence, updateCase, deleteCase, addCaseNote, deleteEvidence, refreshEvidenceStatus, reload } = useCase();

  const [caseItem, setCaseItem] = useState(null);
  const [title, setTitle]       = useState("");
  const [status, setStatus]     = useState("OPEN");
  const [note, setNote]         = useState("");
  const [pageError, setPageError] = useState("");
  const [saving, setSaving]     = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  // Load case from context cache or direct fetch
  useEffect(() => {
    const local = (cases || []).find((c) => c.id === caseId);
    if (local) {
      setCaseItem(local);
      setTitle(local.title || "");
      setStatus(local.status || "OPEN");
      return;
    }
    caseApi.getCase(caseId)
      .then((c) => { setCaseItem(c); setTitle(c.title || ""); setStatus(c.status || "OPEN"); })
      .catch((e) => setPageError(e.message || "Could not load case"));
  }, [caseId, cases]);

  const caseEvidence = useMemo(
    () => (evidence || []).filter((e) => e.caseId === caseId).slice().sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)),
    [evidence, caseId]
  );

  async function onSave() {
    setSaving(true);
    setPageError("");
    try {
      const updated = await updateCase(caseId, { title: title.trim(), status });
      setCaseItem(updated);
    } catch (e) { setPageError(e.message || "Update failed"); }
    finally { setSaving(false); }
  }

  async function onDeleteCase() {
    if (!window.confirm("Delete this case and ALL its evidence? This cannot be undone.")) return;
    setPageError("");
    try { await deleteCase(caseId); navigate("/cases"); }
    catch (e) { setPageError(e.message || "Delete failed"); }
  }

  async function onAddNote() {
    if (!note.trim()) return;
    setAddingNote(true);
    setPageError("");
    try {
      await addCaseNote(caseId, note.trim());
      setNote("");
      await reload();
    } catch (e) { setPageError(e.message || "Could not add note"); }
    finally { setAddingNote(false); }
  }

  async function onDeleteEvidence(evidenceId) {
    if (!window.confirm("Delete this evidence item?")) return;
    setPageError("");
    try { await deleteEvidence(evidenceId); await reload(); }
    catch (e) { setPageError(e.message || "Delete failed"); }
  }

  async function onRefreshStatus(evidenceId) {
    setPageError("");
    try { await refreshEvidenceStatus(evidenceId); await reload(); }
    catch (e) { setPageError(e.message || "Refresh failed"); }
  }

  if (!caseItem) {
    return (
      <div className="page-container">
        {pageError
          ? <div className="alert alert-error">{pageError}</div>
          : <p className="muted">Loading case…</p>
        }
      </div>
    );
  }

  const notes = caseItem.notes || [];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <Link to="/cases" className="link-button" style={{ display: "inline-flex", alignItems: "center", gap: ".25rem", marginBottom: ".5rem" }}>
            <ArrowLeft size={16} /> Back to Cases
          </Link>
          <h1>{caseItem.title || caseItem.id}</h1>
          <p>
            {caseItem.department && <span>{caseItem.department}</span>}
            {caseItem.createdAt && (
              <span style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>
                {" · "}Created {format(new Date(caseItem.createdAt), "PP")}
              </span>
            )}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={reload}>
            <RefreshCw size={15} /> Refresh
          </button>
          {canAddEvidence() && (
            <Link className="btn btn-primary btn-sm" to={`/upload?caseId=${encodeURIComponent(caseId)}`}>
              <Plus size={15} /> Upload Evidence
            </Link>
          )}
          {canDeleteCases() && (
            <button className="btn btn-danger btn-sm" onClick={onDeleteCase}>
              <Trash2 size={15} /> Delete Case
            </button>
          )}
        </div>
      </div>

      {pageError && <div className="alert alert-error" style={{ marginBottom: "var(--sp-lg)" }}>{pageError}</div>}

      <div className="grid-2" style={{ marginBottom: "var(--sp-xl)" }}>
        {/* Case details editor */}
        <div className="card">
          <div className="card-header"><h2>Details</h2></div>
          <div className="card-content">
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canCreateOrEditCases()}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={!canCreateOrEditCases()}
              >
                <option value="OPEN">Open</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            {canCreateOrEditCases() && (
              <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
                <Save size={15} /> {saving ? "Saving…" : "Save Changes"}
              </button>
            )}
            {isProsecutor && (
              <p className="muted" style={{ marginTop: ".75rem", fontSize: ".8125rem" }}>Read-only role — edits disabled.</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="card-header"><h2>Notes ({notes.length})</h2></div>
          <div className="card-content" style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
            {notes.length === 0 && <p className="muted">No notes yet.</p>}
            {notes.slice().reverse().slice(0, 5).map((n, i) => (
              <div key={i} style={{ background: "var(--color-bg-tertiary)", padding: ".625rem .875rem", borderRadius: "var(--r)", fontSize: ".875rem" }}>
                <p>{n.text || n.content || String(n)}</p>
                {n.createdAt && <p style={{ color: "var(--color-text-muted)", fontSize: ".75rem", marginTop: ".25rem" }}>{format(new Date(n.createdAt), "PPp")}</p>}
              </div>
            ))}
            {!isProsecutor && (
              <div style={{ marginTop: ".75rem", display: "flex", gap: ".5rem" }}>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: 70, flex: 1 }}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note…"
                />
                <button className="btn btn-primary btn-sm" onClick={onAddNote} disabled={!note.trim() || addingNote} style={{ alignSelf: "flex-end" }}>
                  {addingNote ? "Adding…" : "Add"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Evidence */}
      <div className="card">
        <div className="card-header">
          <h2>Evidence ({caseEvidence.length})</h2>
          {canAddEvidence() && (
            <Link to={`/upload?caseId=${encodeURIComponent(caseId)}`} className="btn btn-sm btn-primary">
              <Plus size={14} /> Upload
            </Link>
          )}
        </div>
        <div className="table-container" style={{ border: "none", borderRadius: 0, boxShadow: "none" }}>
          <table>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Uploaded</th>
                {canDeleteEvidence() && <th></th>}
              </tr>
            </thead>
            <tbody>
              {caseEvidence.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>
                  <FileText size={28} style={{ color: "var(--color-gray-300)", display: "block", margin: "0 auto .5rem" }} />
                  No evidence for this case.
                </td></tr>
              )}
              {caseEvidence.map((ev) => (
                <tr key={ev.id}>
                  <td style={{ fontWeight: 500 }}>{ev.fileName || ev.id}</td>
                  <td style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>{ev.fileType || "—"}</td>
                  <td><EvidenceChip status={ev.status} /></td>
                  <td style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>
                    {ev.uploadedAt ? format(new Date(ev.uploadedAt), "PP") : "—"}
                  </td>
                  {canDeleteEvidence() && (
                    <td>
                      <div style={{ display: "flex", gap: ".375rem" }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => onRefreshStatus(ev.id)} title="Refresh status">
                          <RefreshCw size={14} />
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => onDeleteEvidence(ev.id)} title="Delete">
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
      </div>
    </div>
  );
}
