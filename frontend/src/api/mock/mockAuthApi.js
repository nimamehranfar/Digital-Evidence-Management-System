import { mockDelay } from "../config";

const STORAGE_KEY = "mock_auth_user";

/**
 * Mock auth simulates Entra roles + /api/auth/me response.
 * It stores the selected user in localStorage.
 *
 * Response shape matches backend /api/auth/me:
 * { id, tenantId, name, roles, department? }
 */
export async function login({ name, roles, department } = {}) {
  await mockDelay(300);
  const user = {
    id: `mock-${Math.random().toString(16).slice(2)}`,
    tenantId: "mock-tenant",
    name: name || "Mock User",
    roles: Array.isArray(roles) ? roles : ["detective"],
    department: department || null,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export async function logout() {
  await mockDelay(200);
  localStorage.removeItem(STORAGE_KEY);
  return true;
}

export async function getCurrentUser() {
  await mockDelay(150);
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error("Not authenticated");
  return JSON.parse(raw);
}

export async function updateProfile() {
  await mockDelay(200);
  throw new Error("Profile update is not supported.");
}

export async function getUsers() {
  await mockDelay(200);
  // Minimal mock users list (admin can assign department for case_officer)
  return [
    { id: "oid-admin", displayName: "Admin User", email: "admin@example.com", department: null, roles: ["admin"] },
    { id: "oid-det", displayName: "Detective User", email: "detective@example.com", department: null, roles: ["detective"] },
    { id: "oid-co", displayName: "Case Officer User", email: "caseofficer@example.com", department: "dept-1", roles: ["case_officer"] },
    { id: "oid-pros", displayName: "Prosecutor User", email: "prosecutor@example.com", department: null, roles: ["prosecutor"] },
  ];
}

export async function updateUser(oid, patch) {
  await mockDelay(200);
  // For demo: echo back
  return { id: oid, ...patch };
}
