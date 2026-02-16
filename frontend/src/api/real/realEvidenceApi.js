import { apiFetch } from "./apiClient";

/**
 * Evidence API (final contract)
 *
 * Upload:
 * 1) POST /api/evidence/upload-init
 * 2) PUT file to SAS URL (direct to Blob)
 * 3) POST /api/evidence/upload-confirm
 * 4) Poll GET /api/evidence/id/{evidenceId}/status
 */

export async function uploadInit(payload) {
  return apiFetch("/api/evidence/upload-init", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadToSasUrl(sasUrl, file) {
  const response = await fetch(sasUrl, {
    method: "PUT",
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    const err = new Error(text || response.statusText);
    err.status = response.status;
    throw err;
  }
  return true;
}

export async function uploadConfirm(payload) {
  return apiFetch("/api/evidence/upload-confirm", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getEvidence(params = {}) {
  const qs = new URLSearchParams();
  if (params.caseId) qs.set("caseId", params.caseId);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(`/api/evidence${suffix}`, { method: "GET" });
}

export async function getEvidenceById(evidenceId) {
  return apiFetch(`/api/evidence/id/${encodeURIComponent(evidenceId)}`, { method: "GET" });
}

export async function deleteEvidence(evidenceId) {
  return apiFetch(`/api/evidence/id/${encodeURIComponent(evidenceId)}`, { method: "DELETE" });
}

export async function getEvidenceStatus(evidenceId) {
  return apiFetch(`/api/evidence/id/${encodeURIComponent(evidenceId)}/status`, { method: "GET" });
}

export async function searchEvidence(params = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.caseId) qs.set("caseId", params.caseId);
  if (params.department) qs.set("department", params.department);
  if (params.status) qs.set("status", params.status);
  if (params.tag) qs.set("tag", params.tag);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(`/api/evidence/search${suffix}`, { method: "GET" });
}
