import { useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useCase } from "../context/CaseContext";
import { useAuth } from "../context/AuthContext";
import {
    Upload, File, FileText, Image, Music, Video,
    CheckCircle, AlertCircle, X, Loader
} from "lucide-react";

export default function UploadPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, canAddEvidence } = useAuth();
    const { addEvidence, getAccessibleCases } = useCase();

    const [selectedFile, setSelectedFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [error, setError] = useState("");

    const [caseId, setCaseId] = useState(searchParams.get("caseId") || "");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState("");

    const fileInputRef = useRef(null);
    const cases = getAccessibleCases();

    if (!canAddEvidence()) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <AlertCircle size={64} />
                    <h2>Access Denied</h2>
                    <p>You don't have permission to upload evidence.</p>
                </div>
            </div>
        );
    }

    const getFileType = (file) => {
        const ext = file.name.split(".").pop().toLowerCase();

        if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) return "image";
        if (["mp4", "avi", "mov", "wmv", "flv", "mkv"].includes(ext)) return "video";
        if (["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext)) return "audio";
        if (["pdf"].includes(ext)) return "pdf";
        if (["txt", "doc", "docx", "rtf"].includes(ext)) return "text";

        return "other";
    };

    const getFileIcon = (type) => {
        switch (type) {
            case "image": return <Image size={48} />;
            case "video": return <Video size={48} />;
            case "audio": return <Music size={48} />;
            case "pdf": return <FileText size={48} />;
            case "text": return <File size={48} />;
            default: return <File size={48} />;
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (file) => {
        setError("");

        // Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            setError("File size exceeds 50MB limit");
            return;
        }

        setSelectedFile(file);
    };

    const handleFileInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            setError("Please select a file");
            return;
        }

        if (!caseId) {
            setError("Please select a case");
            return;
        }

        setUploading(true);
        setError("");

        try {
            // Simulate upload delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            const evidenceData = {
                caseId,
                fileName: selectedFile.name,
                fileType: getFileType(selectedFile),
                fileSize: selectedFile.size,
                description: description.trim(),
                tags: tags.split(",").map(t => t.trim()).filter(Boolean),
                status: "COMPLETED"
            };

            addEvidence(evidenceData);

            setUploadSuccess(true);
            setTimeout(() => {
                navigate(`/cases/${caseId}`);
            }, 2000);

        } catch (err) {
            setError("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setSelectedFile(null);
        setDescription("");
        setTags("");
        setUploadSuccess(false);
        setError("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    if (uploadSuccess) {
        return (
            <div className="page-container">
                <div className="upload-success">
                    <CheckCircle size={64} className="success-icon" />
                    <h2>Upload Successful!</h2>
                    <p>Your evidence has been uploaded and is being processed.</p>
                    <p className="redirect-msg">Redirecting to case details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Upload Evidence</h1>
                    <p>Upload digital evidence files to a case</p>
                </div>
            </div>

            <div className="upload-layout">
                <form onSubmit={handleSubmit} className="upload-form">
                    {/* Case Selection */}
                    <div className="card">
                        <div className="card-header">
                            <h2>Select Case</h2>
                        </div>
                        <div className="card-content">
                            <div className="form-group">
                                <label htmlFor="case">Case *</label>
                                <select
                                    id="case"
                                    value={caseId}
                                    onChange={(e) => setCaseId(e.target.value)}
                                    required
                                >
                                    <option value="">-- Select a case --</option>
                                    {cases.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.caseNumber} - {c.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* File Upload */}
                    <div className="card">
                        <div className="card-header">
                            <h2>Upload File</h2>
                        </div>
                        <div className="card-content">
                            {!selectedFile ? (
                                <div
                                    className={`upload-dropzone ${dragActive ? "dropzone-active" : ""}`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload size={48} />
                                    <h3>Drop file here or click to browse</h3>
                                    <p>Supported: Images, Videos, Audio, PDFs, Documents</p>
                                    <p className="file-limit">Maximum file size: 50MB</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={handleFileInputChange}
                                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                                        style={{ display: "none" }}
                                    />
                                </div>
                            ) : (
                                <div className="file-preview">
                                    <div className={`file-icon-large file-icon-${getFileType(selectedFile)}`}>
                                        {getFileIcon(getFileType(selectedFile))}
                                    </div>
                                    <div className="file-details">
                                        <h3>{selectedFile.name}</h3>
                                        <p>
                                            {getFileType(selectedFile).toUpperCase()} •{" "}
                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-icon"
                                        onClick={resetForm}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="alert alert-error">
                                    <AlertCircle size={20} />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metadata */}
                    {selectedFile && (
                        <div className="card">
                            <div className="card-header">
                                <h2>Evidence Details</h2>
                            </div>
                            <div className="card-content">
                                <div className="form-group">
                                    <label htmlFor="description">Description</label>
                                    <textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={4}
                                        placeholder="Describe this evidence..."
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="tags">Tags (comma-separated)</label>
                                    <input
                                        id="tags"
                                        type="text"
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                        placeholder="e.g., witness, cctv, document"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    {selectedFile && (
                        <div className="upload-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={resetForm}
                                disabled={uploading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={uploading || !caseId}
                            >
                                {uploading ? (
                                    <>
                                        <Loader className="spinner" size={18} />
                                        <span>Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        <span>Upload Evidence</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </form>

                {/* Info Sidebar */}
                <div className="upload-sidebar">
                    <div className="card">
                        <div className="card-header">
                            <h2>Upload Guidelines</h2>
                        </div>
                        <div className="card-content">
                            <div className="guidelines-list">
                                <div className="guideline-item">
                                    <CheckCircle size={18} className="guideline-icon" />
                                    <div>
                                        <strong>Supported Formats</strong>
                                        <p>Images, videos, audio files, PDFs, and documents</p>
                                    </div>
                                </div>

                                <div className="guideline-item">
                                    <CheckCircle size={18} className="guideline-icon" />
                                    <div>
                                        <strong>File Size Limit</strong>
                                        <p>Maximum 50MB per file</p>
                                    </div>
                                </div>

                                <div className="guideline-item">
                                    <CheckCircle size={18} className="guideline-icon" />
                                    <div>
                                        <strong>Chain of Custody</strong>
                                        <p>All uploads are logged with timestamp and user info</p>
                                    </div>
                                </div>

                                <div className="guideline-item">
                                    <CheckCircle size={18} className="guideline-icon" />
                                    <div>
                                        <strong>Processing</strong>
                                        <p>Files are automatically processed for metadata extraction</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h2>Your Information</h2>
                        </div>
                        <div className="card-content">
                            <div className="user-upload-info">
                                <div className="info-row">
                                    <span className="info-label">Name:</span>
                                    <span className="info-value">{user.fullName}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Badge:</span>
                                    <span className="info-value">{user.badge}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Department:</span>
                                    <span className="info-value">
                    {user.department.replace('_', ' ')}
                  </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}