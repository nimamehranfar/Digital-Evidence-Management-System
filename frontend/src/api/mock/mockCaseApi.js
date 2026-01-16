import { mockDelay } from "../config";

const STORAGE_KEY = "mock_cases";

// Initial mock data
const INITIAL_CASES = [
    {
        id: "case1",
        caseNumber: "2026-001-HQ",
        title: "Financial Fraud Investigation",
        description: "Investigation into corporate financial irregularities and potential embezzlement schemes. Multiple departments involved in comprehensive audit of transactions from Q3-Q4 2025.",
        status: "active",
        priority: "high",
        department: "headquarters",
        createdBy: "u2",
        assignedTo: ["u2", "u6"],
        createdAt: "2026-01-10T08:00:00Z",
        updatedAt: "2026-01-15T14:30:00Z",
        tags: ["fraud", "financial", "corporate", "embezzlement"],
        notes: [
            {
                id: "note1",
                text: "Initial evidence gathered from accounting department. Need to review Q4 2025 statements in detail. Several irregular wire transfers identified.",
                createdBy: "u2",
                createdAt: "2026-01-10T10:00:00Z"
            },
            {
                id: "note2",
                text: "Forensic accountant assigned to case. Expect preliminary report by end of week.",
                createdBy: "u6",
                createdAt: "2026-01-12T15:30:00Z"
            }
        ]
    },
    {
        id: "case2",
        caseNumber: "2026-002-DA",
        title: "Retail Theft Investigation",
        description: "Series of thefts at convenience store on Main Street. CCTV footage shows suspect entering premises on multiple occasions. Store owner reports missing inventory totaling approximately $2,500.",
        status: "active",
        priority: "medium",
        department: "district_a",
        createdBy: "u4",
        assignedTo: ["u4"],
        createdAt: "2026-01-12T10:15:00Z",
        updatedAt: "2026-01-14T16:20:00Z",
        tags: ["theft", "cctv", "retail", "property-crime"],
        notes: [
            {
                id: "note3",
                text: "Store manager provided surveillance footage. Suspect appears to be male, approximately 5'10\", wearing dark hoodie.",
                createdBy: "u4",
                createdAt: "2026-01-12T11:00:00Z"
            }
        ]
    },
    {
        id: "case3",
        caseNumber: "2026-003-HQ",
        title: "Cybercrime Data Breach Analysis",
        description: "Digital forensics investigation into unauthorized network access and potential data breach at municipal systems. Evidence suggests sophisticated attack vector. IT security team cooperating with investigation.",
        status: "pending",
        priority: "high",
        department: "headquarters",
        createdBy: "u2",
        assignedTo: ["u2", "u6"],
        createdAt: "2026-01-13T09:00:00Z",
        updatedAt: "2026-01-13T09:00:00Z",
        tags: ["cybercrime", "digital", "forensics", "data-breach", "hacking"],
        notes: []
    },
    {
        id: "case4",
        caseNumber: "2026-004-FOR",
        title: "Digital Evidence Recovery - Mobile Devices",
        description: "Recovery and analysis of digital evidence from seized mobile devices. Multiple devices collected during warrant execution. Comprehensive forensic imaging and analysis required.",
        status: "active",
        priority: "medium",
        department: "forensics",
        createdBy: "u6",
        assignedTo: ["u6"],
        createdAt: "2026-01-11T14:00:00Z",
        updatedAt: "2026-01-13T11:30:00Z",
        tags: ["digital", "forensics", "recovery", "mobile", "devices"],
        notes: [
            {
                id: "note4",
                text: "Three smartphones and one tablet received from evidence locker. All devices properly sealed and documented.",
                createdBy: "u6",
                createdAt: "2026-01-11T14:15:00Z"
            }
        ]
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
    const stored = sessionStorage.getItem(STORAGE_KEY);
    try {
        return JSON.parse(stored) || [];
    } catch {
        return [];
    }
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

    // Generate department-specific case number
    const deptPrefix = caseData.department.toUpperCase().slice(0, 3);
    const caseCount = cases.filter(c => c.department === caseData.department).length + 1;

    const newCase = {
        id: `case${Date.now()}`,
        caseNumber: `2026-${String(cases.length + 1).padStart(3, '0')}-${deptPrefix}`,
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

    // Handle tags update - convert comma-separated string to array if needed
    if (updates.tags && typeof updates.tags === 'string') {
        updates.tags = updates.tags.split(',').map(t => t.trim()).filter(Boolean);
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

    const originalNoteCount = cases[caseIndex].notes?.length || 0;
    cases[caseIndex].notes = (cases[caseIndex].notes || []).filter(n => n.id !== noteId);

    if (cases[caseIndex].notes.length === originalNoteCount) {
        throw new Error("Note not found");
    }

    cases[caseIndex].updatedAt = new Date().toISOString();

    saveCasesToStorage(cases);
    return cases[caseIndex];
}