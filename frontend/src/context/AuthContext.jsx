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

    const canAccessCase = (caseItem) => {
        if (!user || !caseItem) return false;

        // Investigators can access everything
        if (user.role === "investigator") return true;

        // Higher rank can access everything
        if (user.role === "higher_rank") return true;

        // Officers can only access cases from their department
        if (user.role === "officer") {
            return caseItem.department === user.department;
        }

        return false;
    };

    const canEditCase = (caseItem) => {
        if (!user || !caseItem) return false;
        return user.role === "investigator";
    };

    const canAddEvidence = () => {
        return !!user;
    };

    const canDeleteEvidence = () => {
        return user?.role === "investigator";
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
        canAddEvidence,
        canDeleteEvidence,
        isAuthenticated: !!user,
        isInvestigator: user?.role === "investigator",
        isOfficer: user?.role === "officer",
        isHigherRank: user?.role === "higher_rank"
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}