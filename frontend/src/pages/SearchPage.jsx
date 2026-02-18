/**
 * SearchPage.jsx
 *
 * CHANGED:
 *   1. Imported `useCase` from CaseContext and pulled `getAccessibleCases()`.
 *      This mirrors exactly what UploadPage does — the case list is already
 *      loaded in CaseContext so no extra API call is made.
 *
 *   2. Built `caseNameMap` ({ [caseId]: title }) from the accessible cases.
 *      Used in the results table to display a human-readable case name
 *      instead of the raw caseId GUID.
 *
 *   3. Replaced the free-text "Case ID" input with a <select> dropdown that
 *      lists every accessible case by name.  The selected option's value is
 *      still the actual case ID (sent to the API as params.caseId) so the
 *      backend contract is unchanged.  An "All cases" empty option preserves
 *      the ability to search without scoping to a specific case.
 *
 *   4. Updated the validation message to say "select a case" instead of
 *      "enter a case ID" to match the new UI affordance.
 *
 *   Nothing else changed — all API calls, modal logic, and result rendering
 *   are identical to the previous version.
 */
import { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
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
      {!["COMPLETED", "FAILED", "PROCESSING"].includes(s) && <AlertCircle size={11} />}
      {s}
    </span>
  );
}

export default function SearchPage() {
  const { isCaseOfficer, user } = useAuth();

  // Pull the cases list from the global context (same source as UploadPage).
  // CaseContext already fetched these on login — no extra network request.
  const { getAccessibleCases } = useCase();
  const cases = getAccessibleCases() || [];

  const [query,   setQuery]   = useState("");
  const [caseId,  setCaseId]  = useState("");   // holds the selected case ID value
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error,   setError]   = useState("");
  const [detailOpen,    setDetailOpen]    = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailEvidence, setDetailEvidence] = useState(null);

  // Build a { [caseId]: caseTitle } map for displaying names in the results table.
  // useMemo so it doesn't rebuild on every keystroke.
  const caseNameMap = useMemo(() => {
    const map = {};
    for (const c of cases) {
      if (c.id) map[c.id] = c.title || c.id;
    }
    return map;
  }, [cases]);

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
      setError("Enter a search term or select a case.");
      return;
    }
    setSearching(true);
    setError("");
    setResults(null);
    try {
      const params = {};
      if (query.trim())  params.q      = query.trim() + "*";
      if (caseId.trim()) params.caseId = caseId.trim();

      const res = await evidenceApi.searchEvidence(params);
      setResults(Array.isArray(res) ? res : res?.results || res?.value || []);
    } catch (err) {
      setError(err.message || "Search failed");
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
            Full-text search across all evidence
            {isCaseOfficer ? ` in the ${user?.department || "assigned"} department` : ""}.
          </p>
        </div>
      </div>

      {/* Search form */}
      <div className="card" style={{ marginBottom: "var(--sp-xl)", padding: "1.5rem" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", alignItems: "flex-end" }}>

          {/* Keyword field — unchanged */}
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

          {/*
            FIX: replaced the free-text <input> that required the user to know
            and type the raw case ID with a <select> dropdown that lists every
            accessible case by its human-readable title.

            The <option value={c.id}> means the actual caseId GUID is still
            sent to the backend as `params.caseId` — the API contract is
            completely unchanged.

            The empty first option ("All cases") sets caseId back to "" which
            means no case-scoped filter is applied, preserving the ability to
            do a global keyword search.
          */}
          <div style={{ flex: "1 1 200px" }}>
            <label className="form-label">Case (optional)</label>
            <select
              className="form-select"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
            >
              <option value="">All cases</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title || c.id}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={searching}
            style={{ height: 40, alignSelf: "flex-end" }}
          >
            <Search size={16} />
            {searching ? "Searching…" : "Search"}
          </button>
        </form>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "var(--sp-md)" }}>
          {error}
        </div>
      )}

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
                <p>Try different keywords or a different case.</p>
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
                  {results.map((r) => {
                    const rawCaseId = r.caseId || r.case_id;
                    return (
                      <tr key={r.id || r.evidenceId}>
                        <td style={{ fontWeight: 500 }}>
                          {r.fileName || r.file_name || r.id || r.evidenceId}
                        </td>
                        {/*
                          FIX: previously showed the raw caseId GUID directly.
                          Now we look up the case title from caseNameMap.
                          If the case isn't in the accessible list (e.g. it was
                          deleted or the user lost access), we fall back to the
                          raw ID rather than showing nothing.
                        */}
                        <td style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>
                          {caseNameMap[rawCaseId] || rawCaseId || "—"}
                        </td>
                        <td style={{ color: "var(--color-text-secondary)", fontSize: ".875rem" }}>
                          {r.fileType || r.file_type || "—"}
                        </td>
                        <td>
                          <EvidenceChip status={r.status} />
                        </td>
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
                                catch (err) { setError(err?.message || "Open failed"); }
                              }}
                              title="Open / Download"
                            >
                              <ExternalLink size={14} /> Open
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
