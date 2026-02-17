import { apiFetch } from "./apiClient";
import { msalInstance } from "../../auth/msalInstance";
import { loginRequest } from "../../auth/msalConfig";

/**
 * Real auth uses Entra ID (MSAL redirect) + backend /api/auth/me.
 * There is no username/password inside the app.
 *
 * NOTE (SWA UX hardening):
 * - If a previous redirect attempt crashed mid-way, MSAL can leave an "interaction in progress" flag in sessionStorage.
 * - We proactively clear it on user-initiated login click to avoid the user being "stuck".
 */
function clearStuckInteraction() {
  try {
    const clientId = msalInstance.getConfiguration()?.auth?.clientId;
    if (!clientId) return;

    // MSAL uses sessionStorage for interaction status (even when cacheLocation is localStorage).
    const key = `msal.${clientId}.interaction.status`;
    const v = window.sessionStorage.getItem(key);

    // If set, clear it. This does NOT sign the user in; it only allows a new interactive flow.
    if (v) window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export async function login() {
  clearStuckInteraction();
  return msalInstance.loginRedirect(loginRequest);
}

export async function logout() {
  return msalInstance.logoutRedirect();
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
