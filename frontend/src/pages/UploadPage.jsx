import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
import { Upload, FileText, Loader, CheckCircle, AlertCircle } from "lucide-react";

const POLL_INTERVAL_MS = 1200;
const POLL_MAX_ATTEMPTS = 60;

export default function UploadPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { canAddEvidence } = useAuth();
  const { getAccessibleCases, uploadEvidenceSas, refreshEvidenceStatus, reload } = useCase();

  const [selectedFile, setSelectedFile] = useState(null);
  const [caseId, setCaseId] = useState(searchParams.get("caseId") || "");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const cases = getAccessibleCases();

  useEffect(() => {
    if (!caseId && cases.length > 0) {
      setCaseId(cases[0].id);
    }
  }, [cases]);

  if (!canAddEvidence()) {
    return (
      <div className="page-container">
        <div className="card">
          <h2>Not authorized</h2>
          <p>Your role does not allow evidence uploads.</p>
        </div>
      </div>
    );
  }

  function pickFile() {
    fileInputRef.current?.click();
  }

  function onFileChange(e) {
    const f = e.target.files?.[0] || null;
    setSelectedFile(f);
  }

  async function pollStatus(evidenceId) {
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      const s = await refreshEvidenceStatus(evidenceId);
      const st = (s?.status || s?.state || "").toUpperCase();
      if (st) setStatus(st);

      if (st === "COMPLETED" || st === "FAILED") return st;

      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    return "TIMEOUT";
  }

  async function onUpload() {
    setError("");
    setStatus("");
    if (!caseId) return setError("Select a case.");
    if (!selectedFile) return setError("Select a file.");

    setUploading(true);
    try {
      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await uploadEvidenceSas({
        caseId,
        file: selectedFile,
        description,
        tags: tagsArray,
      });

      setStatus("UPLOADED");

      const finalStatus = await pollStatus(created.id || created.evidenceId);
      await reload();

      if (finalStatus === "COMPLETED") {
        navigate(`/cases/${caseId}`, { replace: true });
      }
    } catch (e) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Upload evidence</h1>
          <p>SAS-based upload: init → PUT to Blob SAS URL → confirm → processing → search index.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="card-header">
          <h2>Upload form</h2>
        </div>
        <div className="card-content">
          <div className="form-group">
            <label>Case</label>
            <select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title || c.id} ({c.department})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>File</label>
            <div className="button-group">
              <button className="btn btn-secondary" onClick={pickFile} disabled={uploading}>
                <Upload size={18} /> Choose file
              </button>
              <span className="muted">{selectedFile ? selectedFile.name : "No file selected"}</span>
            </div>
            <input ref={fileInputRef} type="file" onChange={onFileChange} style={{ display: "none" }} />
          </div>

          <div className="form-group">
            <label>Description (optional)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" disabled={uploading} />
          </div>

          <div className="form-group">
            <label>Tags (optional, comma separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., phone, screenshot, invoice" disabled={uploading} />
          </div>

          <div className="button-group">
            <button className="btn btn-primary" onClick={onUpload} disabled={uploading || !caseId || !selectedFile}>
              {uploading ? <Loader size={18} className="spin" /> : <FileText size={18} />}
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>

          {status ? (
            <div className="alert alert-info" style={{ marginTop: "1rem" }}>
              {status === "COMPLETED" ? <CheckCircle size={18} /> : null}
              {status === "FAILED" ? <AlertCircle size={18} /> : null}
              <span style={{ marginLeft: 8 }}>Status: {status}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
