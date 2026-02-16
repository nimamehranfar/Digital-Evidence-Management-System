import { apiFetch } from "./apiClient";

export async function getDepartments() {
  return apiFetch("/api/departments", { method: "GET" });
}

export async function createDepartment(payload) {
  return apiFetch("/api/departments", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateDepartment(id, payload) {
  return apiFetch(`/api/departments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteDepartment(id) {
  return apiFetch(`/api/departments/${encodeURIComponent(id)}`, { method: "DELETE" });
}
