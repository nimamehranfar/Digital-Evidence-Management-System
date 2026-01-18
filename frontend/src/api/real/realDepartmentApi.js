import { API_CONFIG } from "../config";

async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || "API request failed");
    }
    return response.json();
}

export async function getDepartments() {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/departments`, {
        method: "GET",
        headers: API_CONFIG.HEADERS,
        credentials: "include"
    });

    return handleResponse(response);
}

export async function createDepartment(dept) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/departments`, {
        method: "POST",
        headers: API_CONFIG.HEADERS,
        credentials: "include",
        body: JSON.stringify(dept)
    });

    return handleResponse(response);
}

export async function updateDepartment(deptId, updates) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/departments/${encodeURIComponent(deptId)}`, {
        method: "PATCH",
        headers: API_CONFIG.HEADERS,
        credentials: "include",
        body: JSON.stringify(updates)
    });

    return handleResponse(response);
}

export async function deleteDepartment(deptId) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/departments/${encodeURIComponent(deptId)}`, {
        method: "DELETE",
        headers: API_CONFIG.HEADERS,
        credentials: "include"
    });

    return handleResponse(response);
}
