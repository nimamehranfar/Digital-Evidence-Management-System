/**
 * Core HTTP client for all real API calls.
 *
 * Token acquisition strategy:
 *   1. Try acquireTokenSilent (uses cache)
 *   2. If InteractionRequiredAuthError → call acquireTokenRedirect
 *      (redirects to Microsoft with existing SSO session, then returns to app with fresh token)
 *   3. Any other error → surface to caller
 *
 * The acquireToken() import handles steps 1-2 so this file stays simple.
 */

import { API_CONFIG } from "../config";
import { acquireToken } from "../../auth/msalInstance";

async function parseError(response) {
  const text = await response.text().catch(() => "");
  try {
    const obj = JSON.parse(text);
    return { message: obj.message || obj.error || text || response.statusText, raw: obj };
  } catch (_) {
    return { message: text || response.statusText };
  }
}

/**
 * Performs an authenticated fetch to the APIM-backed API.
 *
 * @param {string}  path     - API path, e.g. "/api/auth/me"
 * @param {object}  options  - fetch options (method, body, headers, ...)
 * @returns {Promise<any>}   - parsed JSON, plain text, or null (204)
 */
export async function apiFetch(path, options = {}) {
  // Get Bearer token (may trigger acquireTokenRedirect and never resolve)
  const token = await acquireToken();

  const headers = {
    "Content-Type": "application/json",
    ...(API_CONFIG.HEADERS || {}),
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = path.startsWith("http")
    ? path
    : `${API_CONFIG.BASE_URL}${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT || 30000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (response.status === 204) return null;

    if (!response.ok) {
      const errBody = await parseError(response);
      const error = new Error(errBody.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.details = errBody.raw || errBody;
      throw error;
    }

    const ct = response.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      return response.json();
    }
    return response.text();
  } catch (err) {
    // AbortController fires on timeout
    if (err.name === "AbortError") {
      const timeout = new Error("Request timed out");
      timeout.code = "timeout";
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
