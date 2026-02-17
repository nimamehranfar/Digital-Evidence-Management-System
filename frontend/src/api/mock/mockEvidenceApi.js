import { mockDelay } from "../config";

const STORAGE_KEY = "mock_evidence";

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  const seed = [
    {
      id: "ev-1",
      caseId: "case-1",
      department: "dept-1",
      fileName: "photo_scene.jpg",
      fileType: "image",
      status: "COMPLETED",
      uploadedAt: new Date().toISOString(),
      uploadedBy: "mock-user",
      description: "Scene photograph",
      tags: ["photo", "scene"],
      userTags: ["photo", "scene"],
      extractedText: "Sample extracted text from OCR",
    },
    {
      id: "ev-2",
      caseId: "case-1",
      department: "dept-1",
      fileName: "witness_statement.pdf",
      fileType: "pdf",
      status: "COMPLETED",
      uploadedAt: new Date().toISOString(),
      uploadedBy: "mock-user",
      description: "Witness statement document",
      tags: ["statement", "witness"],
      userTags: ["statement", "witness"],
      extractedText: "The witness observed the suspect at approximately 10pm.",
    },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function save(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function uploadInit({ caseId, fileName }) {
  await mockDelay(300);
  return {
    evidenceId: `ev-${Math.random().toString(16).slice(2)}`,
    sasUrl: `mock://blob/${caseId}/${fileName}`,
    uploadUrl: `mock://blob/${caseId}/${fileName}`,
    blobPath: `${caseId}/${fileName}`,
    expiresOn: new Date(Date.now() + 15 * 60_000).toISOString(),
  };
}

export async function uploadToSasUrl(sasUrl, file) {
  await mockDelay(400);
  if (!sasUrl?.startsWith("mock://")) {
    // Real SAS URL in mock mode — no-op
  }
  return true;
}

export async function uploadConfirm({ evidenceId, caseId, fileName, fileType, description, tags }) {
  await mockDelay(300);
  const items = load();
  const item = {
    id: evidenceId,
    caseId,
    department: "dept-1",
    fileName: fileName || "unknown",
    fileType: fileType || "file",
    status: "UPLOADED",
    uploadedAt: new Date().toISOString(),
    uploadedBy: "mock-user",
    description: description || "",
    tags: tags || [],
    userTags: tags || [],
  };
  items.unshift(item);
  save(items);

  // Simulate async processing → COMPLETED after a short delay
  setTimeout(() => {
    const all = load();
    const idx = all.findIndex((e) => e.id === evidenceId);
    if (idx >= 0) {
      all[idx] = { ...all[idx], status: "COMPLETED", processedAt: new Date().toISOString() };
      save(all);
    }
  }, 1500);

  return item;
}

export async function getEvidence(params = {}) {
  await mockDelay(200);
  const all = load();
  if (params.caseId) return all.filter((e) => e.caseId === params.caseId);
  return all;
}

export async function getEvidenceById(evidenceId) {
  await mockDelay(150);
  const e = load().find((x) => x.id === evidenceId);
  if (!e) throw new Error("Evidence not found");
  return e;
}

export async function deleteEvidence(evidenceId) {
  await mockDelay(250);
  const items = load().filter((e) => e.id !== evidenceId);
  save(items);
  return { ok: true, deletedEvidenceId: evidenceId };
}

export async function getEvidenceStatus(evidenceId) {
  await mockDelay(150);
  const e = load().find((x) => x.id === evidenceId);
  if (!e) throw new Error("Evidence not found");
  return { evidenceId: e.id, status: e.status, statusUpdatedAt: e.statusUpdatedAt ?? null };
}

export async function getEvidenceReadUrl(evidenceId) {
  await mockDelay(200);
  return { readUrl: `mock://blob/read/${evidenceId}`, expiresOn: new Date(Date.now() + 3600_000).toISOString() };
}

export async function searchEvidence(params = {}) {
  await mockDelay(300);
  const all = load();
  const q = (params.q || "").toLowerCase();
  const results = all.filter((e) => {
    if (params.caseId && e.caseId !== params.caseId) return false;
    if (params.status && e.status !== params.status) return false;
    if (params.tag && !(e.tags || []).includes(params.tag)) return false;
    if (q) {
      const haystack = [e.fileName, e.description, e.extractedText, ...(e.tags || [])].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
  return { count: results.length, results };
}

/**
 * Mock: update tags on an evidence record in localStorage.
 */
export async function updateEvidenceTags(evidenceId, tags) {
  await mockDelay(200);
  const items = load();
  const idx = items.findIndex((e) => e.id === evidenceId);
  if (idx < 0) throw new Error("Evidence not found");
  items[idx] = { ...items[idx], userTags: tags, tags };
  save(items);
  return items[idx];
}
