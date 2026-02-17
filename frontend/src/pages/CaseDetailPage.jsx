/**
 * CaseDetailPage.jsx
 *
 * CHANGED (Problems 3, 4, 6):
 *
 * Problem 3 — stale evidence:
 *   Added a useEffect that calls evidenceApi.getEvidence({ caseId }) directly
 *   when caseId changes.  The result is stored in local state (localEvidence).
 *   We no longer rely solely on the global context evidence snapshot.
 *
 * Problem 4 — delete note:
 *   Added trash icon next to each note in the Notes card.
 *   Clicking it calls deleteNote(caseId, noteId) from context.
 *   The note disappears optimistically from the list.
 *
 * Problem 6 — tags:
 *   Evidence table rows show up to 3 tags as small badges.
 *   The detail modal shows the full tags list and an inline editor to update
 *   them (calls updateEvidenceTags from context → PATCH /api/evidence/.../tags).
 */
import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
import * as caseApi from "../api/caseApi";
import * as evidenceApi from "../api/evidenceApi";
import {
  AlertCircle, FileText, Plus, Trash2, RefreshCw,
  ExternalLink, Tag, X, Check,
} from "lucide-react";
import { format } from "date-fns";

// ─── small helpers ────────────────────────────────────────────────────────────

function normalizeCaseStatus(s) {
  const u = String(s || "").toUpperCase();
  if (u === "ACTIVE")  return "OPEN";
  if (u === "PENDING") return "ON_HOLD";
  if (u === "ONHOLD" || u === "ON-HOLD") return "ON_HOLD";
  return u;
}

