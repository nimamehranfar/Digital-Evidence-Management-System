import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import * as authApi from "../api/authApi";
import { Users, Shield, User, Mail, Award } from "lucide-react";

export default function UsersPage() {
    const { isInvestigator } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isInvestigator) {
            loadUsers();
        }
    }, [isInvestigator]);

    const loadUsers = async () => {
        try {
            const data = await authApi.getUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to load users:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isInvestigator) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <Users size={64} />
                    <h2>Access Denied</h2>
                    <p>Only investigators can manage users.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-screen">
                    <div className="loading-spinner"></div>
                    <p>Loading users...</p>
                </div>
            </div>
        );
    }

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case "investigator": return "badge-blue";
            case "higher_rank": return "badge-purple";
            case "officer": return "badge-green";
            default: return "badge-gray";
        }
    };

    const getRoleLabel = (role) => {
        return role.replace('_', ' ').split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const investigators = users.filter(u => u.role === "investigator");
    const officers = users.filter(u => u.role === "officer");

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>User Management</h1>
                    <p>Manage system users and their permissions</p>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid stats-grid-3">
                <div className="stat-card">
                    <div className="stat-icon stat-icon-blue">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{users.length}</div>
                        <div className="stat-label">Total Users</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-green">
                        <Shield size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{investigators.length}</div>
                        <div className="stat-label">Investigators</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-purple">
                        <Award size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{officers.length}</div>
                        <div className="stat-label">Officers</div>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="card">
                <div className="card-header">
                    <h2>System Users</h2>
                </div>
                <div className="card-content">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Badge</th>
                                <th>Status</th>
                                <th>Last Login</th>
                            </tr>
                            </thead>
                            <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar-sm">
                                                {user.fullName.charAt(0)}
                                            </div>
                                            <div className="user-cell-content">
                          <span className="user-cell-name">
                            {user.fullName}
                          </span>
                                                <span className="user-cell-email">
                            <Mail size={12} />
                                                    {user.email}
                          </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                      <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                                    </td>
                                    <td>
                      <span className="table-cell-secondary">
                        {user.department.replace('_', ' ')}
                      </span>
                                    </td>
                                    <td>
                      <span className="badge-code">
                        {user.badge}
                      </span>
                                    </td>
                                    <td>
                      <span className={`status-dot status-${user.status}`}>
                        {user.status}
                      </span>
                                    </td>
                                    <td>
                      <span className="table-cell-secondary">
                        {new Date(user.lastLogin).toLocaleDateString()} {" "}
                          {new Date(user.lastLogin).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                          })}
                      </span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Role Permissions Info */}
            <div className="card">
                <div className="card-header">
                    <h2>Role Permissions</h2>
                </div>
                <div className="card-content">
                    <div className="permissions-grid">
                        <div className="permission-card">
                            <div className="permission-header">
                                <Shield size={24} className="permission-icon" />
                                <h3>Investigator</h3>
                            </div>
                            <ul className="permission-list">
                                <li>Full access to all cases and evidence</li>
                                <li>Create, edit, and delete cases</li>
                                <li>Upload and delete evidence</li>
                                <li>Manage user accounts</li>
                                <li>View analytics and reports</li>
                                <li>Access all departments</li>
                            </ul>
                        </div>

                        <div className="permission-card">
                            <div className="permission-header">
                                <Award size={24} className="permission-icon" />
                                <h3>Higher Rank</h3>
                            </div>
                            <ul className="permission-list">
                                <li>View all cases across departments</li>
                                <li>Search all evidence</li>
                                <li>View analytics and reports</li>
                                <li>Upload evidence to assigned cases</li>
                                <li>Add notes to cases</li>
                                <li>Read-only access to most features</li>
                            </ul>
                        </div>

                        <div className="permission-card">
                            <div className="permission-header">
                                <User size={24} className="permission-icon" />
                                <h3>Officer</h3>
                            </div>
                            <ul className="permission-list">
                                <li>View cases in own department only</li>
                                <li>Upload evidence to assigned cases</li>
                                <li>Search evidence in accessible cases</li>
                                <li>Add notes to assigned cases</li>
                                <li>Limited analytics access</li>
                                <li>Cannot edit or delete cases</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}