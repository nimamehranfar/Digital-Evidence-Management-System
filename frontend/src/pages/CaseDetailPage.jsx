import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
import {
    ArrowLeft, Edit, Trash2, FileText, MessageSquare,
    Activity, Clock, CheckCircle, Calendar, Tag,
    User, Building, AlertTriangle, Plus, X
} from "lucide-react";
import { format } from "date-fns";

export default function CaseDetailPage() {
    const { caseId } = useParams();
    const navigate = useNavigate();
    const { user, canEditCase, canDeleteEvidence, isInvestigator } = useAuth();
    const {
        getCaseById,
        getEvidenceByCase,
        updateCase,
        deleteCase,
        addCaseNote,
        deleteEvidence
    } = useCase();

    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [editedCase, setEditedCase] = useState(null);

    const caseItem = getCaseById(caseId);
    const evidence = getEvidenceByCase(caseId);

    if (!caseItem) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <AlertTriangle size={64} />
                    <h2>Case Not Found</h2>
                    <p>The case you're looking for doesn't exist or you don't have access to it.</p>
                    <Link to="/cases" className="btn btn-primary">
                        Back to Cases
                    </Link>
                </div>
            </div>
        );
    }

    const canEdit = canEditCase(caseItem);

    const handleAddNote = (e) => {
        e.preventDefault();
        if (noteText.trim()) {
            addCaseNote(caseId, noteText);
            setNoteText("");
        }
    };

    const handleUpdateCase = (e) => {
        e.preventDefault();
        updateCase(caseId, editedCase);
        setShowEditModal(false);
    };

    const handleDeleteCase = () => {
        deleteCase(caseId);
        navigate("/cases");
    };

    const handleDeleteEvidence = (evidenceId) => {
        if (window.confirm("Are you sure you want to delete this evidence?")) {
            deleteEvidence(evidenceId);
        }
    };

    const openEditModal = () => {
        setEditedCase({
            title: caseItem.title,
            description: caseItem.description,
            status: caseItem.status,
            priority: caseItem.priority,
            tags: caseItem.tags.join(", ")
        });
        setShowEditModal(true);
    };

    const statusIcon = {
        active: <Activity size={20} />,
        pending: <Clock size={20} />,
        closed: <CheckCircle size={20} />
    };

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <Link to="/cases" className="btn btn-icon">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1>{caseItem.title}</h1>
                        <p className="case-number">{caseItem.caseNumber}</p>
                    </div>
                </div>
                {canEdit && (
                    <div className="page-header-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={openEditModal}
                        >
                            <Edit size={18} />
                            <span>Edit</span>
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            <Trash2 size={18} />
                            <span>Delete</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="case-detail-grid">
                {/* Main Content */}
                <div className="case-detail-main">
                    {/* Case Info */}
                    <div className="card">
                        <div className="card-header">
                            <h2>Case Information</h2>
                            <div className="case-badges">
                <span className={`badge badge-${caseItem.status}`}>
                  {statusIcon[caseItem.status]}
                    <span>{caseItem.status}</span>
                </span>
                                <span className={`badge badge-${caseItem.priority}`}>
                  {caseItem.priority} priority
                </span>
                            </div>
                        </div>
                        <div className="card-content">
                            <div className="case-info-grid">
                                <div className="info-item">
                                    <div className="info-icon">
                                        <Calendar size={18} />
                                    </div>
                                    <div className="info-content">
                                        <div className="info-label">Created</div>
                                        <div className="info-value">
                                            {format(new Date(caseItem.createdAt), "MMM d, yyyy 'at' HH:mm")}
                                        </div>
                                    </div>
                                </div>

                                <div className="info-item">
                                    <div className="info-icon">
                                        <Clock size={18} />
                                    </div>
                                    <div className="info-content">
                                        <div className="info-label">Last Updated</div>
                                        <div className="info-value">
                                            {format(new Date(caseItem.updatedAt), "MMM d, yyyy 'at' HH:mm")}
                                        </div>
                                    </div>
                                </div>

                                <div className="info-item">
                                    <div className="info-icon">
                                        <Building size={18} />
                                    </div>
                                    <div className="info-content">
                                        <div className="info-label">Department</div>
                                        <div className="info-value">
                                            {caseItem.department.replace('_', ' ')}
                                        </div>
                                    </div>
                                </div>

                                <div className="info-item">
                                    <div className="info-icon">
                                        <User size={18} />
                                    </div>
                                    <div className="info-content">
                                        <div className="info-label">Assigned Officers</div>
                                        <div className="info-value">
                                            {caseItem.assignedTo.length} officer(s)
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="case-description">
                                <h3>Description</h3>
                                <p>{caseItem.description}</p>
                            </div>

                            {caseItem.tags && caseItem.tags.length > 0 && (
                                <div className="case-tags">
                                    <Tag size={16} />
                                    <div className="tags-list">
                                        {caseItem.tags.map((tag, index) => (
                                            <span key={index} className="tag">
                        {tag}
                      </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Evidence */}
                    <div className="card">
                        <div className="card-header">
                            <h2>Evidence ({evidence.length})</h2>
                            <Link
                                to={`/upload?caseId=${caseId}`}
                                className="btn btn-primary btn-sm"
                            >
                                <Plus size={16} />
                                <span>Add Evidence</span>
                            </Link>
                        </div>
                        <div className="card-content">
                            {evidence.length === 0 ? (
                                <div className="empty-state">
                                    <FileText size={48} />
                                    <p>No evidence uploaded yet</p>
                                    <Link
                                        to={`/upload?caseId=${caseId}`}
                                        className="btn btn-primary"
                                    >
                                        Upload Evidence
                                    </Link>
                                </div>
                            ) : (
                                <div className="evidence-grid">
                                    {evidence.map(item => (
                                        <div key={item.id} className="evidence-card">
                                            <div className={`evidence-type evidence-type-${item.fileType}`}>
                                                {item.fileType.toUpperCase().substring(0, 3)}
                                            </div>
                                            <div className="evidence-info">
                                                <div className="evidence-name">{item.fileName}</div>
                                                <div className="evidence-meta">
                                                    {format(new Date(item.uploadedAt), "MMM d, HH:mm")}
                                                </div>
                                                {item.description && (
                                                    <div className="evidence-description">
                                                        {item.description}
                                                    </div>
                                                )}
                                                <div className="evidence-tags">
                                                    {item.tags.map((tag, idx) => (
                                                        <span key={idx} className="tag-sm">
                              {tag}
                            </span>
                                                    ))}
                                                </div>
                                            </div>
                                            {canDeleteEvidence() && (
                                                <button
                                                    className="btn btn-icon btn-danger-ghost"
                                                    onClick={() => handleDeleteEvidence(item.id)}
                                                    title="Delete evidence"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="case-detail-sidebar">
                    {/* Notes */}
                    <div className="card">
                        <div className="card-header">
                            <h2>
                                <MessageSquare size={18} />
                                <span>Notes</span>
                            </h2>
                        </div>
                        <div className="card-content">
                            <form onSubmit={handleAddNote} className="note-form">
                <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    rows={3}
                />
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-sm btn-block"
                                    disabled={!noteText.trim()}
                                >
                                    Add Note
                                </button>
                            </form>

                            <div className="notes-list">
                                {caseItem.notes && caseItem.notes.length > 0 ? (
                                    caseItem.notes.map(note => (
                                        <div key={note.id} className="note-item">
                                            <div className="note-header">
                        <span className="note-author">
                          {note.createdBy === user.id ? "You" : "User"}
                        </span>
                                                <span className="note-date">
                          {format(new Date(note.createdAt), "MMM d, HH:mm")}
                        </span>
                                            </div>
                                            <div className="note-text">{note.text}</div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted">No notes yet</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Case</h2>
                            <button
                                className="btn btn-icon"
                                onClick={() => setShowEditModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateCase}>
                            <div className="modal-content">
                                <div className="form-group">
                                    <label>Title</label>
                                    <input
                                        type="text"
                                        value={editedCase.title}
                                        onChange={(e) => setEditedCase({...editedCase, title: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        value={editedCase.description}
                                        onChange={(e) => setEditedCase({...editedCase, description: e.target.value})}
                                        rows={4}
                                        required
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Status</label>
                                        <select
                                            value={editedCase.status}
                                            onChange={(e) => setEditedCase({...editedCase, status: e.target.value})}
                                        >
                                            <option value="active">Active</option>
                                            <option value="pending">Pending</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Priority</label>
                                        <select
                                            value={editedCase.priority}
                                            onChange={(e) => setEditedCase({...editedCase, priority: e.target.value})}
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Tags (comma-separated)</label>
                                    <input
                                        type="text"
                                        value={editedCase.tags}
                                        onChange={(e) => setEditedCase({...editedCase, tags: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Delete Case</h2>
                        </div>
                        <div className="modal-content">
                            <p>
                                Are you sure you want to delete this case? This will also delete
                                all associated evidence. This action cannot be undone.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteCase}
                            >
                                Delete Case
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}