import { mockDelay } from "../config";

const STORAGE_KEY = "mock_evidence";

// Initial mock evidence
const INITIAL_EVIDENCE = [
    {
        id: "e1",
        caseId: "case1",
        fileName: "invoice_2025.pdf",
        fileType: "pdf",
        fileSize: 245000,
        uploadedAt: "2026-01-10T12:20:00Z",
        uploadedBy: "u1",
        tags: ["invoice", "legal", "financial"],
        status: "COMPLETED",
        description: "Annual financial invoice showing discrepancies",
        extractedText: "Invoice #2025-1234 for financial services rendered. Total amount: $125,000. Discrepancies noted in line items 45-67.",
        metadata: {
            pages: 3,
            author: "Finance Dept"
        }
    },
    {
        id: "e2",
        caseId: "case2",
        fileName: "cctv_frame_001.png",
        fileType: "image",
        fileSize: 1850000,
        uploadedAt: "2026-01-12T14:10:00Z",
        uploadedBy: "u2",
        tags: ["camera", "suspect", "cctv"],
        status: "COMPLETED",
        description: "Surveillance footage snapshot showing suspect at entrance",
        extractedText: "",
        metadata: {
            width: 1920,
            height: 1080,
            detectedObjects: ["person", "vehicle", "bag"]
        }
    },
    {
        id: "e3",
        caseId: "case1",
        fileName: "witness_interview_001.wav",
        fileType: "audio",
        fileSize: 5200000,
        uploadedAt: "2026-01-11T18:02:00Z",
        uploadedBy: "u1",
        tags: ["interview", "witness", "testimony"],
        status: "COMPLETED",
        description: "Witness interview recording - Accounting Manager",
        extractedText: "Transcript: The witness stated that irregular transactions were observed in Q4 2025. Multiple transfers to offshore accounts without proper authorization.",
        metadata: {
            duration: 320,
            format: "wav",
            sampleRate: 44100
        }
    },
    {
        id: "e4",
        caseId: "case3",
        fileName: "server_logs_2026-01.txt",
        fileType: "text",
        fileSize: 89000,
        uploadedAt: "2026-01-13T10:30:00Z",
        uploadedBy: "u1",
        tags: ["logs", "server", "network"],
        status: "COMPLETED",
        description: "Server access logs showing unauthorized login attempts",
        extractedText: "Multiple failed login attempts from IP 192.168.1.XXX between 02:00 and 04:00 AM. Successful breach at 04:23 AM.",
        metadata: {
            lines: 1247,
            encoding: "utf-8"
        }
    },
    {
        id: "e5",
        caseId: "case2",
        fileName: "cctv_full_recording.mp4",
        fileType: "video",
        fileSize: 45000000,
        uploadedAt: "2026-01-12T15:00:00Z",
        uploadedBy: "u2",
        tags: ["video", "surveillance", "full-recording"],
        status: "PROCESSING",
        description: "Complete CCTV recording from 10:00 AM to 11:30 AM",
        extractedText: "",
        metadata: {
            duration: 5400,
            resolution: "1920x1080",
            fps: 30
        }
    }
];

function initStorage() {
    if (!sessionStorage.getItem(STORAGE_KEY)) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EVIDENCE));
    }
}

function getEvidenceFromStorage() {
    initStorage();
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY));
}

function saveEvidenceToStorage(evidence) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(evidence));
}

export async function getEvidence() {
    await mockDelay(450);
    return getEvidenceFromStorage();
}

export async function getEvidenceById(evidenceId) {
    await mockDelay(300);
    const evidence = getEvidenceFromStorage();
    const item = evidence.find(e => e.id === evidenceId);

    if (!item) {
        throw new Error("Evidence not found");
    }

    return item;
}

export async function createEvidence(evidenceData) {
    await mockDelay(600);

    const evidence = getEvidenceFromStorage();
    const currentUser = JSON.parse(sessionStorage.getItem("mock_auth_session"));

    const newEvidence = {
        id: `e${Date.now()}`,
        uploadedBy: currentUser?.id || "unknown",
        uploadedAt: new Date().toISOString(),
        status: "COMPLETED",
        tags: [],
        extractedText: "",
        metadata: {},
        ...evidenceData
    };

    evidence.push(newEvidence);
    saveEvidenceToStorage(evidence);

    return newEvidence;
}

export async function updateEvidence(evidenceId, updates) {
    await mockDelay(400);

    const evidence = getEvidenceFromStorage();
    const evidenceIndex = evidence.findIndex(e => e.id === evidenceId);

    if (evidenceIndex === -1) {
        throw new Error("Evidence not found");
    }

    evidence[evidenceIndex] = {
        ...evidence[evidenceIndex],
        ...updates
    };

    saveEvidenceToStorage(evidence);
    return evidence[evidenceIndex];
}

export async function deleteEvidence(evidenceId) {
    await mockDelay(300);

    const evidence = getEvidenceFromStorage();
    const filteredEvidence = evidence.filter(e => e.id !== evidenceId);

    if (evidence.length === filteredEvidence.length) {
        throw new Error("Evidence not found");
    }

    saveEvidenceToStorage(filteredEvidence);
    return { success: true, id: evidenceId };
}

export async function searchEvidence(filters) {
    await mockDelay(450);

    let evidence = getEvidenceFromStorage();
    const { query, fileType, status, caseId, fromDate, toDate } = filters;

    if (caseId) {
        evidence = evidence.filter(e => e.caseId === caseId);
    }

    if (fileType) {
        evidence = evidence.filter(e => e.fileType === fileType);
    }

    if (status) {
        evidence = evidence.filter(e => e.status === status);
    }

    if (fromDate) {
        evidence = evidence.filter(e => new Date(e.uploadedAt) >= new Date(fromDate));
    }

    if (toDate) {
        evidence = evidence.filter(e => new Date(e.uploadedAt) <= new Date(toDate));
    }

    if (query) {
        const q = query.toLowerCase();
        evidence = evidence.filter(e =>
            e.fileName.toLowerCase().includes(q) ||
            e.description?.toLowerCase().includes(q) ||
            e.extractedText?.toLowerCase().includes(q) ||
            e.tags.some(tag => tag.toLowerCase().includes(q))
        );
    }

    return evidence;
}

export async function uploadFile(file, caseId, metadata) {
    await mockDelay(1500);

    // Simulate file upload
    const fileType = getFileType(file);

    return await createEvidence({
        caseId,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        ...metadata
    });
}

function getFileType(file) {
    const ext = file.name.split(".").pop().toLowerCase();

    if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) return "image";
    if (["mp4", "avi", "mov", "wmv", "flv", "mkv"].includes(ext)) return "video";
    if (["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext)) return "audio";
    if (["pdf"].includes(ext)) return "pdf";
    if (["txt", "doc", "docx", "rtf"].includes(ext)) return "text";

    return "other";
}