import { apiFetch } from "./apiClient";
import { msalInstance } from "../../auth/msalInstance";
import { loginRequest } from "../../auth/msalConfig";

/**
 * Real auth uses Entra ID (MSAL redirect) + backend /api/auth/me.
 * There is no username/password inside the app.
 */
export async function login() {
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
