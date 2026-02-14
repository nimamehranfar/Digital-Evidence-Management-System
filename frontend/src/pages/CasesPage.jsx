import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
import {
    Plus, Search, Filter, Briefcase,
    Activity, Clock, CheckCircle, ChevronRight, X
} from "lucide-react";
import { format } from "date-fns";

export default function CasesPage() {
    const { user, isDetective } = useAuth();
    const { getAccessibleCases, createCase } = useCase();
    const [searchParams, setSearchParams] = useSearchParams();

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCase, setNewCase] = useState({
        title: "",
        description: "",
        priority: "medium",
        department: user.department,
        tags: ""
    });

    const cases = getAccessibleCases();

    // Filter cases
    const filteredCases = cases.filter(c => {
        const matchesSearch = !searchQuery ||
            c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.description.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = !statusFilter || c.status === statusFilter;
        const matchesPriority = !priorityFilter || c.priority === priorityFilter;

        return matchesSearch && matchesStatus && matchesPriority;
    });

    const handleCreateCase = async (e) => {
        e.preventDefault();

        const caseData = {
            ...newCase,
            tags: newCase.tags.split(",").map(t => t.trim()).filter(Boolean),
        };

        try {
            await createCase(caseData);
            setShowCreateModal(false);
            setNewCase({
                title: "",
                description: "",
                priority: "medium",
                department: user.department,
                tags: "",
            });
        } catch (err) {
            console.error("Failed to create case:", err);
            alert(err.message || "Failed to create case");
        }
    };

    const clearFilters = () => {
        setSearchQuery("");
        setStatusFilter("");
        setPriorityFilter("");
        setSearchParams({});
    };

    const hasActiveFilters = searchQuery || statusFilter || priorityFilter;

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Cases</h1>
                    <p>Manage and track investigation cases</p>
                </div>
                {isDetective && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus size={20} />
                        <span>Create Case</span>
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="card">
                <div className="card-content">
                    <div className="filters-container">
                        <div className="search-box">
                            <Search size={20} />
                            <input
                                type="text"
                                placeholder="Search cases..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="filters-group">
                            <div className="filter-item">
                                <Filter size={18} />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="pending">Pending</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>

                            <div className="filter-item">
                                <select
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                >
                                    <option value="">All Priority</option>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>

                            {hasActiveFilters && (
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={clearFilters}
                                >
                                    <X size={16} />
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cases List */}
            <div className="card">
                <div className="card-content">
                    {filteredCases.length === 0 ? (
                        <div className="empty-state">
                            <Briefcase size={64} />
                            <h3>No cases found</h3>
                            <p>
                                {hasActiveFilters
                                    ? "Try adjusting your filters"
                                    : "Create your first case to get started"
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                <tr>
                                    <th>Case Number</th>
                                    <th>Title</th>
                                    <th>Status</th>
                                    <th>Priority</th>
                                    <th>Department</th>
                                    <th>Updated</th>
                                    <th></th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredCases.map(caseItem => (
                                    <tr key={caseItem.id}>
                                        <td>
                        <span className="table-cell-primary">
                          {caseItem.caseNumber}
                        </span>
                                        </td>
                                        <td>
                                            <div className="table-cell-content">
                          <span className="table-cell-title">
                            {caseItem.title}
                          </span>
                                                <span className="table-cell-subtitle">
                            {caseItem.description.substring(0, 60)}
                                                    {caseItem.description.length > 60 && "..."}
                          </span>
                                            </div>
                                        </td>
                                        <td>
                        <span className={`badge badge-${caseItem.status}`}>
                          {caseItem.status === "active" && <Activity size={14} />}
                            {caseItem.status === "pending" && <Clock size={14} />}
                            {caseItem.status === "closed" && <CheckCircle size={14} />}
                            <span>{caseItem.status}</span>
                        </span>
                                        </td>
                                        <td>
                        <span className={`badge badge-${caseItem.priority}`}>
                          {caseItem.priority}
                        </span>
                                        </td>
                                        <td>
                        <span className="table-cell-secondary">
                          {caseItem.department.replace('_', ' ')}
                        </span>
                                        </td>
                                        <td>
                        <span className="table-cell-secondary">
                          {format(new Date(caseItem.updatedAt), "MMM d, yyyy")}
                        </span>
                                        </td>
                                        <td>
                                            <Link
                                                to={`/cases/${caseItem.id}`}
                                                className="btn btn-icon"
                                            >
                                                <ChevronRight size={18} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Case Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create New Case</h2>
                            <button
                                className="btn btn-icon"
                                onClick={() => setShowCreateModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCase}>
                            <div className="modal-content">
                                <div className="form-group">
                                    <label htmlFor="title">Case Title *</label>
                                    <input
                                        id="title"
                                        type="text"
                                        value={newCase.title}
                                        onChange={(e) => setNewCase({...newCase, title: e.target.value})}
                                        required
                                        placeholder="Enter case title"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="description">Description *</label>
                                    <textarea
                                        id="description"
                                        value={newCase.description}
                                        onChange={(e) => setNewCase({...newCase, description: e.target.value})}
                                        required
                                        rows={4}
                                        placeholder="Enter case description"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="priority">Priority</label>
                                        <select
                                            id="priority"
                                            value={newCase.priority}
                                            onChange={(e) => setNewCase({...newCase, priority: e.target.value})}
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="department">Department</label>
                                        <select
                                            id="department"
                                            value={newCase.department}
                                            onChange={(e) => setNewCase({...newCase, department: e.target.value})}
                                        >
                                            <option value="headquarters">Headquarters</option>
                                            <option value="district_a">District A</option>
                                            <option value="district_b">District B</option>
                                            <option value="forensics">Forensics</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="tags">Tags (comma-separated)</label>
                                    <input
                                        id="tags"
                                        type="text"
                                        value={newCase.tags}
                                        onChange={(e) => setNewCase({...newCase, tags: e.target.value})}
                                        placeholder="e.g., fraud, cybercrime, theft"
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Case
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}