import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}

// Mock users database
const MOCK_USERS = [
    {
        id: "u1",
        username: "admin",
        password: "admin123",
        email: "admin@evidence.sys",
        fullName: "Admin Investigator",
        role: "investigator",
        department: "headquarters",
        badge: "INV-001",
        avatar: null
    },
    {
        id: "u2",
        username: "officer",
        password: "officer123",
        email: "officer@evidence.sys",
        fullName: "John Officer",
        role: "officer",
        department: "district_a",
        badge: "OFF-102",
        avatar: null
    },
    {
        id: "u3",
        username: "chief",
        password: "chief123",
        email: "chief@evidence.sys",
        fullName: "Chief Commander",
        role: "higher_rank",
        department: "headquarters",
        badge: "CHF-001",
        avatar: null
    }
];

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for stored session
        const storedUser = sessionStorage.getItem("authUser");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                sessionStorage.removeItem("authUser");
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const foundUser = MOCK_USERS.find(
            u => u.username === username && u.password === password
        );

        if (!foundUser) {
            throw new Error("Invalid username or password");
        }

        // Don't store password
        const { password: _, ...userWithoutPassword } = foundUser;

        setUser(userWithoutPassword);
        sessionStorage.setItem("authUser", JSON.stringify(userWithoutPassword));

        return userWithoutPassword;
    };

    const logout = () => {
        setUser(null);
        sessionStorage.removeItem("authUser");
    };

    const updateProfile = (updates) => {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        sessionStorage.setItem("authUser", JSON.stringify(updatedUser));
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

        // Only investigators can edit/delete
        return user.role === "investigator";
    };

    const canAddEvidence = () => {
        // All authenticated users can add evidence
        return !!user;
    };

    const canDeleteEvidence = () => {
        // Only investigators can delete
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