import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
import {
    ArrowLeft, Edit, Trash2, FileText, MessageSquare,
    Activity, Clock, CheckCircle, Calendar, Tag,
    User, Building, AlertTriangle, Plus, X, Search, Filter
} from "lucide-react";
import { format } from "date-fns";

export default function CaseDetailPage() {
    const { caseId } = useParams();
    const navigate = useNavigate();
    const {
        user,
        canEditCase,
        canDeleteEvidence,
        canDeleteNote,
        canAddNote,
        isProsecutor
    } = useAuth();
    const {
        getCaseById,
        getEvidenceByCase,
        updateCase,
        deleteCase,
        addCaseNote,
        deleteCaseNote,
        deleteEvidence
    } = useCase();

    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [editedCase, setEditedCase] = useState(null);

    // Evidence search state
    const [evidenceSearchQuery, setEvidenceSearchQuery] = useState("");
    const [evidenceTypeFilter, setEvidenceTypeFilter] = useState("");
    const [evidenceStatusFilter, setEvidenceStatusFilter] = useState("");

    const caseItem = getCaseById(caseId);
    const allEvidence = getEvidenceByCase(caseId);

    // Filter evidence based on search
    const evidence = allEvidence.filter(e => {
        const matchesSearch = !evidenceSearchQuery ||
            e.fileName.toLowerCase().includes(evidenceSearchQuery.toLowerCase()) ||
            (e.description && e.description.toLowerCase().includes(evidenceSearchQuery.toLowerCase())) ||
            (e.tags && e.tags.some(tag => tag.toLowerCase().includes(evidenceSearchQuery.toLowerCase())));

        const matchesType = !evidenceTypeFilter || e.fileType === evidenceTypeFilter;
        const matchesStatus = !evidenceStatusFilter || e.status === evidenceStatusFilter;

        return matchesSearch && matchesType && matchesStatus;
    });

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
    const canAddNoteToCase = canAddNote(caseItem);

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (noteText.trim()) {
            try {
                await addCaseNote(caseId, noteText);
                setNoteText("");
            } catch (error) {
                console.error("Failed to add note:", error);
                alert("Failed to add note. Please try again.");
            }
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (window.confirm("Are you sure you want to delete this note?")) {
            try {
                await deleteCaseNote(caseId, noteId);
            } catch (error) {
                console.error("Failed to delete note:", error);
                alert("Failed to delete note. Please try again.");
            }
        }
    };

    const handleUpdateCase = async (e) => {
        e.preventDefault();
        try {
            await updateCase(caseId, editedCase);
            setShowEditModal(false);
        } catch (error) {
            console.error("Failed to update case:", error);
            alert("Failed to update case. Please try again.");
        }
    };

    const handleDeleteCase = async () => {
        try {
            await deleteCase(caseId);
            navigate("/cases");
        } catch (error) {
            console.error("Failed to delete case:", error);
            alert("Failed to delete case. Please try again.");
        }
    };

    const handleDeleteEvidence = async (evidenceId) => {
        if (window.confirm("Are you sure you want to delete this evidence? This action cannot be undone.")) {
            try {
                await deleteEvidence(evidenceId);
            } catch (error) {
                console.error("Failed to delete evidence:", error);
                alert("Failed to delete evidence. Please try again.");
            }
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

    const clearEvidenceFilters = () => {
        setEvidenceSearchQuery("");
        setEvidenceTypeFilter("");
        setEvidenceStatusFilter("");
    };

    const hasEvidenceFilters = evidenceSearchQuery || evidenceTypeFilter || evidenceStatusFilter;

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
                                {isProsecutor && (
                                    <span className="badge badge-blue">
                                        Read-Only Access
                                    </span>
                                )}
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
                                            {caseItem.assignedTo?.length || 0} officer(s)
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

                    {/* Evidence Section with Search */}
                    <div className="card">
                        <div className="card-header">
                            <h2>Evidence ({allEvidence.length})</h2>
                            <Link
                                to={`/upload?caseId=${caseId}`}
                                className="btn btn-primary btn-sm"
                            >
                                <Plus size={16} />
                                <span>Add Evidence</span>
                            </Link>
                        </div>

                        {/* Evidence Search Filters */}
                        {allEvidence.length > 0 && (
                            <div className="card-content" style={{ paddingBottom: 0 }}>
                                <div className="filters-container">
                                    <div className="search-box">
                                        <Search size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search evidence..."
                                            value={evidenceSearchQuery}
                                            onChange={(e) => setEvidenceSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    <div className="filters-group">
                                        <div className="filter-item">
                                            <Filter size={16} />
                                            <select
                                                value={evidenceTypeFilter}
                                                onChange={(e) => setEvidenceTypeFilter(e.target.value)}
                                            >
                                                <option value="">All Types</option>
                                                <option value="pdf">PDF</option>
                                                <option value="image">Image</option>
                                                <option value="video">Video</option>
                                                <option value="audio">Audio</option>
                                                <option value="text">Text</option>
                                            </select>
                                        </div>

                                        <div className="filter-item">
                                            <select
                                                value={evidenceStatusFilter}
                                                onChange={(e) => setEvidenceStatusFilter(e.target.value)}
                                            >
                                                <option value="">All Status</option>
                                                <option value="COMPLETED">Completed</option>
                                                <option value="PROCESSING">Processing</option>
                                                <option value="RECEIVED">Received</option>
                                                <option value="FAILED">Failed</option>
                                            </select>
                                        </div>

                                        {hasEvidenceFilters && (
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={clearEvidenceFilters}
                                            >
                                                <X size={14} />
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="card-content">
                            {allEvidence.length === 0 ? (
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
                            ) : evidence.length === 0 ? (
                                <div className="empty-state">
                                    <Search size={48} />
                                    <p>No evidence matches your search</p>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={clearEvidenceFilters}
                                    >
                                        Clear Filters
                                    </button>
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
                                                    {format(new Date(item.uploadedAt), "MMM d, HH:mm")} •{" "}
                                                    <span className={`badge badge-${item.status.toLowerCase()}`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                                {item.description && (
                                                    <div className="evidence-description">
                                                        {item.description}
                                                    </div>
                                                )}
                                                {item.tags && item.tags.length > 0 && (
                                                    <div className="evidence-tags">
                                                        {item.tags.slice(0, 3).map((tag, idx) => (
                                                            <span key={idx} className="tag-sm">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                        {item.tags.length > 3 && (
                                                            <span className="tag-sm">+{item.tags.length - 3}</span>
                                                        )}
                                                    </div>
                                                )}
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

                {/* Sidebar - Notes */}
                <div className="case-detail-sidebar">
                    <div className="card">
                        <div className="card-header">
                            <h2>
                                <MessageSquare size={18} />
                                <span>Notes</span>
                            </h2>
                        </div>
                        <div className="card-content">
                            {canAddNoteToCase && (
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
                            )}

                            <div className="notes-list">
                                {caseItem.notes && caseItem.notes.length > 0 ? (
                                    caseItem.notes.map(note => (
                                        <div key={note.id} className="note-item">
                                            <div className="note-header">
                                                <span className="note-author">
                                                    {note.createdBy === user.id ? "You" : "User"}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span className="note-date">
                                                        {format(new Date(note.createdAt), "MMM d, HH:mm")}
                                                    </span>
                                                    {canDeleteNote(note, caseItem) && (
                                                        <button
                                                            className="btn btn-icon"
                                                            onClick={() => handleDeleteNote(note.id)}
                                                            title="Delete note"
                                                            style={{ padding: '0.25rem' }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
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