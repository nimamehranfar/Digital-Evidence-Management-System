import { API_CONFIG } from "../config";

async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || "API request failed");
    }
    return response.json();
}

export async function getEvidence() {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/evidence`, {
        method: "GET",
        headers: API_CONFIG.HEADERS,
        credentials: "include"
    });

    return handleResponse(response);
}

export async function getEvidenceById(evidenceId) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/evidence/${evidenceId}`, {
        method: "GET",
        headers: API_CONFIG.HEADERS,
        credentials: "include"
    });

    return handleResponse(response);
}

export async function createEvidence(evidenceData) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/evidence`, {
        method: "POST",
        headers: API_CONFIG.HEADERS,
        credentials: "include",
        body: JSON.stringify(evidenceData)
    });

    return handleResponse(response);
}

export async function updateEvidence(evidenceId, updates) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/evidence/${evidenceId}`, {
        method: "PATCH",
        headers: API_CONFIG.HEADERS,
        credentials: "include",
        body: JSON.stringify(updates)
    });

    return handleResponse(response);
}

export async function deleteEvidence(evidenceId) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/evidence/${evidenceId}`, {
        method: "DELETE",
        headers: API_CONFIG.HEADERS,
        credentials: "include"
    });

    return handleResponse(response);
}

export async function searchEvidence(filters) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
    });

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/evidence/search?${params.toString()}`, {
        method: "GET",
        headers: API_CONFIG.HEADERS,
        credentials: "include"
    });

    return handleResponse(response);
}

export async function uploadFile(file, caseId, metadata) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("caseId", caseId);
    if (metadata.description) formData.append("description", metadata.description);
    if (metadata.tags) formData.append("tags", JSON.stringify(metadata.tags));

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/evidence/upload`, {
        method: "POST",
        credentials: "include",
        body: formData
    });

    return handleResponse(response);
}