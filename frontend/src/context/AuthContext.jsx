import { createContext, useContext, useState, useEffect } from "react";
import * as authApi from "../api/authApi";

const AuthContext = createContext();

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for stored session
        const checkAuth = async () => {
            try {
                const currentUser = await authApi.getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                // No valid session
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    const login = async (username, password) => {
        const userData = await authApi.login(username, password);
        setUser(userData);
        return userData;
    };

    const logout = async () => {
        await authApi.logout();
        setUser(null);
    };

    const updateProfile = async (updates) => {
        const updatedUser = await authApi.updateProfile(updates);
        setUser(updatedUser);
        return updatedUser;
    };

    const hasPermission = (requiredRoles) => {
        if (!user) return false;
        if (!requiredRoles || requiredRoles.length === 0) return true;
        return requiredRoles.includes(user.role);
    };

    // ============================================
    // ROLE CHECKERS
    // ============================================

    // Admin: System management only, NO investigative access
    const isAdmin = () => user?.role === "admin";

    // Detective: Full cross-department investigative access
    const isDetective = () => user?.role === "detective";

    // Case Officer: Department-scoped investigative access
    const isCaseOfficer = () => user?.role === "case_officer";

    // Prosecutor: Read-only access to all cases/evidence
    const isProsecutor = () => user?.role === "prosecutor";

    // ============================================
    // CASE ACCESS PERMISSIONS
    // ============================================

    // Can view case details
    const canAccessCase = (caseItem) => {
        if (!user || !caseItem) return false;

        // Admin has NO access to investigative content
        if (isAdmin()) return false;

        // Detective can access all cases
        if (isDetective()) return true;

        // Prosecutor can view all cases (read-only)
        if (isProsecutor()) return true;

        // Case Officer can only access cases from their department
        if (isCaseOfficer()) {
            return caseItem.department === user.department;
        }

        return false;
    };

    // Can create new cases
    const canCreateCase = () => {
        if (!user) return false;

        // Only Detective and Case Officer can create cases
        return isDetective() || isCaseOfficer();
    };

    // Can edit case details (title, description, status, etc.)
    const canEditCase = (caseItem) => {
        if (!user || !caseItem) return false;

        // Admin and Prosecutor cannot edit
        if (isAdmin() || isProsecutor()) return false;

        // Detective can edit all cases
        if (isDetective()) return true;

        // Case Officer can edit only their department's cases
        if (isCaseOfficer()) {
            return caseItem.department === user.department;
        }

        return false;
    };

    // Can delete cases
    const canDeleteCase = (caseItem) => {
        if (!user || !caseItem) return false;

        // Only Detective can delete cases
        return isDetective();
    };

    // ============================================
    // EVIDENCE PERMISSIONS
    // ============================================

    // Can upload evidence
    const canAddEvidence = () => {
        if (!user) return false;

        // Admin and Prosecutor cannot upload evidence
        if (isAdmin() || isProsecutor()) return false;

        // Detective and Case Officer can upload
        return isDetective() || isCaseOfficer();
    };

    // Can edit evidence metadata (description, user tags)
    const canEditEvidence = (evidence) => {
        if (!user || !evidence) return false;

        // Admin and Prosecutor cannot edit
        if (isAdmin() || isProsecutor()) return false;

        // Detective can edit all evidence
        if (isDetective()) return true;

        // Case Officer can edit evidence from their department's cases
        // This requires case lookup, simplified to allow if uploaded by user
        if (isCaseOfficer()) {
            return evidence.uploadedBy === user.id;
        }

        return false;
    };

    // Can delete evidence
    const canDeleteEvidence = () => {
        if (!user) return false;

        // Only Detective can delete evidence
        return isDetective();
    };

    // ============================================
    // NOTE PERMISSIONS
    // ============================================

    // Can add notes to cases
    const canAddNote = (caseItem) => {
        if (!user || !caseItem) return false;

        // Admin cannot add notes
        if (isAdmin()) return false;

        // Everyone else with case access can add notes
        return canAccessCase(caseItem);
    };

    // Can delete notes
    const canDeleteNote = (note, caseItem) => {
        if (!user || !note || !caseItem) return false;

        // Admin cannot interact with notes
        if (isAdmin()) return false;

        // Detective can delete any note
        if (isDetective()) return true;

        // Case Officer and Prosecutor can delete only their own notes
        return note.createdBy === user.id;
    };

    // ============================================
    // ANALYTICS & SEARCH PERMISSIONS
    // ============================================

    // Can access analytics dashboard
    const canAccessAnalytics = () => {
        if (!user) return false;

        // Admin cannot access analytics (no investigative data)
        if (isAdmin()) return false;

        // Everyone else can access analytics
        return true;
    };

    // Can perform cross-department searches
    const canSearchAllDepartments = () => {
        if (!user) return false;

        // Detective and Prosecutor can search across departments
        return isDetective() || isProsecutor();
    };

    // ============================================
    // USER MANAGEMENT PERMISSIONS
    // ============================================

    // Can manage users (create, edit, delete, assign roles)
    const canManageUsers = () => {
        return isAdmin();
    };

    // Can view user list
    const canViewUsers = () => {
        return isAdmin();
    };

    // ============================================
    // SYSTEM CONFIGURATION PERMISSIONS
    // ============================================

    // Can manage departments
    const canManageDepartments = () => {
        return isAdmin();
    };

    // Can configure authentication settings
    const canManageAuth = () => {
        return isAdmin();
    };

    // Can view audit logs
    const canViewAuditLogs = () => {
        return isAdmin() || isDetective();
    };

    const value = {
        user,
        loading,
        login,
        logout,
        updateProfile,
        hasPermission,

        // Role checkers
        isAdmin: isAdmin(),
        isDetective: isDetective(),
        isCaseOfficer: isCaseOfficer(),
        isProsecutor: isProsecutor(),

        // Case permissions
        canAccessCase,
        canCreateCase,
        canEditCase,
        canDeleteCase,

        // Evidence permissions
        canAddEvidence,
        canEditEvidence,
        canDeleteEvidence,

        // Note permissions
        canAddNote,
        canDeleteNote,

        // Analytics & Search
        canAccessAnalytics,
        canSearchAllDepartments,

        // User management
        canManageUsers,
        canViewUsers,

        // System configuration
        canManageDepartments,
        canManageAuth,
        canViewAuditLogs,

        // Utility
        isAuthenticated: !!user
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}