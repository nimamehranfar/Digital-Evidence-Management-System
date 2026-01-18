import { API_CONFIG } from "../config";

async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || "API request failed");
    }
    return response.json();
}

export async function login(username, password) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: API_CONFIG.HEADERS,
        body: JSON.stringify({ username, password })
    });

    return handleResponse(response);
}

export async function logout() {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: API_CONFIG.HEADERS,
        credentials: "include"
    });

    return handleResponse(response);
}

export async function getCurrentUser() {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/me`, {
        method: "GET",
        headers: API_CONFIG.HEADERS,
        credentials: "include"
    });

    return handleResponse(response);
}

export async function updateProfile(updates) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/profile`, {
        method: "PATCH",
        headers: API_CONFIG.HEADERS,
        credentials: "include",
        body: JSON.stringify(updates)
    });

    return handleResponse(response);
}

export async function getUsers() {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/users`, {
        method: "GET",
        headers: API_CONFIG.HEADERS,
        credentials: "include"
    });

    return handleResponse(response);
}

// ============================================
// ADMIN: USER MANAGEMENT
// ============================================

export async function createUser(userData) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/users`, {
        method: "POST",
        headers: API_CONFIG.HEADERS,
        credentials: "include",
        body: JSON.stringify(userData)
    });

    return handleResponse(response);
}

export async function updateUser(userId, updates) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: API_CONFIG.HEADERS,
        credentials: "include",
        body: JSON.stringify(updates)
    });

    return handleResponse(response);
}

export async function deleteUser(userId) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: API_CONFIG.HEADERS,
        credentials: "include"
    });

    return handleResponse(response);
}

// ============================================
// SELF: PASSWORD CHANGE
// ============================================

export async function changePassword(currentPassword, newPassword) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/change-password`, {
        method: "POST",
        headers: API_CONFIG.HEADERS,
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword })
    });

    return handleResponse(response);
}