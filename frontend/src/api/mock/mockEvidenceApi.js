import { mockDelay } from "../config";

const STORAGE_KEY = "mock_evidence";

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  const seed = [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function save(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function now() {
  return new Date().toISOString();
}

export async function uploadInit(payload) {
  await mockDelay(200);
  if (!payload?.caseId) throw new Error("caseId is required");
  const evidenceId = `ev-${Math.random().toString(16).slice(2)}`;
  return {
    evidenceId,
    // In mock mode we don't use real SAS; caller will skip PUT
    sasUrl: `mock://sas/${evidenceId}`,
    blobPath: `evidence-raw/${payload.caseId}/${evidenceId}`,
  };
}

export async function uploadToSasUrl(_sasUrl, _file) {
  await mockDelay(200);
  return true;
}

export async function uploadConfirm(payload) {
  await mockDelay(200);
  const items = load();
  const item = {
    id: payload.evidenceId,
    caseId: payload.caseId,
    department: payload.department || null,
    fileName: payload.fileName,
    fileType: payload.fileType,
    description: payload.description || "",
    tags: payload.tags || [],
    status: "UPLOADED",
    uploadedAt: now(),
    uploadedBy: payload.uploadedBy || "mock-user",
    extractedText: "",
  };
  items.push(item);
  save(items);

  // Kick off mock "processing" progression
  setTimeout(() => {
    const cur = load();
    const idx = cur.findIndex((x) => x.id === payload.evidenceId);
    if (idx >= 0) {
      cur[idx] = { ...cur[idx], status: "PROCESSING" };
      save(cur);
    }
  }, 800);

  setTimeout(() => {
    const cur = load();
    const idx = cur.findIndex((x) => x.id === payload.evidenceId);
    if (idx >= 0) {
      cur[idx] = { ...cur[idx], status: "COMPLETED", extractedText: "Mock OCR extracted text." };
      save(cur);
    }
  }, 2500);

  return item;
}

export async function getEvidence(params = {}) {
  await mockDelay(150);
  const items = load();
  if (params.caseId) return items.filter((x) => x.caseId === params.caseId);
  return items;
}

export async function getEvidenceById(evidenceId) {
  await mockDelay(150);
  const item = load().find((x) => x.id === evidenceId);
  if (!item) throw new Error("Evidence not found");
  return item;
}

export async function deleteEvidence(evidenceId) {
  await mockDelay(200);
  const items = load().filter((x) => x.id !== evidenceId);
  save(items);
  return true;
}

export async function getEvidenceStatus(evidenceId) {
  await mockDelay(150);
  const item = load().find((x) => x.id === evidenceId);
  if (!item) throw new Error("Evidence not found");
  return { id: evidenceId, status: item.status };
}

export async function getEvidenceReadUrl(evidenceId) {
  await mockDelay(120);
  // In mock mode, just return a data URL-ish placeholder.
  return {
    evidenceId,
    readUrl: `mock://read/${encodeURIComponent(evidenceId)}`,
    expiresOn: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}

export async function searchEvidence(params = {}) {
  await mockDelay(200);
  const q = (params.q || "").toLowerCase();
  const items = load().filter((x) => {
    if (params.caseId && x.caseId !== params.caseId) return false;
    if (params.department && x.department !== params.department) return false;
    if (params.status && x.status !== params.status) return false;
    if (params.tag && !(x.tags || []).includes(params.tag)) return false;
    if (!q) return true;
    const hay = `${x.fileName} ${x.description} ${(x.tags || []).join(" ")} ${x.extractedText || ""}`.toLowerCase();
    return hay.includes(q);
  });
  return items;
}
