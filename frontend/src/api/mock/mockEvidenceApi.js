import { mockDelay } from "../config";

const STORAGE_KEY = "mock_evidence";

// Simulate Azure Cognitive Services processing
function simulateAzureCognitiveServices(fileName, fileType) {
    const metadata = {
        processedAt: new Date().toISOString(),
        processingTime: Math.floor(Math.random() * 3000) + 500
    };

    let autoTags = [];
    let extractedText = "";

    switch (fileType) {
        case "pdf":
            // Simulate OCR extraction
            metadata.pages = Math.floor(Math.random() * 10) + 1;
            metadata.ocrConfidence = 0.85 + Math.random() * 0.15;
            autoTags = ["document", "scanned", "text"];
            extractedText = `[OCR Extracted] Sample text from ${fileName}. This document contains ${metadata.pages} pages of relevant information.`;
            break;

        case "image":
            // Simulate Computer Vision analysis
            const objects = ["person", "vehicle", "building", "street", "object"];
            const detectedObjects = objects.slice(0, Math.floor(Math.random() * 3) + 1);
            metadata.width = 1920;
            metadata.height = 1080;
            metadata.detectedObjects = detectedObjects;
            metadata.faces = Math.floor(Math.random() * 3);
            metadata.landmarks = [];
            autoTags = ["photo", "visual", ...detectedObjects];
            extractedText = `Image analysis detected: ${detectedObjects.join(", ")}. ${metadata.faces} face(s) detected.`;
            break;

        case "audio":
            // Simulate Speech-to-Text
            metadata.duration = Math.floor(Math.random() * 600) + 60;
            metadata.sampleRate = 44100;
            metadata.format = "wav";
            metadata.speakers = Math.floor(Math.random() * 3) + 1;
            metadata.language = "en-US";
            metadata.confidence = 0.82 + Math.random() * 0.15;
            autoTags = ["audio", "recording", "speech"];
            extractedText = `[Transcript] Audio recording, duration: ${Math.floor(metadata.duration / 60)}:${String(metadata.duration % 60).padStart(2, '0')}. ${metadata.speakers} speaker(s) detected. Sample transcript content...`;
            break;

        case "video":
            // Simulate Video Indexer
            metadata.duration = Math.floor(Math.random() * 1200) + 120;
            metadata.resolution = "1920x1080";
            metadata.fps = 30;
            metadata.scenes = Math.floor(Math.random() * 10) + 1;
            metadata.keyframes = Math.floor(metadata.duration / 10);
            autoTags = ["video", "footage", "surveillance"];
            extractedText = `Video analysis: ${metadata.scenes} scene(s) detected. Duration: ${Math.floor(metadata.duration / 60)} minutes.`;
            break;

        case "text":
            // Simulate Text Analytics
            metadata.lines = Math.floor(Math.random() * 500) + 50;
            metadata.encoding = "utf-8";
            metadata.sentiment = ["positive", "neutral", "negative"][Math.floor(Math.random() * 3)];
            metadata.keyPhrases = ["investigation", "evidence", "suspect", "timeline"];
            autoTags = ["text", "document", "log"];
            extractedText = `Text file contains ${metadata.lines} lines. Key phrases identified: ${metadata.keyPhrases.join(", ")}`;
            break;

        default:
            autoTags = ["file", "unknown"];
    }

    return {
        metadata,
        autoTags,
        extractedText
    };
}

