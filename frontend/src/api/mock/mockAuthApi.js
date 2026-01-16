import { mockDelay } from "../config";

// Mock user database
const USERS = [
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
    },
    {
        id: "u4",
        username: "detective",
        password: "detective123",
        email: "detective@evidence.sys",
        fullName: "Sarah Detective",
        role: "investigator",
        department: "forensics",
        badge: "INV-045",
        avatar: null
    },
    {
        id: "u5",
        username: "patrol",
        password: "patrol123",
        email: "patrol@evidence.sys",
        fullName: "Mike Patrol",
        role: "officer",
        department: "district_b",
        badge: "OFF-203",
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