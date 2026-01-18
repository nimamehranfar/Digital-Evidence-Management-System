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

function stripPassword(user) {
    // eslint-disable-next-line no-unused-vars
    const { password, ...rest } = user;
    return rest;
}

function requireAdmin() {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) throw new Error("Not authenticated");
    const u = JSON.parse(stored);
    if (u.role !== "admin") throw new Error("Forbidden");
}

function requireAuth() {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) throw new Error("Not authenticated");
    return JSON.parse(stored);
}

export async function login(username, password) {
    await mockDelay(500);

    const user = USERS.find(
        u => u.username === username && u.password === password
    );

    if (!user) {
        throw new Error("Invalid username or password");
    }

    // Don't store password
    const userWithoutPassword = stripPassword(user);

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

    // Username is immutable.
    const safeUpdates = { ...updates };
    delete safeUpdates.username;
    delete safeUpdates.role;
    delete safeUpdates.department;
    delete safeUpdates.badge;
    delete safeUpdates.id;

    const updatedUser = { ...currentUser, ...safeUpdates };

    // Persist to mock DB
    const idx = USERS.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
        USERS[idx] = { ...USERS[idx], ...safeUpdates };
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    return updatedUser;
}

export async function getUsers() {
    await mockDelay(400);

    // Return users without passwords
    return USERS.map((u) => ({
        ...stripPassword(u),
        status: "active",
        lastLogin: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
    }));
}

// ============================================
// ADMIN: USER MANAGEMENT
// ============================================

export async function createUser(userData) {
    await mockDelay(400);
    requireAdmin();

    const required = ["username", "password", "fullName", "email", "role", "department", "badge"];
    for (const k of required) {
        if (!userData?.[k]) throw new Error(`Missing field: ${k}`);
    }

    const username = String(userData.username).trim();
    if (!username) throw new Error("Username is required");
    if (USERS.some(u => u.username === username)) throw new Error("Username already exists");

    const nextIdNum = USERS.reduce((max, u) => {
        const n = parseInt(String(u.id).replace(/^u/, ""), 10);
        return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0) + 1;

    const newUser = {
        id: `u${nextIdNum}`,
        username,
        password: String(userData.password),
        email: String(userData.email).trim(),
        fullName: String(userData.fullName).trim(),
        role: String(userData.role),
        department: String(userData.department),
        badge: String(userData.badge).trim(),
        avatar: null
    };

    USERS.push(newUser);
    return stripPassword(newUser);
}

export async function updateUser(userId, updates) {
    await mockDelay(350);
    requireAdmin();

    const idx = USERS.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error("User not found");

    // Username & password are immutable after creation.
    const safeUpdates = { ...updates };
    delete safeUpdates.username;
    delete safeUpdates.password;
    delete safeUpdates.id;

    USERS[idx] = { ...USERS[idx], ...safeUpdates };
    return stripPassword(USERS[idx]);
}

export async function deleteUser(userId) {
    await mockDelay(300);
    requireAdmin();

    const currentUser = requireAuth();
    if (currentUser.id === userId) {
        throw new Error("You cannot delete your own user");
    }

    const idx = USERS.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error("User not found");
    USERS.splice(idx, 1);
    return { success: true, id: userId };
}

// ============================================
// SELF: PASSWORD CHANGE
// ============================================

export async function changePassword(currentPassword, newPassword) {
    await mockDelay(350);
    const currentUser = requireAuth();

    const idx = USERS.findIndex(u => u.id === currentUser.id);
    if (idx === -1) throw new Error("User not found");

    if (USERS[idx].password !== currentPassword) {
        throw new Error("Current password is incorrect");
    }

    const np = String(newPassword || "");
    if (np.length < 6) throw new Error("New password must be at least 6 characters");

    USERS[idx].password = np;
    return { success: true };
}