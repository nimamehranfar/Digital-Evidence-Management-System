import { API_CONFIG } from "../config";
import { msalInstance, ensureActiveAccount } from "../../auth/msalInstance";
import { loginRequest } from "../../auth/msalConfig";

async function getAccessToken() {
  const account = await ensureActiveAccount();
  if (!account) {
    // Not signed in (yet).
    return null;
  }
  const result = await msalInstance.acquireTokenSilent({
    ...loginRequest,
    account,
  });
  return result.accessToken;
}

async function parseError(response) {
  const text = await response.text().catch(() => "");
  try {
    return JSON.parse(text);
  } catch (_) {
    return { message: text || response.statusText };
  }
}

export async function apiFetch(path, options = {}) {
  const token = await getAccessToken();

  const headers = {
    ...API_CONFIG.HEADERS,
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${API_CONFIG.BASE_URL}${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (response.status === 204) return null;

    if (!response.ok) {
      const err = await parseError(response);
      const error = new Error(err.message || response.statusText);
      error.status = response.status;
      error.details = err;
      throw error;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response.json();
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}
