import { apiFetch } from "./apiClient";
import { msalInstance } from "../../auth/msalInstance";
import { DEMS_AUTH_CONFIG, loginRequest } from "../../auth/msalConfig";

/**
 * Clears ALL MSAL interaction-in-progress state from both sessionStorage and localStorage.
 *
 * Covers MSAL v2 (msal.interaction.status, msal.*request.state, msal.*request.params)
 * and MSAL v3 (<clientId>.interaction.status).
 */
function clearStaleMsalInteractionState() {
  const clientId = DEMS_AUTH_CONFIG.clientId || "";

  const shouldClear = (k) => {
    if (!k) return false;
    // MSAL v3 interaction lock
    if (k === `${clientId}.interaction.status`) return true;
    if (k.endsWith(".interaction.status")) return true;
    // MSAL v2 / cross-version patterns
    if (k.includes("interaction.status")) return true;
    if (k.includes("interaction_status")) return true;
    if (k.includes(".request.state")) return true;
    if (k.includes(".request.params")) return true;
    if (k.includes("msal.") && k.includes("state")) return true;
    return false;
  };

  const clearStore = (store) => {
    if (!store) return;
    const keys = [];
    try {
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (shouldClear(k)) keys.push(k);
      }
    } catch (_) { /* ignore */ }
    keys.forEach((k) => {
      try { store.removeItem(k); } catch (_) { /* ignore */ }
    });
  };

  try { clearStore(window.sessionStorage); } catch (_) { /* ignore */ }
  try { clearStore(window.localStorage); } catch (_) { /* ignore */ }
}

/**
 * Initiates an MSAL loginRedirect.
 *
 * - Validates config before touching MSAL (prevents "Cannot read endsWith of undefined").
 * - Clears stale interaction state first to prevent interaction_in_progress errors.
 * - Uses prompt: "select_account" so users can switch accounts if needed.
 * - On interaction_in_progress error, clears state and retries once.
 */
export async function login() {
  if (!DEMS_AUTH_CONFIG.clientId || !DEMS_AUTH_CONFIG.authority || !DEMS_AUTH_CONFIG.apiScope) {
    throw new Error(
      "Missing Entra config in build. " +
      "Ensure REACT_APP_ENTRA_CLIENT_ID, REACT_APP_ENTRA_AUTHORITY, and REACT_APP_ENTRA_API_SCOPE " +
      "are injected as GitHub Secrets during the Azure Static Web Apps build."
    );
  }

  await msalInstance.initialize();
  clearStaleMsalInteractionState();

  const request = {
    ...loginRequest,
    prompt: "select_account",
  };

  try {
    return await msalInstance.loginRedirect(request);
  } catch (e) {
    const code = String(e?.errorCode || e?.message || "");
    if (code.includes("interaction_in_progress")) {
      // Stale state came from a store we didn't clear yet — clear and retry once
      clearStaleMsalInteractionState();
      return msalInstance.loginRedirect(request);
    }
    throw e;
  }
}

/**
 * Initiates an MSAL logoutRedirect.
 */
export async function logout() {
  return msalInstance.logoutRedirect({
    postLogoutRedirectUri: window.location.origin + "/login",
  });
}

/**
 * Fetches the current user's identity + roles from the backend.
 * This is the source of truth for role-based UI decisions.
 */
export async function getCurrentUser() {
  return apiFetch("/api/auth/me", { method: "GET" });
}

/** Profile update is not supported in this closed system. */
export async function updateProfile() {
  throw new Error("Profile update is not supported (closed system).");
}

/** Admin: list all users */
export async function getUsers() {
  return apiFetch("/api/users", { method: "GET" });
}

/** Admin: update a user's department */
export async function updateUser(oid, patch) {
  return apiFetch(`/api/users/${encodeURIComponent(oid)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
