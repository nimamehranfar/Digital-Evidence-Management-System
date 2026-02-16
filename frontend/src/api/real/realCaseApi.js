import { apiFetch } from "./apiClient";

export async function getCases() {
  return apiFetch("/api/cases", { method: "GET" });
}

export async function getCase(caseId) {
  return apiFetch(`/api/cases/${encodeURIComponent(caseId)}`, { method: "GET" });
}

export async function createCase(payload) {
  return apiFetch("/api/cases", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateCase(caseId, payload) {
  return apiFetch(`/api/cases/${encodeURIComponent(caseId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCase(caseId) {
  return apiFetch(`/api/cases/${encodeURIComponent(caseId)}`, { method: "DELETE" });
}

export async function addCaseNote(caseId, payload) {
  return apiFetch(`/api/cases/${encodeURIComponent(caseId)}/notes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
