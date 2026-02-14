import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
import { Link } from "react-router-dom";
import {
    Briefcase, FileText, Clock,
    Activity, CheckCircle, XCircle
} from "lucide-react";
import { format } from "date-fns";

export default function DashboardPage() {
    const { user } = useAuth();
    const { getAccessibleCases, evidence } = useCase();

    const cases = getAccessibleCases();
    const activeCases = cases.filter(c => c.status === "active");
    const pendingCases = cases.filter(c => c.status === "pending");

    // Get evidence for accessible cases
    const accessibleCaseIds = cases.map(c => c.id);
    const userEvidence = evidence.filter(e =>
        accessibleCaseIds.includes(e.caseId)
    );

    const recentEvidence = [...userEvidence]
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
        .slice(0, 5);

    const recentCases = [...cases]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5);

    const stats = [
        {
            label: "Total Cases",
            value: cases.length,
            icon: Briefcase,
            color: "blue",
            link: "/cases"
        },
        {
            label: "Active Cases",
            value: activeCases.length,
            icon: Activity,
            color: "green",
            link: "/cases?status=active"
        },
        {
            label: "Evidence Items",
            value: userEvidence.length,
            icon: FileText,
            color: "purple",
            link: "/search"
        },
        {
            label: "Pending Cases",
            value: pendingCases.length,
            icon: Clock,
            color: "orange",
            link: "/cases?status=pending"
        }
    ];

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>Welcome back, {user.fullName}</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <Link
                        key={index}
                        to={stat.link}
                        className="stat-card"
                    >
                        <div className={`stat-icon stat-icon-${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stat.value}</div>
                            <div className="stat-label">{stat.label}</div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="dashboard-grid">
                {/* Recent Cases */}
                <div className="card">
                    <div className="card-header">
                        <h2>Recent Cases</h2>
                        <Link to="/cases" className="link-text">View All</Link>
                    </div>
                    <div className="card-content">
                        {recentCases.length === 0 ? (
                            <div className="empty-state">
                                <Briefcase size={48} />
                                <p>No cases available</p>
                            </div>
                        ) : (
                            <div className="list">
                                {recentCases.map(caseItem => (
                                    <Link
                                        key={caseItem.id}
                                        to={`/cases/${caseItem.id}`}
                                        className="list-item"
                                    >
                                        <div className="list-item-content">
                                            <div className="list-item-header">
                        <span className="list-item-title">
                          {caseItem.title}
                        </span>
                                                <span className={`badge badge-${caseItem.priority}`}>
                          {caseItem.priority}
                        </span>
                                            </div>
                                            <div className="list-item-meta">
                                                <span>{caseItem.caseNumber}</span>
                                                <span>•</span>
                                                <span>{format(new Date(caseItem.updatedAt), "MMM d, yyyy")}</span>
                                            </div>
                                        </div>
                                        <div className={`status-indicator status-${caseItem.status}`}>
                                            {caseItem.status === "active" && <Activity size={16} />}
                                            {caseItem.status === "pending" && <Clock size={16} />}
                                            {caseItem.status === "closed" && <CheckCircle size={16} />}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Evidence */}
                <div className="card">
                    <div className="card-header">
                        <h2>Recent Evidence</h2>
                        <Link to="/search" className="link-text">View All</Link>
                    </div>
                    <div className="card-content">
                        {recentEvidence.length === 0 ? (
                            <div className="empty-state">
                                <FileText size={48} />
                                <p>No evidence uploaded yet</p>
                            </div>
                        ) : (
                            <div className="list">
                                {recentEvidence.map(item => {
                                    const caseItem = cases.find(c => c.id === item.caseId);
                                    return (
                                        <div key={item.id} className="list-item">
                                            <div className={`file-icon file-icon-${item.fileType}`}>
                                                {item.fileType === "pdf" && "PDF"}
                                                {item.fileType === "image" && "IMG"}
                                                {item.fileType === "audio" && "AUD"}
                                                {item.fileType === "video" && "VID"}
                                                {item.fileType === "text" && "TXT"}
                                            </div>
                                            <div className="list-item-content">
                                                <div className="list-item-title">
                                                    {item.fileName}
                                                </div>
                                                <div className="list-item-meta">
                                                    {caseItem && (
                                                        <>
                                                            <span>{caseItem.caseNumber}</span>
                                                            <span>•</span>
                                                        </>
                                                    )}
                                                    <span>{format(new Date(item.uploadedAt), "MMM d, HH:mm")}</span>
                                                </div>
                                            </div>
                                            <div className={`status-indicator status-${item.status.toLowerCase()}`}>
                                                {item.status === "COMPLETED" && <CheckCircle size={16} />}
                                                {item.status === "PROCESSING" && <Activity size={16} />}
                                                {item.status === "RECEIVED" && <Clock size={16} />}
                                                {item.status === "FAILED" && <XCircle size={16} />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
                <div className="card-header">
                    <h2>Quick Actions</h2>
                </div>
                <div className="card-content">
                    <div className="quick-actions">
                        <Link to="/upload" className="quick-action-btn">
                            <FileText size={20} />
                            <span>Upload Evidence</span>
                        </Link>
                        <Link to="/cases" className="quick-action-btn">
                            <Briefcase size={20} />
                            <span>View Cases</span>
                        </Link>
                        <Link to="/search" className="quick-action-btn">
                            <Activity size={20} />
                            <span>Search Evidence</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}