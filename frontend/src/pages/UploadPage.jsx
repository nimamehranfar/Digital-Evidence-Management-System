import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
import * as evidenceApi from "../api/evidenceApi";
import {
  UploadCloud, CheckCircle, XCircle, Clock,
  RefreshCw, FileText, ArrowLeft, AlertCircle,
} from "lucide-react";

const POLL_INTERVAL = 3000;
const MAX_POLLS     = 20;

function formatBytes(bytes) {
  if (!bytes) return "—";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

export default function UploadPage() {
  // ── ALL hooks before any conditional return (Rules of Hooks) ──────────────
  const { canAddEvidence } = useAuth();
  const { getAccessibleCases } = useCase();
  const [searchParams] = useSearchParams();

  const cases = getAccessibleCases() || [];

  const [caseId, setCaseId]             = useState(searchParams.get("caseId") || "");
  const [file, setFile]                 = useState(null);
  const [dragging, setDragging]         = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [progress, setProgress]         = useState(0);
  const [uploadError, setUploadError]   = useState("");
  const [uploadedItems, setUploadedItems] = useState([]);

  const inputRef = useRef();
  const pollRef  = useRef(null);

  // useCallback hooks declared unconditionally
  const onDragOver  = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);
  const onDrop      = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  // cleanup on unmount — declared unconditionally
  useEffect(() => () => clearInterval(pollRef.current), []);

  // ── Conditional render guard (AFTER all hooks) ─────────────────────────────
  if (!canAddEvidence()) {
    return (
      <div className="page-container centered-message">
        <div className="card card-compact" style={{ textAlign: "center" }}>
          <UploadCloud size={40} style={{ color: "var(--color-gray-300)", marginBottom: "1rem" }} />
          <h2>Upload not available</h2>
          <p className="muted">Prosecutors cannot upload evidence.</p>
        </div>
      </div>
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function onFileChange(e) {
    if (e.target.files[0]) setFile(e.target.files[0]);
  }

  function startPolling(evidenceId) {
    let count = 0;
    pollRef.current = setInterval(async () => {
      count++;
      if (count > MAX_POLLS) { clearInterval(pollRef.current); return; }
      try {
        const res = await evidenceApi.getEvidenceStatus(evidenceId);
        const newStatus = res?.status || "PROCESSING";
        setUploadedItems((prev) =>
          prev.map((item) => item.id === evidenceId ? { ...item, status: newStatus } : item)
        );
        if (["COMPLETED", "FAILED"].includes(newStatus.toUpperCase())) {
          clearInterval(pollRef.current);
        }
      } catch (_) {}
    }, POLL_INTERVAL);
  }

  async function handleUpload() {
    if (!file || !caseId) { setUploadError("Select a case and a file."); return; }
    setUploading(true);
    setUploadError("");
    setProgress(0);
    try {
      setProgress(10);
      const init = await evidenceApi.uploadInit({
        caseId,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
      });
      setProgress(30);
      await evidenceApi.uploadToSasUrl(init.sasUrl, file, (pct) => {
        setProgress(30 + Math.round(pct * 0.5));
      });
      setProgress(80);
      await evidenceApi.uploadConfirm({ evidenceId: init.evidenceId, caseId });
      setProgress(100);
      setUploadedItems((prev) => [{
        id: init.evidenceId,
        fileName: file.name,
        fileSize: file.size,
        caseId,
        status: "UPLOADED",
        uploadedAt: new Date().toISOString(),
      }, ...prev]);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      startPolling(init.evidenceId);
    } catch (e) {
      setUploadError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function statusIcon(s) {
    const u = (s || "").toUpperCase();
    if (u === "COMPLETED")  return <CheckCircle  size={16} style={{ color: "var(--color-success)" }} />;
    if (u === "FAILED")     return <XCircle      size={16} style={{ color: "var(--color-danger)"  }} />;
    if (u === "PROCESSING") return <Clock        size={16} style={{ color: "var(--color-warning)" }} />;
    return <AlertCircle size={16} style={{ color: "var(--color-info)" }} />;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Upload Evidence</h1>
          <p>Files are processed by Azure Functions and indexed for search automatically.</p>
        </div>
        {caseId && (
          <Link to={`/cases/${encodeURIComponent(caseId)}`} className="btn btn-secondary btn-sm">
            <ArrowLeft size={15} /> Back to Case
          </Link>
        )}
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* Upload form */}
        <div className="card">
          <div className="card-header"><h2>New Upload</h2></div>
          <div className="card-content">
            <div className="form-group">
              <label className="form-label">Case *</label>
              <select
                className="form-select"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                disabled={uploading}
              >
                <option value="">Select a case…</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>{c.title || c.id}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">File *</label>
              <div
                className={`drop-zone${dragging ? " drag-active" : ""}`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
              >
                <UploadCloud size={36} className="drop-zone-icon" />
                {file ? (
                  <><h3>{file.name}</h3><p>{formatBytes(file.size)}</p></>
                ) : (
                  <><h3>Drag &amp; drop or click to select</h3><p>PDF, images, video, audio, or text</p></>
                )}
                <input ref={inputRef} type="file" style={{ display: "none" }} onChange={onFileChange} />
              </div>
            </div>

            {uploadError && (
              <div className="alert alert-error" style={{ marginBottom: "var(--sp-md)" }}>
                <AlertCircle size={16} /> {uploadError}
              </div>
            )}

            {uploading && (
              <div className="upload-progress" style={{ marginBottom: "var(--sp-md)" }}>
                <p style={{ fontSize: ".875rem", color: "var(--color-text-secondary)", marginBottom: ".375rem" }}>
                  Uploading… {progress}%
                </p>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <button
              className="btn btn-primary btn-full"
              onClick={handleUpload}
              disabled={uploading || !file || !caseId}
            >
              {uploading
                ? <><RefreshCw size={16} className="spinner" /> Uploading…</>
                : <><UploadCloud size={16} /> Upload File</>}
            </button>
          </div>
        </div>

        {/* Session history */}
        <div className="card">
          <div className="card-header"><h2>This Session</h2></div>
          {uploadedItems.length === 0 ? (
            <div className="empty-state">
              <FileText size={32} className="empty-state-icon" />
              <p>No uploads yet.</p>
            </div>
          ) : (
            <div className="card-content" style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
              {uploadedItems.map((item) => (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center", gap: ".625rem",
                  padding: ".625rem", background: "var(--color-bg-tertiary)", borderRadius: "var(--r)",
                }}>
                  {statusIcon(item.status)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: ".875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.fileName}
                    </p>
                    <p style={{ fontSize: ".75rem", color: "var(--color-text-secondary)" }}>
                      {item.caseId} · {formatBytes(item.fileSize)}
                    </p>
                  </div>
                  <span className={`status-chip status-chip-${(item.status || "uploaded").toLowerCase()}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
