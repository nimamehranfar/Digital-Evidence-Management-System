import { useState } from "react";
import { Link } from "react-router-dom";
import { useCase } from "../context/CaseContext";
import {
    Search, Filter, FileText, Image, Music,
    Video, File, X, Calendar, Tag, Briefcase, CheckCircle, Activity, Clock, XCircle
} from "lucide-react";
import { format } from "date-fns";

export default function SearchPage() {
    const { searchEvidence, getCaseById } = useCase();

    const [query, setQuery] = useState("");
    const [fileType, setFileType] = useState("");
    const [status, setStatus] = useState("");
    const [selectedCase, setSelectedCase] = useState("");
    const [results, setResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);

    // Get evidence for accessible cases
    const { getAccessibleCases, evidence } = useCase();
    const cases = getAccessibleCases();
    const accessibleCaseIds = cases.map(c => c.id);
    const userEvidence = evidence.filter(e =>
        accessibleCaseIds.includes(e.caseId)
    );

    const recentEvidence = [...userEvidence]
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
        .slice(0, 5);

    const handleSearch = async (e) => {
        e.preventDefault();

        const searchResults = await searchEvidence({
            query,
            fileType,
            status,
            caseId: selectedCase
        });

        // console.log(searchResults);
        setResults(searchResults);
        setHasSearched(true);
    };


    const clearSearch = () => {
        setQuery("");
        setFileType("");
        setStatus("");
        setSelectedCase("");
        setResults([]);
        setHasSearched(false);
    };

    const getFileIcon = (type) => {
        switch (type) {
            case "image": return <Image size={24} />;
            case "video": return <Video size={24} />;
            case "audio": return <Music size={24} />;
            case "pdf": return <FileText size={24} />;
            case "text": return <File size={24} />;
            default: return <File size={24} />;
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Search Evidence</h1>
                    <p>Search through all accessible evidence</p>
                </div>
            </div>

            {/* Search Form */}
            <div className="card">
                <div className="card-content">
                    <form onSubmit={handleSearch} className="search-form">
                        <div className="search-input-group">
                            <div className="search-box search-box-large">
                                <Search size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by filename, description, tags..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary">
                                <Search size={18} />
                                <span>Search</span>
                            </button>
                        </div>

                        <div className="search-filters">
                            <div className="filter-item">
                                <Filter size={18} />
                                <select
                                    value={fileType}
                                    onChange={(e) => setFileType(e.target.value)}
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
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="">All Status</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="PROCESSING">Processing</option>
                                    <option value="RECEIVED">Received</option>
                                    <option value="FAILED">Failed</option>
                                </select>
                            </div>

                            {(query || fileType || status || selectedCase) && (
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={clearSearch}
                                >
                                    <X size={16} />
                                    Clear
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* Results */}
            <div className="card">
                <div className="card-header">
                    <h2>
                        {hasSearched
                            ? `Search Results (${results.length})`
                            : "Recent Evidence"
                        }
                    </h2>
                </div>
                <div className="card-content">
                    {!hasSearched? (
                        recentEvidence.length === 0 ? (
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
                        )
                    ) : (hasSearched && results.length === 0 ? (
                        <div className="empty-state">
                            <Search size={64} />
                            <h3>No results found</h3>
                            <p>Try adjusting your search filters</p>
                        </div>
                    ) : (
                        <div className="evidence-search-results">
                            {results.map(item => {
                                const caseItem = getCaseById(item.caseId);
                                return (
                                    <div key={item.id} className="evidence-result-card">
                                        <div className={`evidence-icon evidence-icon-${item.fileType}`}>
                                            {getFileIcon(item.fileType)}
                                        </div>

                                        <div className="evidence-result-content">
                                            <div className="evidence-result-header">
                                                <h3>{item.fileName}</h3>
                                                <span className={`badge badge-${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                                            </div>

                                            {item.description && (
                                                <p className="evidence-description">
                                                    {item.description}
                                                </p>
                                            )}

                                            <div className="evidence-result-meta">
                                                <div className="meta-item">
                                                    <Calendar size={14} />
                                                    <span>
                            {format(new Date(item.uploadedAt), "MMM d, yyyy 'at' HH:mm")}
                          </span>
                                                </div>

                                                {caseItem && (
                                                    <div className="meta-item">
                                                        <Briefcase size={14} />
                                                        <Link to={`/cases/${caseItem.id}`} className="link-text">
                                                            {caseItem.caseNumber}
                                                        </Link>
                                                    </div>
                                                )}

                                                <div className="meta-item">
                                                    <FileText size={14} />
                                                    <span>
                            {(item.fileSize / 1024 / 1024).toFixed(2)} MB
                          </span>
                                                </div>
                                            </div>

                                            {item.tags && item.tags.length > 0 && (
                                                <div className="evidence-result-tags">
                                                    <Tag size={14} />
                                                    {item.tags.map((tag, idx) => (
                                                        <span key={idx} className="tag-sm">
                              {tag}
                            </span>
                                                    ))}
                                                </div>
                                            )}

                                            {item.extractedText && (
                                                <div className="evidence-preview">
                                                    <strong>Extracted Content:</strong>
                                                    <p>{item.extractedText.substring(0, 150)}...</p>
                                                </div>
                                            )}
                                        </div>

                                        {caseItem && (
                                            <Link
                                                to={`/cases/${caseItem.id}`}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                View Case
                                            </Link>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}