import { X } from "lucide-react";

function Field({ label, value, mono = false }) {
  const isEmpty = value === undefined || value === null || value === "";
  return (
    <div style={{ marginBottom: ".75rem" }}>
      <div style={{ fontSize: ".75rem", color: "var(--color-text-secondary)", marginBottom: ".25rem" }}>{label}</div>
      <div
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" : undefined,
          fontSize: mono ? ".8rem" : undefined,
          color: isEmpty ? "var(--color-text-secondary)" : undefined,
        }}
      >
        {isEmpty ? "—" : String(value)}
      </div>
    </div>
  );
}

export default function EvidenceDetailsModal({ open, onClose, evidence }) {
  if (!open) return null;

  const ev = evidence || {};
  const tags = Array.isArray(ev.tags) ? ev.tags.join(", ") : ev.tags;

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth: 860 }}>
        <div className="modal-header">
          <h2>Evidence details</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: "70vh", overflow: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <Field label="ID" value={ev.id || ev.evidenceId} mono />
              <Field label="Case ID" value={ev.caseId} mono />
              <Field label="Department" value={ev.department} mono />
              <Field label="File name" value={ev.fileName} />
              <Field label="File type" value={ev.fileType} />
              <Field label="File size" value={ev.fileSize} />
            </div>
            <div>
              <Field label="Status" value={ev.status} />
              <Field label="Uploaded at" value={ev.uploadedAt} mono />
              <Field label="Uploaded by" value={ev.uploadedBy} mono />
              <Field label="Status updated at" value={ev.statusUpdatedAt} mono />
              <Field label="Processed at" value={ev.processedAt} mono />
              <Field label="OCR lines" value={ev.ocrLines} />
            </div>
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--color-border)", margin: "1rem 0" }} />

          <Field label="Description" value={ev.description} />
          <Field label="Tags" value={tags} />
          <Field label="Extracted text" value={ev.extractedText} />

          <hr style={{ border: 0, borderTop: "1px solid var(--color-border)", margin: "1rem 0" }} />

          <Field label="blobPathRaw" value={ev.blobPathRaw} mono />
          <Field label="blobUrlRaw" value={ev.blobUrlRaw} mono />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
