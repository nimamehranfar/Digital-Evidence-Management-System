import { mockDelay } from "../config";

const STORAGE_KEY = "mock_cases";

// Initial mock data
const INITIAL_CASES = [
    {
        id: "case1",
        caseNumber: "2026-001-HQ",
        title: "Financial Fraud Investigation",
        description: "Investigation into corporate financial irregularities and potential embezzlement schemes.",
        status: "active",
        priority: "high",
        department: "headquarters",
        createdBy: "u2",
        assignedTo: ["u2", "u6"],
        createdAt: "2026-01-10T08:00:00Z",
        updatedAt: "2026-01-15T14:30:00Z",
        tags: ["fraud", "financial", "corporate"],
        notes: [
            {
                id: "note1",
                text: "Initial evidence gathered from accounting department. Need to review Q4 2025 statements.",
                createdBy: "u2",
                createdAt: "2026-01-10T10:00:00Z"
            }
        ]
    },
    {
        id: "case2",
        caseNumber: "2026-002-DA",
        title: "Theft at Local Store",
        description: "CCTV evidence of theft incident at convenience store on Main Street.",
        status: "active",
        priority: "medium",
        department: "district_a",
        createdBy: "u4",
        assignedTo: ["u4"],
        createdAt: "2026-01-12T10:15:00Z",
        updatedAt: "2026-01-14T16:20:00Z",
        tags: ["theft", "cctv", "retail"],
        notes: []
    },
    {
        id: "case3",
        caseNumber: "2026-003-HQ",
        title: "Cybercrime Analysis",
        description: "Digital forensics investigation into unauthorized network access and data breach.",
        status: "pending",
        priority: "high",
        department: "headquarters",
        createdBy: "u2",
        assignedTo: ["u2", "u6"],
        createdAt: "2026-01-13T09:00:00Z",
        updatedAt: "2026-01-13T09:00:00Z",
        tags: ["cybercrime", "digital", "forensics", "data-breach"],
        notes: []
    },
    {
        id: "case4",
        caseNumber: "2026-004-FOR",
        title: "Digital Evidence Recovery",
        description: "Recovery and analysis of digital evidence from seized devices.",
        status: "active",
        priority: "medium",
        department: "forensics",
        createdBy: "u6",
        assignedTo: ["u6"],
        createdAt: "2026-01-11T14:00:00Z",
        updatedAt: "2026-01-13T11:30:00Z",
        tags: ["digital", "forensics", "recovery"],
        notes: []
    }
];

// Initialize storage
function initStorage() {
    if (!sessionStorage.getItem(STORAGE_KEY)) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CASES));
    }
}

function getCasesFromStorage() {
    initStorage();
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY));
}

function saveCasesToStorage(cases) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

export async function getCases() {
    await mockDelay(400);
    return getCasesFromStorage();
}

export async function getCase(caseId) {
    await mockDelay(300);
    const cases = getCasesFromStorage();
    const caseItem = cases.find(c => c.id === caseId);

    if (!caseItem) {
        throw new Error("Case not found");
    }

    return caseItem;
}

export async function createCase(caseData) {
    await mockDelay(500);

    const cases = getCasesFromStorage();
    const currentUser = JSON.parse(sessionStorage.getItem("mock_auth_session"));

    const newCase = {
        id: `case${Date.now()}`,
        caseNumber: `2026-${String(cases.length + 1).padStart(3, '0')}-${caseData.department.toUpperCase().slice(0, 3)}`,
        status: "active",
        createdBy: currentUser?.id || "unknown",
        assignedTo: [currentUser?.id || "unknown"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [],
        ...caseData
    };

    cases.push(newCase);
    saveCasesToStorage(cases);

    return newCase;
}

export async function updateCase(caseId, updates) {
    await mockDelay(400);

    const cases = getCasesFromStorage();
    const caseIndex = cases.findIndex(c => c.id === caseId);

    if (caseIndex === -1) {
        throw new Error("Case not found");
    }

    cases[caseIndex] = {
        ...cases[caseIndex],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    saveCasesToStorage(cases);
    return cases[caseIndex];
}

export async function deleteCase(caseId) {
    await mockDelay(300);

    const cases = getCasesFromStorage();
    const filteredCases = cases.filter(c => c.id !== caseId);

    if (cases.length === filteredCases.length) {
        throw new Error("Case not found");
    }

    saveCasesToStorage(filteredCases);
    return { success: true, id: caseId };
}

export async function addCaseNote(caseId, noteText) {
    await mockDelay(300);

    const cases = getCasesFromStorage();
    const caseIndex = cases.findIndex(c => c.id === caseId);

    if (caseIndex === -1) {
        throw new Error("Case not found");
    }

    const currentUser = JSON.parse(sessionStorage.getItem("mock_auth_session"));

    const note = {
        id: `note${Date.now()}`,
        text: noteText,
        createdBy: currentUser?.id || "unknown",
        createdAt: new Date().toISOString()
    };

    cases[caseIndex].notes = [...(cases[caseIndex].notes || []), note];
    cases[caseIndex].updatedAt = new Date().toISOString();

    saveCasesToStorage(cases);
    return cases[caseIndex];
}

export async function deleteCaseNote(caseId, noteId) {
    await mockDelay(300);

    const cases = getCasesFromStorage();
    const caseIndex = cases.findIndex(c => c.id === caseId);

    if (caseIndex === -1) {
        throw new Error("Case not found");
    }

    cases[caseIndex].notes = cases[caseIndex].notes.filter(n => n.id !== noteId);
    cases[caseIndex].updatedAt = new Date().toISOString();

    saveCasesToStorage(cases);
    return cases[caseIndex];
}