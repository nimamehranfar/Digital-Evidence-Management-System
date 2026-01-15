const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:7071";

async function handle(res) {
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
    }
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
}

export async function uploadEvidence(file) {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${BASE_URL}/api/evidence`, {
        method: "POST",
        body: form,
    });

    return handle(res);
}

export async function searchEvidence({ q, type }) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);

    const res = await fetch(`${BASE_URL}/api/search?${params.toString()}`);
    return handle(res);
}

export async function getStats() {
    const res = await fetch(`${BASE_URL}/api/stats`);
    return handle(res);
}
