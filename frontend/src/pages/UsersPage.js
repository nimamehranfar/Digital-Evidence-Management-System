import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as authApi from "../api/authApi";
import * as departmentApi from "../api/departmentApi";
import {
    Users,
    Shield,
    Mail,
    Award,
    Plus,
    Edit2,
    Trash2,
    X,
    Save,
    Building2,
    KeyRound
} from "lucide-react";

const ROLE_OPTIONS = [
    { value: "admin", label: "Admin" },
    { value: "detective", label: "Detective" },
    { value: "case_officer", label: "Case Officer" },
    { value: "prosecutor", label: "Prosecutor" }
];

function titleize(value) {
    return String(value || "")
        .replace(/_/g, " ")
        .split(" ")
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

function Modal({ title, children, onClose, size = "" }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal ${size}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="btn-icon" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function UsersPage() {
    const { isAdmin, user: currentUser } = useAuth();

    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // User modals
    const [showAddUser, setShowAddUser] = useState(false);
    const [showEditUser, setShowEditUser] = useState(false);
    const [showDeleteUser, setShowDeleteUser] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userForm, setUserForm] = useState({
        username: "",
        password: "",
        fullName: "",
        email: "",
        role: "case_officer",
        department: "",
        badge: ""
    });

    // Department modals
    const [showAddDept, setShowAddDept] = useState(false);
    const [showEditDept, setShowEditDept] = useState(false);
    const [showDeleteDept, setShowDeleteDept] = useState(false);
    const [selectedDept, setSelectedDept] = useState(null);
    const [deptForm, setDeptForm] = useState({ id: "", name: "" });

    useEffect(() => {
        if (isAdmin) {
            loadAll();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    const loadAll = async () => {
        setLoading(true);
        setError("");
        try {
            const [usersData, deptData] = await Promise.all([
                authApi.getUsers(),
                departmentApi.getDepartments()
            ]);
            setUsers(Array.isArray(usersData) ? usersData : []);
            setDepartments(Array.isArray(deptData) ? deptData : []);
        } catch (e) {
            setError(e?.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const deptNameById = useMemo(() => {
        const m = new Map();
        for (const d of departments) m.set(d.id, d.name);
        return m;
    }, [departments]);

    const resetNotices = () => {
        setError("");
        setSuccess("");
    };

    const openAddUser = () => {
        resetNotices();
        setUserForm({
            username: "",
            password: "",
            fullName: "",
            email: "",
            role: "case_officer",
            department: departments[0]?.id || "",
            badge: ""
        });
        setShowAddUser(true);
    };

    const openEditUser = (u) => {
        resetNotices();
        setSelectedUser(u);
        setUserForm({
            username: u.username,
            password: "",
            fullName: u.fullName || "",
            email: u.email || "",
            role: u.role,
            department: u.department,
            badge: u.badge || ""
        });
        setShowEditUser(true);
    };

    const openDeleteUser = (u) => {
        resetNotices();
        setSelectedUser(u);
        setShowDeleteUser(true);
    };

    const submitAddUser = async () => {
        resetNotices();
        setBusy(true);
        try {
            await authApi.createUser({
                username: userForm.username,
                password: userForm.password,
                fullName: userForm.fullName,
                email: userForm.email,
                role: userForm.role,
                department: userForm.department,
                badge: userForm.badge
            });
            setSuccess("User created");
            setShowAddUser(false);
            await loadAll();
        } catch (e) {
            setError(e?.message || "Failed to create user");
        } finally {
            setBusy(false);
        }
    };

    const submitEditUser = async () => {
        if (!selectedUser) return;
        resetNotices();
        setBusy(true);
        try {
            await authApi.updateUser(selectedUser.id, {
                // username/password are intentionally omitted (immutable)
                fullName: userForm.fullName,
                email: userForm.email,
                role: userForm.role,
                department: userForm.department,
                badge: userForm.badge
            });
            setSuccess("User updated");
            setShowEditUser(false);
            setSelectedUser(null);
            await loadAll();
        } catch (e) {
            setError(e?.message || "Failed to update user");
        } finally {
            setBusy(false);
        }
    };

    const confirmDeleteUser = async () => {
        if (!selectedUser) return;
        resetNotices();
        setBusy(true);
        try {
            await authApi.deleteUser(selectedUser.id);
            setSuccess("User deleted");
            setShowDeleteUser(false);
            setSelectedUser(null);
            await loadAll();
        } catch (e) {
            setError(e?.message || "Failed to delete user");
        } finally {
            setBusy(false);
        }
    };

    const openAddDept = () => {
        resetNotices();
        setDeptForm({ id: "", name: "" });
        setShowAddDept(true);
    };

    const openEditDept = (d) => {
        resetNotices();
        setSelectedDept(d);
        setDeptForm({ id: d.id, name: d.name });
        setShowEditDept(true);
    };

    const openDeleteDept = (d) => {
        resetNotices();
        setSelectedDept(d);
        setShowDeleteDept(true);
    };

    const submitAddDept = async () => {
        resetNotices();
        setBusy(true);
        try {
            await departmentApi.createDepartment({ id: deptForm.id, name: deptForm.name });
            setSuccess("Department created");
            setShowAddDept(false);
            await loadAll();
        } catch (e) {
            setError(e?.message || "Failed to create department");
        } finally {
            setBusy(false);
        }
    };

    const submitEditDept = async () => {
        if (!selectedDept) return;
        resetNotices();
        setBusy(true);
        try {
            await departmentApi.updateDepartment(selectedDept.id, { name: deptForm.name });
            setSuccess("Department updated");
            setShowEditDept(false);
            setSelectedDept(null);
            await loadAll();
        } catch (e) {
            setError(e?.message || "Failed to update department");
        } finally {
            setBusy(false);
        }
    };

    const confirmDeleteDept = async () => {
        if (!selectedDept) return;
        resetNotices();
        setBusy(true);
        try {
            await departmentApi.deleteDepartment(selectedDept.id);
            setSuccess("Department deleted");
            setShowDeleteDept(false);
            setSelectedDept(null);
            await loadAll();
        } catch (e) {
            setError(e?.message || "Failed to delete department");
        } finally {
            setBusy(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <Users size={64} />
                    <h2>Access Denied</h2>
                    <p>Only admins can manage users.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-screen">
                    <div className="loading-spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    const totalUsers = users.length;
    const detectives = users.filter(u => u.role === "detective").length;
    const officers = users.filter(u => u.role === "case_officer").length;

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>User & Department Management</h1>
                    <p>Create users, manage roles, departments, and badge IDs</p>
                </div>
                <div className="button-group">
                    <button className="btn btn-secondary" onClick={openAddDept}>
                        <Building2 size={18} />
                        <span>Add Department</span>
                    </button>
                    <button className="btn btn-primary" onClick={openAddUser}>
                        <Plus size={18} />
                        <span>Add User</span>
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Stats */}
            <div className="stats-grid stats-grid-3">
                <div className="stat-card">
                    <div className="stat-icon stat-icon-blue">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{totalUsers}</div>
                        <div className="stat-label">Total Users</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-green">
                        <Shield size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{detectives}</div>
                        <div className="stat-label">Detectives</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-purple">
                        <Award size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{officers}</div>
                        <div className="stat-label">Case Officers</div>
                    </div>
                </div>
            </div>

            {/* Users */}
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
                                {/*<th>Username</th>*/}
                                <th>Role</th>
                                <th>Department</th>
                                <th>Badge</th>
                                {/*<th>Status</th>*/}
                                <th>Last Login</th>
                                <th style={{ width: 120 }}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar-sm">
                                                {(u.fullName || "?").charAt(0)}
                                            </div>
                                            <div className="user-cell-content">
                                                <span className="user-cell-name">{u.fullName}</span>
                                                <span className="user-cell-email">
                                                    <Mail size={12} />
                                                    {u.email}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    {/*<td>*/}
                                    {/*    <span className="badge-code">{u.username}</span>*/}
                                    {/*</td>*/}
                                    <td>
                                        <span className="badge badge-gray">{titleize(u.role)}</span>
                                    </td>
                                    <td>
                                        <span className="table-cell-secondary">
                                            {deptNameById.get(u.department) || titleize(u.department)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="badge-code">{u.badge}</span>
                                    </td>
                                    {/*<td>*/}
                                    {/*    <span className={`status-dot status-${u.status || "active"}`}>*/}
                                    {/*        {u.status || "active"}*/}
                                    {/*    </span>*/}
                                    {/*</td>*/}
                                    <td>
                                        <span className="table-cell-secondary">
                                            {u.lastLogin
                                                ? `${new Date(u.lastLogin).toLocaleDateString()} ${new Date(u.lastLogin).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                                : "—"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="button-group">
                                            <button className="btn-icon" onClick={() => openEditUser(u)} aria-label="Edit user">
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => openDeleteUser(u)}
                                                aria-label="Delete user"
                                                disabled={currentUser?.id === u.id}
                                                title={currentUser?.id === u.id ? "You cannot delete your own user" : "Delete"}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Departments */}
            <div className="card">
                <div className="card-header">
                    <h2>Departments</h2>
                </div>
                <div className="card-content">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                            <tr>
                                <th>Department ID</th>
                                <th>Name</th>
                                <th style={{ width: 120 }}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {departments.map(d => (
                                <tr key={d.id}>
                                    <td><span className="badge-code">{d.id}</span></td>
                                    <td>{d.name}</td>
                                    <td>
                                        <div className="button-group">
                                            <button className="btn-icon" onClick={() => openEditDept(d)} aria-label="Edit department">
                                                <Edit2 size={18} />
                                            </button>
                                            <button className="btn-icon" onClick={() => openDeleteDept(d)} aria-label="Delete department">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add User */}
            {showAddUser && (
                <Modal title="Add User" onClose={() => setShowAddUser(false)}>
                    <div className="modal-content">
                        <div className="alert alert-info">
                            <KeyRound size={16} style={{ marginRight: 8 }} />
                            Username and initial password are set on creation and cannot be changed later.
                        </div>

                        <div className="form-group">
                            <label htmlFor="new_username">Username</label>
                            <input
                                id="new_username"
                                value={userForm.username}
                                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                                placeholder="e.g. officer_jane"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="new_password">Initial Password</label>
                            <input
                                id="new_password"
                                type="password"
                                value={userForm.password}
                                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                placeholder="Set an initial password"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="new_fullname">Full Name</label>
                            <input
                                id="new_fullname"
                                value={userForm.fullName}
                                onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="new_email">Email</label>
                            <input
                                id="new_email"
                                type="email"
                                value={userForm.email}
                                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="new_role">Role</label>
                                <select
                                    id="new_role"
                                    value={userForm.role}
                                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                                >
                                    {ROLE_OPTIONS.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="new_dept">Department</label>
                                <select
                                    id="new_dept"
                                    value={userForm.department}
                                    onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                                >
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="new_badge">Badge ID</label>
                            <input
                                id="new_badge"
                                value={userForm.badge}
                                onChange={(e) => setUserForm({ ...userForm, badge: e.target.value })}
                                placeholder="e.g. OFF-DA-123"
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowAddUser(false)} disabled={busy}>
                            <X size={16} />
                            <span>Cancel</span>
                        </button>
                        <button className="btn btn-primary" onClick={submitAddUser} disabled={busy}>
                            <Save size={16} />
                            <span>Create</span>
                        </button>
                    </div>
                </Modal>
            )}

            {/* Edit User */}
            {showEditUser && selectedUser && (
                <Modal title="Edit User" onClose={() => setShowEditUser(false)}>
                    <div className="modal-content">
                        {/*<div className="alert alert-info">*/}
                        {/*    <KeyRound size={16} style={{ marginRight: 8 }} />*/}
                        {/*</div>*/}

                        <div className="form-group">
                            <label>Username</label>
                            <div className="form-value form-value-readonly">{selectedUser.username}</div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="edit_fullname">Full Name</label>
                            <div className="form-value form-value-readonly">{selectedUser.fullName}</div>
                            {/*<input*/}
                            {/*    id="edit_fullname"*/}
                            {/*    value={userForm.fullName}*/}
                            {/*    onChange={(e) => setUserForm({...userForm, fullName: e.target.value})}*/}
                            {/*/>*/}
                        </div>

                        <div className="form-group">
                            <label htmlFor="edit_email">Email</label>
                            <div className="form-value form-value-readonly">{selectedUser.email}</div>
                            {/*<input*/}
                            {/*    id="edit_email"*/}
                            {/*    type="email"*/}
                            {/*    value={userForm.email}*/}
                            {/*    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}*/}
                            {/*/>*/}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="edit_role">Role</label>
                                <select
                                    id="edit_role"
                                    value={userForm.role}
                                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                                >
                                    {ROLE_OPTIONS.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit_dept">Department</label>
                                <select
                                    id="edit_dept"
                                    value={userForm.department}
                                    onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                                >
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="edit_badge">Badge ID</label>
                            <input
                                id="edit_badge"
                                value={userForm.badge}
                                onChange={(e) => setUserForm({ ...userForm, badge: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowEditUser(false)} disabled={busy}>
                            <X size={16} />
                            <span>Cancel</span>
                        </button>
                        <button className="btn btn-primary" onClick={submitEditUser} disabled={busy}>
                            <Save size={16} />
                            <span>Save</span>
                        </button>
                    </div>
                </Modal>
            )}

            {/* Delete User */}
            {showDeleteUser && selectedUser && (
                <Modal title="Delete User" onClose={() => setShowDeleteUser(false)} size="modal-sm">
                    <div className="modal-content">
                        <div className="alert alert-warning">
                            This will permanently delete <b>{selectedUser.fullName}</b> ({selectedUser.username}).
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowDeleteUser(false)} disabled={busy}>
                            <X size={16} />
                            <span>Cancel</span>
                        </button>
                        <button className="btn btn-danger" onClick={confirmDeleteUser} disabled={busy}>
                            <Trash2 size={16} />
                            <span>Delete</span>
                        </button>
                    </div>
                </Modal>
            )}

            {/* Add Department */}
            {showAddDept && (
                <Modal title="Add Department" onClose={() => setShowAddDept(false)}>
                    <div className="modal-content">
                        <div className="alert alert-info">
                            Department ID is the stable key used across users and cases.
                        </div>
                        <div className="form-group">
                            <label htmlFor="dept_id">Department ID</label>
                            <input
                                id="dept_id"
                                value={deptForm.id}
                                onChange={(e) => setDeptForm({ ...deptForm, id: e.target.value })}
                                placeholder="e.g. district_c"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="dept_name">Display Name</label>
                            <input
                                id="dept_name"
                                value={deptForm.name}
                                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                                placeholder="e.g. District C"
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowAddDept(false)} disabled={busy}>
                            <X size={16} />
                            <span>Cancel</span>
                        </button>
                        <button className="btn btn-primary" onClick={submitAddDept} disabled={busy}>
                            <Save size={16} />
                            <span>Create</span>
                        </button>
                    </div>
                </Modal>
            )}

            {/* Edit Department */}
            {showEditDept && selectedDept && (
                <Modal title="Edit Department" onClose={() => setShowEditDept(false)}>
                    <div className="modal-content">
                        <div className="form-group">
                            <label>Department ID (read-only)</label>
                            <div className="form-value form-value-readonly">{selectedDept.id}</div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="dept_edit_name">Display Name</label>
                            <input
                                id="dept_edit_name"
                                value={deptForm.name}
                                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowEditDept(false)} disabled={busy}>
                            <X size={16} />
                            <span>Cancel</span>
                        </button>
                        <button className="btn btn-primary" onClick={submitEditDept} disabled={busy}>
                            <Save size={16} />
                            <span>Save</span>
                        </button>
                    </div>
                </Modal>
            )}

            {/* Delete Department */}
            {showDeleteDept && selectedDept && (
                <Modal title="Delete Department" onClose={() => setShowDeleteDept(false)} size="modal-sm">
                    <div className="modal-content">
                        <div className="alert alert-warning">
                            This will delete <b>{selectedDept.name}</b> ({selectedDept.id}).
                            <br />
                            Departments cannot be deleted if they are assigned to any users.
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowDeleteDept(false)} disabled={busy}>
                            <X size={16} />
                            <span>Cancel</span>
                        </button>
                        <button className="btn btn-danger" onClick={confirmDeleteDept} disabled={busy}>
                            <Trash2 size={16} />
                            <span>Delete</span>
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
