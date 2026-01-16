import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCase } from "../context/CaseContext";
import {
    User, Mail, Shield, Building, Award,
    Edit, Save, X, Activity, FileText
} from "lucide-react";
import { format } from "date-fns";

export default function ProfilePage() {
    const { user, updateProfile } = useAuth();
    const { getAccessibleCases, evidence } = useCase();
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState({
        fullName: user.fullName,
        email: user.email
    });

    const cases = getAccessibleCases();
    const accessibleCaseIds = cases.map(c => c.id);
    const userEvidence = evidence.filter(e =>
        accessibleCaseIds.includes(e.caseId) && e.uploadedBy === user.id
    );

    const handleSave = () => {
        updateProfile(editedUser);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedUser({
            fullName: user.fullName,
            email: user.email
        });
        setIsEditing(false);
    };

    const getRoleLabel = (role) => {
        return role.replace('_', ' ').split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const recentActivity = [...userEvidence]
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
        .slice(0, 5);

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Profile</h1>
                    <p>Manage your account settings and view your activity</p>
                </div>
            </div>

            <div className="profile-layout">
                {/* Profile Card */}
                <div className="profile-main">
                    <div className="card">
                        <div className="card-header">
                            <h2>Personal Information</h2>
                            {!isEditing ? (
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <Edit size={16} />
                                    <span>Edit</span>
                                </button>
                            ) : (
                                <div className="button-group">
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={handleCancel}
                                    >
                                        <X size={16} />
                                        <span>Cancel</span>
                                    </button>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={handleSave}
                                    >
                                        <Save size={16} />
                                        <span>Save</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="card-content">
                            <div className="profile-avatar-section">
                                <div className="profile-avatar">
                                    {user.fullName.charAt(0)}
                                </div>
                                <div className="profile-badge">
                                    <Award size={20} />
                                    <span>{user.badge}</span>
                                </div>
                            </div>

                            <div className="profile-form">
                                <div className="form-group">
                                    <label htmlFor="fullName">Full Name</label>
                                    {isEditing ? (
                                        <input
                                            id="fullName"
                                            type="text"
                                            value={editedUser.fullName}
                                            onChange={(e) => setEditedUser({
                                                ...editedUser,
                                                fullName: e.target.value
                                            })}
                                        />
                                    ) : (
                                        <div className="form-value">{user.fullName}</div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="email">Email</label>
                                    {isEditing ? (
                                        <input
                                            id="email"
                                            type="email"
                                            value={editedUser.email}
                                            onChange={(e) => setEditedUser({
                                                ...editedUser,
                                                email: e.target.value
                                            })}
                                        />
                                    ) : (
                                        <div className="form-value">{user.email}</div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Username</label>
                                    <div className="form-value form-value-readonly">
                                        {user.username}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Role</label>
                                        <div className="form-value">
                      <span className={`badge badge-${user.role === 'investigator' ? 'blue' : user.role === 'higher_rank' ? 'purple' : 'green'}`}>
                        <Shield size={14} />
                          {getRoleLabel(user.role)}
                      </span>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Department</label>
                                        <div className="form-value">
                                            <Building size={16} className="form-icon" />
                                            {user.department.replace('_', ' ')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity Stats */}
                    <div className="card">
                        <div className="card-header">
                            <h2>Activity Summary</h2>
                        </div>
                        <div className="card-content">
                            <div className="activity-stats">
                                <div className="activity-stat">
                                    <div className="activity-stat-icon">
                                        <Activity size={24} />
                                    </div>
                                    <div className="activity-stat-content">
                                        <div className="activity-stat-value">
                                            {cases.filter(c => c.assignedTo.includes(user.id)).length}
                                        </div>
                                        <div className="activity-stat-label">Assigned Cases</div>
                                    </div>
                                </div>

                                <div className="activity-stat">
                                    <div className="activity-stat-icon">
                                        <FileText size={24} />
                                    </div>
                                    <div className="activity-stat-content">
                                        <div className="activity-stat-value">
                                            {userEvidence.length}
                                        </div>
                                        <div className="activity-stat-label">Evidence Uploaded</div>
                                    </div>
                                </div>

                                <div className="activity-stat">
                                    <div className="activity-stat-icon">
                                        <User size={24} />
                                    </div>
                                    <div className="activity-stat-content">
                                        <div className="activity-stat-value">
                                            {cases.filter(c => c.createdBy === user.id).length}
                                        </div>
                                        <div className="activity-stat-label">Cases Created</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="profile-sidebar">
                    {/* Recent Activity */}
                    <div className="card">
                        <div className="card-header">
                            <h2>Recent Activity</h2>
                        </div>
                        <div className="card-content">
                            {recentActivity.length === 0 ? (
                                <p className="text-muted">No recent activity</p>
                            ) : (
                                <div className="activity-list">
                                    {recentActivity.map(item => (
                                        <div key={item.id} className="activity-item">
                                            <div className={`activity-icon activity-icon-${item.fileType}`}>
                                                <FileText size={16} />
                                            </div>
                                            <div className="activity-content">
                                                <div className="activity-title">
                                                    Uploaded {item.fileName}
                                                </div>
                                                <div className="activity-date">
                                                    {format(new Date(item.uploadedAt), "MMM d, HH:mm")}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className="card">
                        <div className="card-header">
                            <h2>Account Information</h2>
                        </div>
                        <div className="card-content">
                            <div className="info-list">
                                <div className="info-list-item">
                                    <span className="info-list-label">User ID</span>
                                    <span className="info-list-value">{user.id}</span>
                                </div>
                                <div className="info-list-item">
                                    <span className="info-list-label">Badge Number</span>
                                    <span className="info-list-value badge-code">{user.badge}</span>
                                </div>
                                <div className="info-list-item">
                                    <span className="info-list-label">Department</span>
                                    <span className="info-list-value">
                    {user.department.replace('_', ' ')}
                  </span>
                                </div>
                                <div className="info-list-item">
                                    <span className="info-list-label">Role</span>
                                    <span className="info-list-value">
                    {getRoleLabel(user.role)}
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