import { useAuth } from "../context/AuthContext";
import { Users, Shield, User, Mail, Award } from "lucide-react";

// Mock users data (in a real app, this would come from an API)
const SYSTEM_USERS = [
    {
        id: "u1",
        username: "admin",
        email: "admin@evidence.sys",
        fullName: "Admin Investigator",
        role: "investigator",
        department: "headquarters",
        badge: "INV-001",
        status: "active",
        lastLogin: "2026-01-15T14:30:00Z"
    },
    {
        id: "u2",
        username: "officer",
        email: "officer@evidence.sys",
        fullName: "John Officer",
        role: "officer",
        department: "district_a",
        badge: "OFF-102",
        status: "active",
        lastLogin: "2026-01-15T09:15:00Z"
    },
    {
        id: "u3",
        username: "chief",
        email: "chief@evidence.sys",
        fullName: "Chief Commander",
        role: "higher_rank",
        department: "headquarters",
        badge: "CHF-001",
        status: "active",
        lastLogin: "2026-01-15T08:00:00Z"
    },
    {
        id: "u4",
        username: "detective",
        email: "detective@evidence.sys",
        fullName: "Sarah Detective",
        role: "investigator",
        department: "forensics",
        badge: "INV-045",
        status: "active",
        lastLogin: "2026-01-14T17:45:00Z"
    },
    {
        id: "u5",
        username: "patrol",
        email: "patrol@evidence.sys",
        fullName: "Mike Patrol",
        role: "officer",
        department: "district_b",
        badge: "OFF-203",
        status: "active",
        lastLogin: "2026-01-13T22:30:00Z"
    }
];

export default function UsersPage() {
    const { isInvestigator } = useAuth();

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
                        <div className="stat-value">{SYSTEM_USERS.length}</div>
                        <div className="stat-label">Total Users</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-green">
                        <Shield size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {SYSTEM_USERS.filter(u => u.role === "investigator").length}
                        </div>
                        <div className="stat-label">Investigators</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-purple">
                        <Award size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {SYSTEM_USERS.filter(u => u.role === "officer").length}
                        </div>
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
                            {SYSTEM_USERS.map(user => (
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