import { API_CONFIG } from "../config";
import { msalInstance, ensureActiveAccount } from "../../auth/msalInstance";
import { loginRequest } from "../../auth/msalConfig";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

async function getAccessToken() {
  const account = await ensureActiveAccount();
  if (!account) {
    // Not signed in (yet).
    return null;
  }

  // IMPORTANT: For guest/MSA accounts, MSAL can cache an account but still
  // require an interactive step to mint a token for the API scope.
  // We do NOT auto-trigger redirects here (it would create loops). Instead,
  // we surface a clean "interaction_required" error so the UI can offer a
  // "Try again" sign-in button.
  try {
    const result = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account,
      // Force the configured tenant authority for token minting.
      authority: msalInstance.getConfiguration()?.auth?.authority,
    });
    return result.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      const err = new Error("interaction_required");
      err.code = "interaction_required";
      throw err;
    }
    throw e;
  }
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
