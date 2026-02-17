import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as evidenceApi from "../api/evidenceApi";
import { Search, FileText, CheckCircle, XCircle, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import EvidenceDetailsModal from "../components/EvidenceDetailsModal";

const STATUS_CHIP = {
  COMPLETED:  "status-chip-completed",
  PROCESSING: "status-chip-processing",
  UPLOADED:   "status-chip-uploaded",
  FAILED:     "status-chip-failed",
};

function EvidenceChip({ status }) {
  const s = (status || "UPLOADED").toUpperCase();
  return (
    <span className={`status-chip ${STATUS_CHIP[s] || "status-chip-uploaded"}`}>
      {s === "COMPLETED"  && <CheckCircle  size={11} />}
      {s === "FAILED"     && <XCircle      size={11} />}
      {s === "PROCESSING" && <Clock        size={11} />}
      {!["COMPLETED","FAILED","PROCESSING"].includes(s) && <AlertCircle size={11} />}
      {s}
    </span>
  );
}

export default function SearchPage() {
  const { isCaseOfficer, user } = useAuth();

  const [query, setQuery]   = useState("");
  const [caseId, setCaseId] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError]   = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailEvidence, setDetailEvidence] = useState(null);

  async function openEvidence(evidenceId) {
    const id = evidenceId || "";
    if (!id) return;
    const r = await evidenceApi.getEvidenceReadUrl(id);
    const url = r?.readUrl;
    if (!url) throw new Error("Missing readUrl");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function showDetails(row) {
    const id = row?.id || row?.evidenceId;
    if (!id) return;
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const full = await evidenceApi.getEvidenceById(id);
      setDetailEvidence({ ...(row || {}), ...(full || {}) });
    } catch {
      // Fallback to whatever we have from search results.
      setDetailEvidence(row || {});
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim() && !caseId.trim()) {
      setError("Enter a search term or case ID.");
      return;
    }
    setSearching(true);
    setError("");
    setResults(null);
    try {
      const params = {};
      if (query.trim())  params.q      = query.trim();
      if (caseId.trim()) params.caseId = caseId.trim();

      const res = await evidenceApi.searchEvidence(params);
      setResults(Array.isArray(res) ? res : res?.results || res?.value || []);
    } catch (e) {
      setError(e.message || "Search failed");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Evidence Search</h1>
          <p>
            Full-text search across all evidence{isCaseOfficer ? ` in the ${user?.department || "assigned"} department` : ""}.
          </p>
        </div>
      </div>

      {/* Search form */}
      <div className="card" style={{ marginBottom: "var(--sp-xl)", padding: "1.5rem" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "2 1 240px" }}>
            <label className="form-label">Keyword / Full-text</label>
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                className="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search evidence content, tags…"
              />
            </div>
          </div>
          <div style={{ flex: "1 1 180px" }}>
            <label className="form-label">Case ID (optional)</label>
            <input
              className="form-input"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder="e.g. case-001"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={searching} style={{ height: 40, alignSelf: "flex-end" }}>
            <Search size={16} />
            {searching ? "Searching…" : "Search"}
          </button>
        </form>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: "var(--sp-md)" }}>{error}</div>}

      {/* Results */}
      {results !== null && (
        <div>
          <p style={{ marginBottom: "var(--sp-md)", color: "var(--color-text-secondary)", fontSize: ".875rem" }}>
            {results.length} result{results.length !== 1 ? "s" : ""}
          </p>

          {results.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <FileText size={40} className="empty-state-icon" />
                <h3>No results found</h3>
                <p>Try different keywords or a different case ID.</p>
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Case</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Uploaded</th>
                    <th style={{ width: 220 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id || r.evidenceId}>
                      <td style={{ fontWeight: 500 }}>
                        {r.fileName || r.file_name || r.id || r.evidenceId}
                      </td>
                      <td style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>
                        {r.caseId || r.case_id || "—"}
                      </td>
                      <td style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>
                        {r.fileType || r.file_type || "—"}
                      </td>
                      <td><EvidenceChip status={r.status} /></td>
                      <td style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>
                        {r.uploadedAt || r.uploaded_at
                          ? format(new Date(r.uploadedAt || r.uploaded_at), "PP")
                          : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => showDetails(r)}
                          >
                            Show details
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={async () => {
                              try { await openEvidence(r.id || r.evidenceId); }
                              catch (e) { setError(e?.message || "Open failed"); }
                            }}
                            title="Open / Download"
                          >
                            <ExternalLink size={14} /> Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <EvidenceDetailsModal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailEvidence(null); }}
        evidence={detailLoading ? { fileName: "Loading…" } : detailEvidence}
      />
    </div>
  );
}
