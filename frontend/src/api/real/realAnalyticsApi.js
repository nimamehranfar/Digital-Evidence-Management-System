import { API_CONFIG } from "../config";

async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || "API request failed");
    }
    return response.json();
}

export async function getStats(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
    });

    const queryString = params.toString();
    const url = `${API_CONFIG.BASE_URL}/api/analytics/stats${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
        method: "GET",
        headers: API_CONFIG.HEADERS,
        credentials: "include"
    });

    return handleResponse(response);
}