import { mockDelay } from "../config";

const STORAGE_KEY = "mock_departments";

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  const seed = [
    { id: "dept-1", name: "Homicide", description: "Serious crimes investigations" },
    { id: "dept-2", name: "Cybercrime", description: "Digital forensics and cyber investigations" },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function save(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function getDepartments() {
  await mockDelay(150);
  return load();
}

export async function createDepartment(payload) {
  await mockDelay(250);
  const items = load();
  const created = {
    id: `dept-${Math.random().toString(16).slice(2)}`,
    name: payload?.name || "New Department",
    description: payload?.description || "",
  };
  items.push(created);
  save(items);
  return created;
}

export async function updateDepartment(id, payload) {
  await mockDelay(250);
  const items = load();
  const idx = items.findIndex((d) => d.id === id);
  if (idx < 0) throw new Error("Department not found");
  items[idx] = { ...items[idx], ...payload };
  save(items);
  return items[idx];
}

export async function deleteDepartment(id) {
  await mockDelay(250);
  const items = load().filter((d) => d.id !== id);
  save(items);
  return true;
}