function EvidenceStatus({ status }) {
  const s = String(status || "").toUpperCase();
  const cls =
    s === "COMPLETED"  ? "badge-success" :
    s === "FAILED"     ? "badge-danger"  :
    s === "PROCESSING" ? "badge-warning" : "badge-gray";
  return (
    <span className={`badge ${cls}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {["COMPLETED", "FAILED", "PROCESSING"].includes(s) && <AlertCircle size={11} />}
      {s || "—"}
    </span>
  );
}

// Show 1–3 tags as small grey pills. Used in the evidence table row.
function TagPills({ tags = [], max = 3 }) {
  const visible = tags.slice(0, max);
  const rest    = tags.length - max;
  if (visible.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
      {visible.map((t) => (
        <span
          key={t}
          style={{
            fontSize: ".7rem",
            background: "var(--color-gray-100)",
            color: "var(--color-text-secondary)",
            borderRadius: 4,
            padding: "1px 6px",
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Tag size={9} /> {t}
        </span>
      ))}
      {rest > 0 && (
        <span style={{ fontSize: ".7rem", color: "var(--color-text-muted)" }}>+{rest} more</span>
      )}
    </div>
  );
}

// ─── detail modal ─────────────────────────────────────────────────────────────

function EvidenceDetailModal({ ev, onClose, onTagsSaved, canEdit }) {
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput,    setTagInput]    = useState("");
  const [localTags,   setLocalTags]   = useState((ev.userTags ?? ev.tags ?? []).slice());
  const [saving,      setSaving]      = useState(false);
  const [tagError,    setTagError]    = useState("");

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (!t || localTags.includes(t)) { setTagInput(""); return; }
    setLocalTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function removeTag(t) {
    setLocalTags((prev) => prev.filter((x) => x !== t));
  }

  async function saveTags() {
    setSaving(true);
    setTagError("");
    try {
      const updated = await evidenceApi.updateEvidenceTags(ev.id, localTags);
      onTagsSaved(updated);
      setEditingTags(false);
    } catch (err) {
      setTagError(err.message || "Failed to save tags");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--color-bg)",
          borderRadius: "var(--r-lg, 8px)",
          boxShadow: "0 20px 60px rgba(0,0,0,.3)",
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "1.5rem",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.125rem" }}>Evidence Details</h2>
          <button
            className="btn-icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: ".75rem", fontSize: ".875rem" }}>
          <DetailRow label="File Name"  value={ev.fileName || "—"} mono />
          <DetailRow label="Type"       value={ev.fileType || "—"} />
          <DetailRow label="Status"     value={<EvidenceStatus status={ev.status} />} />
          <DetailRow label="Uploaded"   value={ev.uploadedAt ? format(new Date(ev.uploadedAt), "PPp") : "—"} />
          {ev.description && (
            <DetailRow label="Description" value={ev.description} />
          )}
          {ev.processedAt && (
            <DetailRow label="Processed"  value={format(new Date(ev.processedAt), "PPp")} />
          )}
          {ev.processingError && (
            <div className="alert alert-error" style={{ fontSize: ".8125rem" }}>
              {ev.processingError}
            </div>
          )}
          {ev.extractedText && (
            <div>
              <p style={{ color: "var(--color-text-secondary)", fontSize: ".8125rem", marginBottom: ".25rem" }}>
                Extracted text
              </p>
              <div
                style={{
                  background: "var(--color-bg-tertiary)",
                  borderRadius: "var(--r)",
                  padding: ".625rem .875rem",
                  fontSize: ".8125rem",
                  fontFamily: "var(--font-mono, monospace)",
                  maxHeight: 160,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {ev.extractedText}
              </div>
            </div>
          )}

          {/* Tags section */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".375rem" }}>
              <p style={{ color: "var(--color-text-secondary)", fontSize: ".8125rem", margin: 0 }}>
                Tags
              </p>
              {canEdit && !editingTags && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: ".75rem", padding: "2px 8px" }}
                  onClick={() => setEditingTags(true)}
                >
                  Edit tags
                </button>
              )}
            </div>

            {!editingTags ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {localTags.length === 0 ? (
                  <span style={{ color: "var(--color-text-muted)", fontSize: ".8125rem" }}>No tags</span>
                ) : (
                  localTags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: ".8125rem",
                        background: "var(--color-primary-xlight)",
                        color: "var(--color-primary)",
                        borderRadius: 4,
                        padding: "2px 8px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Tag size={11} /> {t}
                    </span>
                  ))
                )}
              </div>
            ) : (
              <div>
                {tagError && (
                  <div className="alert alert-error" style={{ marginBottom: ".5rem", fontSize: ".8125rem" }}>
                    {tagError}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: ".5rem" }}>
                  {localTags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: ".8125rem",
                        background: "var(--color-primary-xlight)",
                        color: "var(--color-primary)",
                        borderRadius: 4,
                        padding: "2px 8px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Tag size={11} /> {t}
                      <button
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: "inherit", marginLeft: 2 }}
                        onClick={() => removeTag(t)}
                        aria-label={`Remove tag ${t}`}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: ".5rem" }}>
                  <input
                    className="form-input"
                    style={{ flex: 1, fontSize: ".875rem" }}
                    placeholder="Add tag…"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  />
                  <button className="btn btn-ghost btn-sm" onClick={addTag}>Add</button>
                  <button className="btn btn-primary btn-sm" onClick={saveTags} disabled={saving}>
                    {saving ? "Saving…" : <><Check size={14} /> Save</>}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setEditingTags(false); setLocalTags((ev.userTags ?? ev.tags ?? []).slice()); setTagError(""); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono = false }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: ".5rem" }}>
      <span style={{ color: "var(--color-text-secondary)", flexShrink: 0, fontSize: ".8125rem" }}>{label}</span>
      <span style={{ textAlign: "right", fontFamily: mono ? "monospace" : undefined, fontSize: ".875rem", wordBreak: "break-all" }}>
        {value}
      </span>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function CaseDetailPage() {
  const { caseId } = useParams();
  const navigate   = useNavigate();

  const {
    canCreateOrEditCases, canDeleteCases, canDeleteEvidence,
    canAddEvidence, isProsecutor,
  } = useAuth();

  const {
    cases, evidence: globalEvidence,
    updateCase, deleteCase, addCaseNote, deleteNote,
    deleteEvidence, refreshEvidenceStatus, reload,
    updateEvidenceTags,
  } = useCase();

  const [caseItem,       setCaseItem]       = useState(null);
  const [title,          setTitle]          = useState("");
  const [status,         setStatus]         = useState("OPEN");
  const [note,           setNote]           = useState("");
  const [pageError,      setPageError]      = useState("");
  const [saving,         setSaving]         = useState(false);
  const [addingNote,     setAddingNote]     = useState(false);
  const [deletingNote,   setDeletingNote]   = useState(null); // noteId being deleted
  const [detailOpen,     setDetailOpen]     = useState(false);
  const [detailEvidence, setDetailEvidence] = useState(null);

  // ── local evidence list (Problem 3) ────────────────────────────────────────
  // We maintain a local copy fetched specifically for this caseId.
  // This ensures the list is up to date even when the global context snapshot
  // is stale (e.g. after an upload in another tab, or after navigation).
  const [localEvidence,    setLocalEvidence]    = useState(null); // null = not yet fetched
  const [evidenceLoading,  setEvidenceLoading]  = useState(false);

  const fetchEvidenceForCase = useCallback(async (id) => {
    setEvidenceLoading(true);
    try {
      const data = await evidenceApi.getEvidence({ caseId: id });
      setLocalEvidence(Array.isArray(data) ? data : []);
    } catch (_) {
      // fall back to global context if fetch fails
      setLocalEvidence(null);
    } finally {
      setEvidenceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (caseId) fetchEvidenceForCase(caseId);
  }, [caseId, fetchEvidenceForCase]);

  // Use localEvidence when available; fall back to the global filtered list.
  const caseEvidence = useMemo(() => {
    const source = localEvidence !== null
      ? localEvidence
      : (globalEvidence || []).filter((e) => e.caseId === caseId);
    return source.slice().sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
  }, [localEvidence, globalEvidence, caseId]);

  // ── load case ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const local = (cases || []).find((c) => c.id === caseId);
    if (local) {
      setCaseItem(local);
      setTitle(local.title || "");
      setStatus(normalizeCaseStatus(local.status));
      return;
    }
    caseApi.getCase(caseId)
      .then((c) => {
        setCaseItem(c);
        setTitle(c.title || "");
        setStatus(normalizeCaseStatus(c.status));
      })
      .catch((e) => setPageError(e.message || "Could not load case"));
  }, [caseId, cases]);

  // ── keep detailEvidence in sync when tags are updated ─────────────────────

  useEffect(() => {
    if (detailEvidence) {
      const updated = caseEvidence.find((e) => e.id === detailEvidence.id);
      if (updated) setDetailEvidence(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseEvidence]);

  // ── actions ────────────────────────────────────────────────────────────────

  async function onSave() {
    setSaving(true);
    setPageError("");
    try {
      const updated = await updateCase(caseId, { title: title.trim(), status });
      setCaseItem(updated);
    } catch (e) {
      setPageError(e.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteCase() {
    if (!window.confirm("Delete this case and ALL its evidence? This cannot be undone.")) return;
    setPageError("");
    try {
      await deleteCase(caseId);
      navigate("/cases");
    } catch (e) {
      setPageError(e.message || "Delete failed");
    }
  }

  async function onAddNote() {
    if (!note.trim()) return;
    setAddingNote(true);
    setPageError("");
    try {
      await addCaseNote(caseId, note.trim());
      setNote("");
      // Reload so the new note appears in caseItem.notes
      await reload();
    } catch (e) {
      setPageError(e.message || "Could not add note");
    } finally {
      setAddingNote(false);
    }
  }

  async function onDeleteNote(noteId) {
    if (!window.confirm("Delete this note?")) return;
    setDeletingNote(noteId);
    setPageError("");
    try {
      await deleteNote(caseId, noteId);
      // The context has already patched local state optimistically.
      // Also refresh caseItem from the updated cases array.
      await reload();
    } catch (e) {
      setPageError(e.message || "Could not delete note");
    } finally {
      setDeletingNote(null);
    }
  }

  async function onDeleteEvidence(evidenceId) {
    if (!window.confirm("Delete this evidence item?")) return;
    setPageError("");
    try {
      await deleteEvidence(evidenceId);
      setLocalEvidence((prev) => prev ? prev.filter((e) => e.id !== evidenceId) : null);
    } catch (e) {
      setPageError(e.message || "Delete failed");
    }
  }

  async function onRefreshStatus(evidenceId) {
    setPageError("");
    try {
      await refreshEvidenceStatus(evidenceId);
      await fetchEvidenceForCase(caseId);
    } catch (e) {
      setPageError(e.message || "Refresh failed");
    }
  }

  async function onOpenEvidence(evidenceId) {
    try {
      const r = await evidenceApi.getEvidenceReadUrl(evidenceId);
      const url = r?.readUrl;
      if (!url) throw new Error("Missing readUrl");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setPageError(e.message || "Could not get read URL");
    }
  }

  function onShowEvidenceDetails(ev) {
    setDetailEvidence(ev);
    setDetailOpen(true);
  }

  function onTagsSaved(updatedEv) {
    setLocalEvidence((prev) =>
      prev ? prev.map((e) => (e.id === updatedEv.id ? updatedEv : e)) : null
    );
    setDetailEvidence(updatedEv);
    // Also propagate to global context
    updateEvidenceTags(updatedEv.id, updatedEv.userTags ?? updatedEv.tags ?? []).catch(() => {});
  }

  // ── loading / error guards ─────────────────────────────────────────────────

  if (!caseItem) {
    return (
      <div className="page-container">
        {pageError ? (
          <div className="alert alert-error">{pageError}</div>
        ) : (
          <div className="loading-screen" style={{ minHeight: 200 }}>
            <div className="loading-spinner" />
            <span className="loading-text">Loading case…</span>
          </div>
        )}
      </div>
    );
  }

  const notes = caseItem?.notes ?? [];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ wordBreak: "break-word" }}>{caseItem.title || "Untitled Case"}</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>
            Department: {caseItem.department || "—"} ·{" "}
            Created: {caseItem.createdAt ? format(new Date(caseItem.createdAt), "PP") : "—"}
          </p>
        </div>
        <div className="page-actions">
          {canDeleteCases() && (
            <button className="btn btn-danger btn-sm" onClick={onDeleteCase}>
              <Trash2 size={15} /> Delete Case
            </button>
          )}
        </div>
      </div>

      {pageError && (
        <div className="alert alert-error" style={{ marginBottom: "var(--sp-md)" }}>
          {pageError}
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: "var(--sp-xl)" }}>
        {/* Edit card */}
        <div className="card">
          <div className="card-header"><h2>Case Details</h2></div>
          <div className="card-content" style={{ display: "flex", flexDirection: "column", gap: ".875rem" }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isProsecutor}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isProsecutor}
              >
                <option value="OPEN">Open</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            {!isProsecutor && (
              <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            )}
            {isProsecutor && (
              <p className="muted" style={{ marginTop: ".75rem", fontSize: ".8125rem" }}>
                Read-only role — edits disabled.
              </p>
            )}
          </div>
        </div>

        {/* Notes card */}
        <div className="card">
          <div className="card-header"><h2>Notes ({notes.length})</h2></div>
          <div className="card-content" style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
            {notes.length === 0 && (
              <p className="muted">No notes yet.</p>
            )}
            {notes.slice().reverse().map((n) => (
              <div
                key={n.id || n.text}
                style={{
                  background: "var(--color-bg-tertiary)",
                  padding: ".625rem .875rem",
                  borderRadius: "var(--r)",
                  fontSize: ".875rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: ".5rem",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, wordBreak: "break-word" }}>{n.text || n.content || String(n)}</p>
                  {n.createdAt && (
                    <p style={{ color: "var(--color-text-muted)", fontSize: ".75rem", marginTop: ".25rem" }}>
                      {format(new Date(n.createdAt), "PPp")}
                    </p>
                  )}
                </div>
                {!isProsecutor && n.id && (
                  <button
                    className="btn-icon"
                    style={{ flexShrink: 0, color: "var(--color-danger)", borderColor: "var(--color-danger-light, #fecaca)" }}
                    title="Delete note"
                    disabled={deletingNote === n.id}
                    onClick={() => onDeleteNote(n.id)}
                    aria-label="Delete note"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
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
                <button
                  className="btn btn-primary btn-sm"
                  onClick={onAddNote}
                  disabled={!note.trim() || addingNote}
                  style={{ alignSelf: "flex-end" }}
                >
                  {addingNote ? "Adding…" : "Add"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Evidence table */}
      <div className="card">
        <div className="card-header">
          <h2>
            Evidence ({caseEvidence.length})
            {evidenceLoading && (
              <span className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, marginLeft: 8, display: "inline-block" }} />
            )}
          </h2>
          {canAddEvidence() && (
            <Link
              to={`/upload?caseId=${encodeURIComponent(caseId)}`}
              className="btn btn-sm btn-primary"
            >
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
                <th style={{ width: 260 }}></th>
                {canDeleteEvidence() && <th></th>}
              </tr>
            </thead>
            <tbody>
              {caseEvidence.length === 0 && !evidenceLoading && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>
                    <FileText size={28} style={{ color: "var(--color-gray-300)", display: "block", margin: "0 auto .5rem" }} />
                    No evidence for this case.
                  </td>
                </tr>
              )}
              {caseEvidence.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <div>
                      <span style={{ fontWeight: 500, fontSize: ".875rem" }}>
                        {ev.fileName || ev.id}
                      </span>
                      {/* Show up to 3 tags inline (Problem 6) */}
                      <TagPills tags={ev.tags ?? ev.userTags ?? []} max={3} />
                    </div>
                  </td>
                  <td style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>
                    {ev.fileType || "—"}
                  </td>
                  <td>
                    <EvidenceStatus status={ev.status} />
                  </td>
                  <td style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>
                    {ev.uploadedAt ? format(new Date(ev.uploadedAt), "PP") : "—"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: ".375rem", justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onShowEvidenceDetails(ev)}
                        title="View details"
                      >
                        Details
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onOpenEvidence(ev.id)}
                        title="Open file"
                      >
                        <ExternalLink size={13} /> Open
                      </button>
                      {ev.status !== "COMPLETED" && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => onRefreshStatus(ev.id)}
                          title="Refresh status"
                        >
                          <RefreshCw size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                  {canDeleteEvidence() && (
                    <td>
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        title="Delete evidence"
                        onClick={() => onDeleteEvidence(ev.id)}
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

      {/* Evidence detail modal (Problem 6) */}
      {detailOpen && detailEvidence && (
        <EvidenceDetailModal
          ev={detailEvidence}
          onClose={() => setDetailOpen(false)}
          onTagsSaved={onTagsSaved}
          canEdit={canAddEvidence()}
        />
      )}
    </div>
  );
}
