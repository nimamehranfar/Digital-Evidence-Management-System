import { apiFetch } from "./apiClient";
import { msalInstance } from "../../auth/msalInstance";
import { DEMS_AUTH_CONFIG, loginRequest } from "../../auth/msalConfig";

/**
 * Real auth uses Entra ID (MSAL redirect) + backend /api/auth/me.
 * There is no username/password inside the app.
 */
export async function login() {
  // Guard: missing build-time config causes MSAL to crash internally (e.g. authority.endsWith).
  if (!DEMS_AUTH_CONFIG.clientId || !DEMS_AUTH_CONFIG.authority) {
    throw new Error(
      "Missing Entra config in frontend build. Ensure GitHub Actions injects REACT_APP_ENTRA_CLIENT_ID and REACT_APP_ENTRA_AUTHORITY (and REACT_APP_ENTRA_API_SCOPE) during build."
    );
  }

  await msalInstance.initialize();

  // If an interactive flow was started but not finished (tab closed / refresh),
  // MSAL can get stuck in interaction_in_progress. We clean stale state and retry.
  await finalizeAnyPendingRedirect();

  try {
    return await msalInstance.loginRedirect(loginRequest);
  } catch (e) {
    if (String(e?.errorCode || e?.message || "").includes("interaction_in_progress")) {
      clearStaleMsalInteractionState();
      await finalizeAnyPendingRedirect();
      return msalInstance.loginRedirect(loginRequest);
    }
    throw e;
  }
}

export async function logout() {
  return msalInstance.logoutRedirect();
}

async function finalizeAnyPendingRedirect() {
  try {
    const result = await msalInstance.handleRedirectPromise();
    if (result?.account) msalInstance.setActiveAccount(result.account);
  } catch (_) {
    // ignore
  }
}

function clearStaleMsalInteractionState() {
  const killKeys = (store) => {
    if (!store) return;
    const keys = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (!k) continue;

      // Known patterns used by msal-browser (varies by version)
      const hit =
        k.includes("interaction.status") ||
        k.includes("msal.interaction.status") ||
        k.includes("msal.") && k.includes("request.state") ||
        k.includes("msal.") && k.includes("request.params");

      if (hit) keys.push(k);
    }
    keys.forEach((k) => {
      try {
        store.removeItem(k);
      } catch (_) {
        // ignore
      }
    });
  };

  try {
    killKeys(window.sessionStorage);
  } catch (_) {
    // ignore
  }
  try {
    killKeys(window.localStorage);
  } catch (_) {
    // ignore
  }
}

export async function getCurrentUser() {
  return apiFetch("/api/auth/me", { method: "GET" });
}

// No profile updates in this project (closed system)
export async function updateProfile() {
  throw new Error("Profile update is not supported.");
}

// Admin-only
export async function getUsers() {
  return apiFetch("/api/users", { method: "GET" });
}

// Admin-only: assign/update department for case_officer
export async function updateUser(oid, patch) {
  return apiFetch(`/api/users/${encodeURIComponent(oid)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
