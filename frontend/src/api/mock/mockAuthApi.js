import { mockDelay } from "../config";

// Mock user database with new role structure
// Admin: System management, NO investigative access
// Detective: Full cross-department investigative access
// Case Officer: Department-scoped investigative access
// Prosecutor: Read-only access to all cases/evidence
const USERS = [
    {
        id: "u1",
        username: "admin",
        password: "admin123",
        email: "admin@evidence.sys",
        fullName: "System Administrator",
        role: "admin",
        department: "administration",
        badge: "ADM-001",
        avatar: null
    },
    {
        id: "u2",
        username: "detective",
        password: "detective123",
        email: "detective@evidence.sys",
        fullName: "Senior Detective",
        role: "detective",
        department: "headquarters",
        badge: "DET-001",
        avatar: null
    },
    {
        id: "u3",
        username: "officer_hq",
        password: "officer123",
        email: "officer.hq@evidence.sys",
        fullName: "Officer Johnson",
        role: "case_officer",
        department: "headquarters",
        badge: "OFF-HQ-102",
        avatar: null
    },
    {
        id: "u4",
        username: "officer_da",
        password: "officer123",
        email: "officer.da@evidence.sys",
        fullName: "Officer Martinez",
        role: "case_officer",
        department: "district_a",
        badge: "OFF-DA-205",
        avatar: null
    },
    {
        id: "u5",
        username: "prosecutor",
        password: "prosecutor123",
        email: "prosecutor@evidence.sys",
        fullName: "Prosecutor Williams",
        role: "prosecutor",
        department: "legal",
        badge: "PROS-001",
        avatar: null
    },
    {
        id: "u6",
        username: "detective2",
        password: "detective123",
        email: "detective2@evidence.sys",
        fullName: "Task Force Lead",
        role: "detective",
        department: "forensics",
        badge: "DET-FOR-045",
        avatar: null
    },
    {
        id: "u7",
        username: "officer_db",
        password: "officer123",
        email: "officer.db@evidence.sys",
        fullName: "Officer Chen",
        role: "case_officer",
        department: "district_b",
        badge: "OFF-DB-312",
        avatar: null
    }
];

const SESSION_KEY = "mock_auth_session";

export async function login(username, password) {
    await mockDelay(500);

    const user = USERS.find(
        u => u.username === username && u.password === password
    );

    if (!user) {
        throw new Error("Invalid username or password");
    }

    // Don't store password
    const { password: _, ...userWithoutPassword } = user;

    // Store session
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(userWithoutPassword));

    return userWithoutPassword;
}

export async function logout() {
    await mockDelay(200);
    sessionStorage.removeItem(SESSION_KEY);
    return { success: true };
}

export async function getCurrentUser() {
    await mockDelay(100);

    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) {
        throw new Error("Not authenticated");
    }

    try {
        return JSON.parse(stored);
    } catch {
        sessionStorage.removeItem(SESSION_KEY);
        throw new Error("Invalid session");
    }
}

export async function updateProfile(updates) {
    await mockDelay(300);

    const currentUser = await getCurrentUser();
    const updatedUser = { ...currentUser, ...updates };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    return updatedUser;
}

export async function getUsers() {
    await mockDelay(400);

    // Return users without passwords
    return USERS.map(({ password, ...user }) => ({
        ...user,
        status: "active",
        lastLogin: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
    }));
}