// Initial mock evidence
const INITIAL_EVIDENCE = [
    {
        id: "e1",
        caseId: "case1",
        fileName: "invoice_2025.pdf",
        fileType: "pdf",
        fileSize: 245000,
        uploadedAt: "2026-01-10T12:20:00Z",
        uploadedBy: "u2",
        tags: ["invoice", "legal", "financial", "document", "scanned", "text"],
        autoTags: ["document", "scanned", "text"],
        userTags: ["invoice", "legal", "financial"],
        status: "COMPLETED",
        description: "Annual financial invoice showing discrepancies",
        extractedText: "[OCR Extracted] Invoice #2025-1234 for financial services rendered. Total amount: $125,000. Discrepancies noted in line items 45-67.",
        metadata: {
            pages: 3,
            ocrConfidence: 0.94,
            processedAt: "2026-01-10T12:21:30Z",
            processingTime: 1500
        }
    },
    {
        id: "e2",
        caseId: "case2",
        fileName: "cctv_frame_001.png",
        fileType: "image",
        fileSize: 1850000,
        uploadedAt: "2026-01-12T14:10:00Z",
        uploadedBy: "u3",
        tags: ["surveillance", "suspect", "photo", "visual", "person", "vehicle"],
        autoTags: ["photo", "visual", "person", "vehicle"],
        userTags: ["surveillance", "suspect"],
        status: "COMPLETED",
        description: "Surveillance footage snapshot showing suspect at entrance",
        extractedText: "Image analysis detected: person, vehicle. 2 face(s) detected.",
        metadata: {
            width: 1920,
            height: 1080,
            detectedObjects: ["person", "vehicle"],
            faces: 2,
            landmarks: [],
            processedAt: "2026-01-12T14:11:00Z",
            processingTime: 850
        }
    },
    {
        id: "e3",
        caseId: "case1",
        fileName: "witness_interview.wav",
        fileType: "audio",
        fileSize: 5200000,
        uploadedAt: "2026-01-11T18:02:00Z",
        uploadedBy: "u2",
        tags: ["interview", "witness", "testimony", "audio", "recording", "speech"],
        autoTags: ["audio", "recording", "speech"],
        userTags: ["interview", "witness", "testimony"],
        status: "COMPLETED",
        description: "Witness interview recording - Accounting Manager",
        extractedText: "[Transcript] Audio recording, duration: 5:20. 2 speaker(s) detected. Witness statement regarding irregular financial transactions observed in Q4 2025...",
        metadata: {
            duration: 320,
            sampleRate: 44100,
            format: "wav",
            speakers: 2,
            language: "en-US",
            confidence: 0.89,
            processedAt: "2026-01-11T18:05:00Z",
            processingTime: 2800
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

    // Simulate Azure Cognitive Services processing
    const azureResults = simulateAzureCognitiveServices(
        evidenceData.fileName,
        evidenceData.fileType
    );

    const newEvidence = {
        id: `e${Date.now()}`,
        uploadedBy: currentUser?.id || "unknown",
        uploadedAt: new Date().toISOString(),
        status: "PROCESSING",
        tags: [],
        autoTags: azureResults.autoTags,
        userTags: evidenceData.tags || [],
        extractedText: "",
        ...evidenceData,
        metadata: azureResults.metadata
    };

    // Combine auto and user tags
    newEvidence.tags = [...new Set([...azureResults.autoTags, ...(evidenceData.tags || [])])];

    evidence.push(newEvidence);
    saveEvidenceToStorage(evidence);

    // Simulate async processing completion
    setTimeout(async () => {
        const updatedEvidence = getEvidenceFromStorage();
        const index = updatedEvidence.findIndex(e => e.id === newEvidence.id);
        if (index !== -1) {
            updatedEvidence[index].status = "COMPLETED";
            updatedEvidence[index].extractedText = azureResults.extractedText;
            saveEvidenceToStorage(updatedEvidence);
        }
    }, 2000);

    return newEvidence;
}

export async function updateEvidence(evidenceId, updates) {
    await mockDelay(400);

    const evidence = getEvidenceFromStorage();
    const evidenceIndex = evidence.findIndex(e => e.id === evidenceId);

    if (evidenceIndex === -1) {
        throw new Error("Evidence not found");
    }

    // If tags are being updated, separate auto and user tags
    if (updates.tags) {
        const currentEvidence = evidence[evidenceIndex];
        const newUserTags = updates.tags.filter(tag => !currentEvidence.autoTags.includes(tag));
        updates.userTags = newUserTags;
        updates.tags = [...new Set([...currentEvidence.autoTags, ...newUserTags])];
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