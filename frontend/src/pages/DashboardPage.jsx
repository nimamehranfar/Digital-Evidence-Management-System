import { useCase } from "../context/CaseContext";
import { Link } from "react-router-dom";
import {
  Briefcase, FileText, Clock, CheckCircle, XCircle,
  AlertCircle, FolderOpen, UploadCloud,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";

const STATUS_META = {
  OPEN:       { label: "Open",       className: "badge-info" },
  ON_HOLD:    { label: "On hold",    className: "badge-warning" },
  CLOSED:     { label: "Closed",     className: "badge-gray" },
  // legacy
  PENDING:    { label: "On hold",    className: "badge-warning" },
  ACTIVE:     { label: "Open",       className: "badge-info" },
  COMPLETED:  { label: "Completed",  className: "badge-success" },
  FAILED:     { label: "Failed",     className: "badge-danger" },
};

function normalizeCaseStatus(s) {
  const u = String(s || "").toUpperCase();
  if (u === "ACTIVE") return "OPEN";
  if (u === "PENDING") return "ON_HOLD";
  if (u === "ONHOLD" || u === "ON-HOLD") return "ON_HOLD";
  return u || "OPEN";
}

function CaseStatus({ status }) {
  const s = normalizeCaseStatus(status);
  const meta = STATUS_META[s] || { label: s, className: "badge-gray" };
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}

function EvidenceStatus({ status }) {
  const s = (status || "").toUpperCase();
  const map = {
    COMPLETED:  "status-chip-completed",
    PROCESSING: "status-chip-processing",
    UPLOADED:   "status-chip-uploaded",
    FAILED:     "status-chip-failed",
  };
  return (
    <span className={`status-chip ${map[s] || "status-chip-uploaded"}`}>
      {s === "COMPLETED"  && <CheckCircle  size={11} />}
      {s === "FAILED"     && <XCircle      size={11} />}
      {s === "PROCESSING" && <Clock        size={11} />}
      {!["COMPLETED","FAILED","PROCESSING"].includes(s) && <AlertCircle size={11} />}
      {s || "—"}
    </span>
  );
}

export default function DashboardPage() {
  const { user, isProsecutor, canCreateOrEditCases, canAddEvidence } = useAuth();
  const { getAccessibleCases, evidence } = useCase();

  const cases = getAccessibleCases() || [];
  const openCases  = cases.filter((c) => normalizeCaseStatus(c.status) !== "CLOSED");
  const closedCases = cases.filter((c) => normalizeCaseStatus(c.status) === "CLOSED");

  const accessIds = new Set(cases.map((c) => c.id));
  const recentEvidence = (evidence || [])
    .filter((e) => accessIds.has(e.caseId))
    .slice()
    .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
    .slice(0, 8);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.name || "User"}</p>
        </div>
        <div className="page-actions">
          {canCreateOrEditCases() && (
            <Link to="/cases" className="btn btn-primary btn-sm">
              <Briefcase size={16} /> New Case
            </Link>
          )}
          {canAddEvidence() && (
            <Link to="/upload" className="btn btn-secondary btn-sm">
              <UploadCloud size={16} /> Upload Evidence
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Briefcase size={22} /></div>
          <div className="stat-content">
            <div className="stat-value">{cases.length}</div>
            <div className="stat-label">Total accessible cases</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "var(--color-success-bg)", color: "var(--color-success)" }}>
            <FolderOpen size={22} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{openCases.length}</div>
            <div className="stat-label">Active / open cases</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fdf4ff", color: "#9333ea" }}>
            <FileText size={22} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{recentEvidence.length}</div>
            <div className="stat-label">Recent evidence items</div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid-2" style={{ marginBottom: "var(--sp-xl)" }}>
        {/* Open cases */}
        <div className="card">
          <div className="card-header">
            <h2>Active Cases</h2>
            <Link to="/cases" className="link-button">View all →</Link>
          </div>
          <div className="card-content">
            {openCases.length === 0 ? (
              <div className="empty-state">
                <FolderOpen size={36} className="empty-state-icon" />
                <p>No open cases.</p>
              </div>
            ) : (
              openCases.slice(0, 6).map((c) => (
                <Link key={c.id} to={`/cases/${c.id}`} className="list-item">
                  <div className="list-item-title">{c.title || c.id}</div>
                  <div className="list-item-meta">
                    <span>{c.department || "—"}</span>
                    <span>·</span>
                    <CaseStatus status={c.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent evidence */}
        <div className="card">
          <div className="card-header">
            <h2>Recent Evidence</h2>
            <Link to="/search" className="link-button">Search →</Link>
          </div>
          <div className="card-content">
            {recentEvidence.length === 0 ? (
              <div className="empty-state">
                <FileText size={36} className="empty-state-icon" />
                <p>No evidence uploaded yet.</p>
                {canAddEvidence() && (
                  <Link to="/upload" className="btn btn-primary btn-sm" style={{ marginTop: "1rem" }}>
                    Upload Evidence
                  </Link>
                )}
              </div>
            ) : (
              recentEvidence.map((e) => (
                <div key={e.id} className="list-item">
                  <div className="list-item-title">
                    <EvidenceStatus status={e.status} />
                    <span>{e.fileName || e.id}</span>
                  </div>
                  <div className="list-item-meta">
                    <span>Case: {e.caseId}</span>
                    {e.uploadedAt && (
                      <>
                        <span>·</span>
                        <span>{format(new Date(e.uploadedAt), "PP")}</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Closed / other cases */}
      {closedCases.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Closed / Resolved Cases</h2>
          </div>
          <div className="card-content">
            {closedCases.slice(0, 6).map((c) => (
              <Link key={c.id} to={`/cases/${c.id}`} className="list-item">
                <div className="list-item-title">{c.title || c.id}</div>
                <div className="list-item-meta">
                  <span>{c.department || "—"}</span>
                  <span>·</span>
                  <CaseStatus status={c.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/*{isProsecutor && (*/}
      {/*  <div className="alert alert-info" style={{ marginTop: "var(--sp-lg)" }}>*/}
      {/*    <AlertCircle size={18} />*/}
      {/*    <span>Prosecutor — read-only view. Upload, create, and delete actions are disabled.</span>*/}
      {/*  </div>*/}
      {/*)}*/}
    </div>
  );
}
