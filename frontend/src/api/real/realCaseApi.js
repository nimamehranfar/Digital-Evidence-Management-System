import { API_CONFIG } from "../config";

async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || "API request failed");
    }
    return response.json();
}

export async function getCases() {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/cases`, {
        method: "GET",
        headers: API_CONFIG.HEADERS,
        credentials: "include"
    });

    return handleResponse(response);
}

export async function getCase(caseId) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/cases/${caseId}`, {
        method: "GET",
        headers: API_CONFIG.HEADERS,
        credentials: "include"
    });

    return handleResponse(response);
}

export async function createCase(caseData) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/cases`, {
        method: "POST",
        headers: API_CONFIG.HEADERS,
        credentials: "include",
        body: JSON.stringify(caseData)
    });

    return handleResponse(response);
}

export async function updateCase(caseId, updates) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/cases/${caseId}`, {
        method: "PATCH",
        headers: API_CONFIG.HEADERS,
        credentials: "include",
        body: JSON.stringify(updates)
    });

    return handleResponse(response);
}

export async function deleteCase(caseId) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/cases/${caseId}`, {
        method: "DELETE",
        headers: API_CONFIG.HEADERS,
        credentials: "include"
    });

    return handleResponse(response);
}

export async function addCaseNote(caseId, noteText) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/cases/${caseId}/notes`, {
        method: "POST",
        headers: API_CONFIG.HEADERS,
        credentials: "include",
        body: JSON.stringify({ text: noteText })
    });

    return handleResponse(response);
}