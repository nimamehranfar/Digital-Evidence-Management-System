import { mockDelay } from "../config";
import { getUsers } from "./mockAuthApi";

const SESSION_KEY = "mock_auth_session";

// NOTE: department `id` is the stable key used across users/cases.
// Admin can edit the display `name`. Deleting a department is blocked if in use.
const DEPARTMENTS = [
    { id: "administration", name: "Administration" },
    { id: "headquarters", name: "Headquarters" },
    { id: "district_a", name: "District A" },
    { id: "district_b", name: "District B" },
    { id: "forensics", name: "Forensics" },
    { id: "legal", name: "Legal" }
];

function requireAdmin() {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) throw new Error("Not authenticated");
    const u = JSON.parse(stored);
    if (u.role !== "admin") throw new Error("Forbidden");
}

export async function getDepartments() {
    await mockDelay(200);
    return DEPARTMENTS.map(d => ({ ...d }));
}

export async function createDepartment(dept) {
    await mockDelay(250);
    requireAdmin();

    if (!dept?.id) throw new Error("Missing field: id");
    if (!dept?.name) throw new Error("Missing field: name");

    const id = String(dept.id).trim();
    const name = String(dept.name).trim();

    if (!/^[a-z0-9_]+$/.test(id)) {
        throw new Error("Department id must contain only lowercase letters, numbers, and underscores");
    }

    if (DEPARTMENTS.some(d => d.id === id)) throw new Error("Department id already exists");

    const newDept = { id, name };
    DEPARTMENTS.push(newDept);
    return { ...newDept };
}

export async function updateDepartment(deptId, updates) {
    await mockDelay(250);
    requireAdmin();

    const idx = DEPARTMENTS.findIndex(d => d.id === deptId);
    if (idx === -1) throw new Error("Department not found");

    // Department id is immutable (it's the stable key referenced by users/cases).
    const safeUpdates = { ...updates };
    delete safeUpdates.id;

    if (safeUpdates.name != null) {
        const name = String(safeUpdates.name).trim();
        if (!name) throw new Error("Department name is required");
        safeUpdates.name = name;
    }

    DEPARTMENTS[idx] = { ...DEPARTMENTS[idx], ...safeUpdates };
    return { ...DEPARTMENTS[idx] };
}

export async function deleteDepartment(deptId) {
    await mockDelay(250);
    requireAdmin();

    const users = await getUsers();
    const inUse = users.some(u => u.department === deptId);
    if (inUse) {
        throw new Error("Cannot delete a department that is assigned to users");
    }

    const idx = DEPARTMENTS.findIndex(d => d.id === deptId);
    if (idx === -1) throw new Error("Department not found");

    DEPARTMENTS.splice(idx, 1);
    return { success: true, id: deptId };
}
