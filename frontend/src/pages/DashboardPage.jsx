import { useCase } from "../context/CaseContext";
import { Link } from "react-router-dom";
import { Briefcase, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";

function statusIcon(status) {
  const s = (status || "").toUpperCase();
  if (s === "COMPLETED") return <CheckCircle size={18} className="status-icon success" />;
  if (s === "FAILED") return <XCircle size={18} className="status-icon error" />;
  return <Clock size={18} className="status-icon pending" />;
}

export default function DashboardPage() {
  const { user, isProsecutor } = useAuth();
  const { getAccessibleCases, evidence } = useCase();

  const cases = getAccessibleCases();
  const openCases = cases.filter((c) => (c.status || "").toUpperCase() === "OPEN");
  const otherCases = cases.filter((c) => (c.status || "").toUpperCase() !== "OPEN");

  const accessibleCaseIds = cases.map((c) => c.id);
  const recentEvidence = (evidence || [])
    .filter((e) => accessibleCaseIds.includes(e.caseId))
    .slice()
    .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
    .slice(0, 6);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome, {user?.name || "User"}.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Briefcase size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{cases.length}</div>
            <div className="stat-label">Accessible cases</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{recentEvidence.length}</div>
            <div className="stat-label">Recent evidence items</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h2>Cases</h2>
            <Link to="/cases" className="link-button">
              View all
            </Link>
          </div>
          <div className="card-content">
            {openCases.slice(0, 5).map((c) => (
              <Link key={c.id} to={`/cases/${c.id}`} className="list-item">
                <div className="list-item-title">{c.title || c.id}</div>
                <div className="list-item-meta">
                  <span>{c.department}</span>
                  <span>•</span>
                  <span>{(c.status || "OPEN").toUpperCase()}</span>
                </div>
              </Link>
            ))}
            {openCases.length === 0 ? <p className="muted">No open cases.</p> : null}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Recent evidence</h2>
            <Link to="/search" className="link-button">
              Search
            </Link>
          </div>
          <div className="card-content">
            {recentEvidence.map((e) => (
              <div key={e.id} className="list-item">
                <div className="list-item-title">
                  {statusIcon(e.status)} {e.fileName || e.id}
                </div>
                <div className="list-item-meta">
                  <span>{e.caseId}</span>
                  <span>•</span>
                  <span>{e.uploadedAt ? format(new Date(e.uploadedAt), "PPp") : "—"}</span>
                </div>
              </div>
            ))}
            {recentEvidence.length === 0 ? <p className="muted">No evidence uploaded yet.</p> : null}
            {isProsecutor ? <p className="muted">Read-only role: uploads and edits are disabled.</p> : null}
          </div>
        </div>
      </div>

      {otherCases.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <h2>Other case statuses</h2>
          </div>
          <div className="card-content">
            {otherCases.slice(0, 6).map((c) => (
              <div key={c.id} className="list-item">
                <div className="list-item-title">{c.title || c.id}</div>
                <div className="list-item-meta">
                  <span>{c.department}</span>
                  <span>•</span>
                  <span>{(c.status || "").toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
