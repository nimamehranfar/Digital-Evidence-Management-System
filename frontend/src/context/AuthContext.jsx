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

    // Admin: ZERO access to investigative content
    const isAdmin = () => user?.role === "admin";

    // Detective: Full cross-department access
    const isDetective = () => user?.role === "detective";

    // Case Officer: Department-scoped access
    const isCaseOfficer = () => user?.role === "case_officer";

    // Prosecutor: Read-only access to all
    const isProsecutor = () => user?.role === "prosecutor";

    // Can access case based on role and department
    const canAccessCase = (caseItem) => {
        if (!user || !caseItem) return false;

        // Admin has NO access to cases
        if (isAdmin()) return false;

        // Detective can access everything
        if (isDetective()) return true;

        // Prosecutor can access everything (read-only)
        if (isProsecutor()) return true;

        // Case Officer can only access cases from their department
        if (isCaseOfficer()) {
            return caseItem.department === user.department;
        }

        return false;
    };

    // Can create/edit cases
    const canEditCase = (caseItem) => {
        if (!user || !caseItem) return false;

        // Admin cannot edit cases
        if (isAdmin()) return false;

        // Prosecutor cannot edit (read-only)
        if (isProsecutor()) return false;

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

    // Can add evidence
    const canAddEvidence = () => {
        if (!user) return false;

        // Admin and Prosecutor cannot add evidence
        if (isAdmin() || isProsecutor()) return false;

        // Detective and Case Officer can add evidence
        return isDetective() || isCaseOfficer();
    };

    // Can delete evidence
    const canDeleteEvidence = () => {
        if (!user) return false;

        // Only Detective can delete evidence
        return isDetective();
    };

    // Can modify evidence metadata
    const canEditEvidence = () => {
        if (!user) return false;

        // Admin and Prosecutor cannot edit evidence
        if (isAdmin() || isProsecutor()) return false;

        // Detective and Case Officer can edit evidence
        return isDetective() || isCaseOfficer();
    };

    // Can delete notes
    const canDeleteNote = (note) => {
        if (!user || !note) return false;

        // Detective can delete any note
        if (isDetective()) return true;

        // Case Officer can delete only their own notes
        if (isCaseOfficer()) {
            return note.createdBy === user.id;
        }

        return false;
    };

    // Can access analytics
    const canAccessAnalytics = () => {
        if (!user) return false;

        // Admin cannot access analytics (no investigative data)
        if (isAdmin()) return false;

        // Everyone else can access analytics
        return true;
    };

    // Can manage users (Admin only)
    const canManageUsers = () => {
        return isAdmin();
    };

    const value = {
        user,
        loading,
        login,
        logout,
        updateProfile,
        hasPermission,
        canAccessCase,
        canEditCase,
        canDeleteCase,
        canAddEvidence,
        canDeleteEvidence,
        canEditEvidence,
        canDeleteNote,
        canAccessAnalytics,
        canManageUsers,
        isAuthenticated: !!user,
        isAdmin: isAdmin(),
        isDetective: isDetective(),
        isCaseOfficer: isCaseOfficer(),
        isProsecutor: isProsecutor()
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}