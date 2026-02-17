import { mockDelay } from "../config";

const STORAGE_KEY = "mock_cases";

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  const seed = [
    {
      id: "case-1",
      department: "dept-1",
      title: "Case 001",
      status: "OPEN",
      createdAt: new Date().toISOString(),
      notes: [
        { id: "note-seed-1", text: "Initial investigation started.", createdAt: new Date().toISOString(), createdBy: "mock-user" },
      ],
    },
    {
      id: "case-2",
      department: "dept-2",
      title: "Case 002",
      status: "OPEN",
      createdAt: new Date().toISOString(),
      notes: [],
    },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function save(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function getCases() {
  await mockDelay(150);
  return load();
}

export async function getCase(caseId) {
  await mockDelay(150);
  const c = load().find((x) => x.id === caseId);
  if (!c) throw new Error("Case not found");
  return c;
}

export async function createCase(payload) {
  await mockDelay(250);
  if (!payload?.department) throw new Error("department is required");
  const items = load();
  const created = {
    id: `case-${Math.random().toString(16).slice(2)}`,
    department: payload.department,
    title: payload?.title || "Untitled Case",
    status: payload?.status || "OPEN",
    description: payload?.description,
    createdAt: new Date().toISOString(),
    notes: [],
  };
  items.push(created);
  save(items);
  return created;
}

export async function updateCase(caseId, payload) {
  await mockDelay(250);
  const items = load();
  const idx = items.findIndex((x) => x.id === caseId);
  if (idx < 0) throw new Error("Case not found");
  items[idx] = { ...items[idx], ...payload };
  save(items);
  return items[idx];
}

export async function deleteCase(caseId) {
  await mockDelay(250);
  const items = load().filter((x) => x.id !== caseId);
  save(items);
  return true;
}

export async function addCaseNote(caseId, payload) {
  await mockDelay(200);
  const items = load();
  const idx = items.findIndex((x) => x.id === caseId);
  const note = {
    id: `note-${Math.random().toString(16).slice(2)}`,
    text: payload?.text || "",
    createdAt: new Date().toISOString(),
    createdBy: "mock-user",
  };
  if (idx >= 0) {
    items[idx] = { ...items[idx], notes: [...(items[idx].notes || []), note] };
    save(items);
  }
  return note;
}

/**
 * Mock: remove a note from the case's notes array in localStorage.
 */
export async function deleteNote(caseId, noteId) {
  await mockDelay(200);
  const items = load();
  const idx = items.findIndex((x) => x.id === caseId);
  if (idx < 0) throw new Error("Case not found");
  const before = items[idx].notes || [];
  if (!before.some((n) => n.id === noteId)) throw new Error("Note not found");
  items[idx] = {
    ...items[idx],
    notes: before.filter((n) => n.id !== noteId),
  };
  save(items);
  return { ok: true, deletedNoteId: noteId, caseId };
}
