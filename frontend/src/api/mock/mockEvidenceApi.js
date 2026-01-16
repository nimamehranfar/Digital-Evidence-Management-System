import { mockDelay } from "../config";

const STORAGE_KEY = "mock_evidence";

// ============================================
// AZURE COGNITIVE SERVICES SIMULATION
// ============================================
// Simulates Azure Computer Vision, OCR, Speech-to-Text, Video Indexer
// In production, these would be real API calls to Azure services

function simulateAzureCognitiveServices(fileName, fileType) {
    const metadata = {
        processedAt: new Date().toISOString(),
        processingTime: Math.floor(Math.random() * 3000) + 500,
        azureServiceVersion: "2024.01"
    };

    let autoTags = [];
    let extractedText = "";

    switch (fileType) {
        case "pdf":
            // Simulate Azure Form Recognizer + OCR
            metadata.pages = Math.floor(Math.random() * 10) + 1;
            metadata.ocrConfidence = (0.85 + Math.random() * 0.15).toFixed(3);
            metadata.language = "en";
            metadata.orientation = "portrait";
            metadata.textBlocks = Math.floor(Math.random() * 50) + 10;

            autoTags = ["document", "scanned", "text", "pdf"];
            extractedText = `[OCR Extracted] Document analysis complete. ${metadata.pages} page(s) processed. Text extraction confidence: ${metadata.ocrConfidence}. Content includes legal terminology, dates, and structured data. Key sections identified: header, body, signature block.`;
            break;

        case "image":
            // Simulate Azure Computer Vision API
            const objects = ["person", "vehicle", "building", "street", "object", "face", "hand", "logo"];
            const detectedObjects = objects
                .sort(() => 0.5 - Math.random())
                .slice(0, Math.floor(Math.random() * 4) + 1);

            metadata.width = 1920 + Math.floor(Math.random() * 1000);
            metadata.height = 1080 + Math.floor(Math.random() * 1000);
            metadata.format = "jpg";
            metadata.colorSpace = "RGB";
            metadata.detectedObjects = detectedObjects.map(obj => ({
                name: obj,
                confidence: (0.75 + Math.random() * 0.25).toFixed(3),
                boundingBox: {
                    x: Math.floor(Math.random() * 500),
                    y: Math.floor(Math.random() * 500),
                    width: Math.floor(Math.random() * 200) + 50,
                    height: Math.floor(Math.random() * 200) + 50
                }
            }));
            metadata.faces = Math.floor(Math.random() * 4);
            metadata.landmarks = ["building", "street_sign"].filter(() => Math.random() > 0.5);
            metadata.dominantColors = ["#1a1a1a", "#4a4a4a", "#ffffff"].slice(0, 2);
            metadata.isAdultContent = false;
            metadata.adultScore = (Math.random() * 0.1).toFixed(3);

            autoTags = ["photo", "visual", "image", ...detectedObjects];
            extractedText = `[Computer Vision Analysis] Image dimensions: ${metadata.width}x${metadata.height}. Detected objects: ${detectedObjects.join(", ")}. Face count: ${metadata.faces}. Scene type: outdoor/indoor classification applied. Color analysis: ${metadata.dominantColors.join(", ")}. Quality assessment: sharp, well-lit.`;
            break;

        case "audio":
            // Simulate Azure Speech-to-Text + Speaker Recognition
            metadata.duration = Math.floor(Math.random() * 600) + 60;
            metadata.sampleRate = 44100;
            metadata.format = "wav";
            metadata.channels = Math.random() > 0.5 ? 2 : 1;
            metadata.bitrate = 320;
            metadata.speakers = Math.floor(Math.random() * 3) + 1;
            metadata.language = "en-US";
            metadata.languageConfidence = (0.82 + Math.random() * 0.15).toFixed(3);
            metadata.transcriptionConfidence = (0.85 + Math.random() * 0.12).toFixed(3);
            metadata.speakerDiarization = Array.from({ length: metadata.speakers }, (_, i) => ({
                speakerId: `Speaker_${i + 1}`,
                segments: Math.floor(Math.random() * 10) + 5
            }));
            metadata.keyPhrases = ["investigation", "timeline", "evidence", "witness", "location"];

            autoTags = ["audio", "recording", "speech", "interview"];
            extractedText = `[Speech-to-Text Transcript] Duration: ${Math.floor(metadata.duration / 60)}:${String(metadata.duration % 60).padStart(2, '0')}. ${metadata.speakers} speaker(s) identified. Language: ${metadata.language} (confidence: ${metadata.languageConfidence}). Transcript summary: Interview recording with clear audio quality. Key topics discussed: ${metadata.keyPhrases.join(", ")}. Emotional tone: neutral to professional. Transcription quality: high confidence across all segments.`;
            break;

        case "video":
            // Simulate Azure Video Indexer
            metadata.duration = Math.floor(Math.random() * 1200) + 120;
            metadata.resolution = ["1920x1080", "1280x720", "3840x2160"][Math.floor(Math.random() * 3)];
            metadata.fps = [30, 60][Math.floor(Math.random() * 2)];
            metadata.codec = "H.264";
            metadata.format = "mp4";
            metadata.scenes = Math.floor(Math.random() * 15) + 3;
            metadata.keyframes = Math.floor(metadata.duration / 10);
            metadata.detectedPeople = Math.floor(Math.random() * 5) + 1;
            metadata.faceTracking = metadata.detectedPeople > 0;
            metadata.objectTracking = ["vehicle", "phone", "document"].filter(() => Math.random() > 0.6);
            metadata.audioTracks = 1;
            metadata.hasSubtitles = false;
            metadata.sceneBreaks = Array.from({ length: metadata.scenes }, (_, i) => ({
                sceneId: i + 1,
                startTime: Math.floor((metadata.duration / metadata.scenes) * i),
                duration: Math.floor(metadata.duration / metadata.scenes),
                shotType: ["wide", "medium", "close-up"][Math.floor(Math.random() * 3)]
            }));

            autoTags = ["video", "footage", "surveillance", "recording"];
            extractedText = `[Video Analysis] Resolution: ${metadata.resolution} @ ${metadata.fps}fps. Duration: ${Math.floor(metadata.duration / 60)} minutes. ${metadata.scenes} scene(s) detected with ${metadata.keyframes} keyframes extracted. Face tracking: ${metadata.faceTracking ? 'enabled' : 'disabled'}. ${metadata.detectedPeople} person(s) tracked across frames. Object tracking identified: ${metadata.objectTracking.join(", ") || "none"}. Scene composition analysis complete with shot-type classification.`;
            break;

        case "text":
            // Simulate Azure Text Analytics + Key Phrase Extraction
            metadata.lines = Math.floor(Math.random() * 500) + 50;
            metadata.words = metadata.lines * (Math.floor(Math.random() * 10) + 5);
            metadata.characters = metadata.words * 6;
            metadata.encoding = "utf-8";
            metadata.language = "en";
            metadata.languageConfidence = (0.92 + Math.random() * 0.08).toFixed(3);
            metadata.sentiment = {
                overall: ["positive", "neutral", "negative"][Math.floor(Math.random() * 3)],
                positiveScore: (Math.random() * 0.5).toFixed(3),
                neutralScore: (0.3 + Math.random() * 0.4).toFixed(3),
                negativeScore: (Math.random() * 0.3).toFixed(3)
            };
            metadata.keyPhrases = [
                "investigation timeline",
                "evidence collection",
                "witness statement",
                "forensic analysis",
                "case documentation"
            ].slice(0, Math.floor(Math.random() * 3) + 2);
            metadata.entities = [
                { type: "Person", name: "John Doe", confidence: 0.95 },
                { type: "Location", name: "123 Main Street", confidence: 0.88 },
                { type: "DateTime", name: "January 15, 2026", confidence: 0.92 }
            ];

            autoTags = ["text", "document", "log", "report"];
            extractedText = `[Text Analytics] Document contains ${metadata.lines} lines (${metadata.words} words, ${metadata.characters} characters). Language: ${metadata.language} (confidence: ${metadata.languageConfidence}). Sentiment: ${metadata.sentiment.overall} (positive: ${metadata.sentiment.positiveScore}, neutral: ${metadata.sentiment.neutralScore}, negative: ${metadata.sentiment.negativeScore}). Key phrases: ${metadata.keyPhrases.join(", ")}. Entities detected: ${metadata.entities.map(e => `${e.type}(${e.name})`).join(", ")}.`;
            break;

        default:
            autoTags = ["file", "unknown"];
            extractedText = "File format not supported for content analysis.";
    }

    return {
        metadata,
        autoTags,
        extractedText
    };
}

// ============================================
// INITIAL MOCK EVIDENCE
// ============================================

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
        autoTags: ["document", "scanned", "text", "pdf"],
        userTags: ["invoice", "legal", "financial"],
        status: "COMPLETED",
        description: "Annual financial invoice showing discrepancies",
        extractedText: "[OCR Extracted] Document analysis complete. 3 page(s) processed. Text extraction confidence: 0.942. Content includes legal terminology, dates, and structured data. Key sections identified: header, body, signature block.",
        metadata: {
            pages: 3,
            ocrConfidence: "0.942",
            language: "en",
            orientation: "portrait",
            textBlocks: 47,
            processedAt: "2026-01-10T12:21:30Z",
            processingTime: 1500,
            azureServiceVersion: "2024.01"
        }
    },
    {
        id: "e2",
        caseId: "case2",
        fileName: "cctv_frame_001.png",
        fileType: "image",
        fileSize: 1850000,
        uploadedAt: "2026-01-12T14:10:00Z",
        uploadedBy: "u4",
        tags: ["surveillance", "suspect", "photo", "visual", "person", "vehicle"],
        autoTags: ["photo", "visual", "image", "person", "vehicle"],
        userTags: ["surveillance", "suspect"],
        status: "COMPLETED",
        description: "Surveillance footage snapshot showing suspect at entrance",
        extractedText: "[Computer Vision Analysis] Image dimensions: 1920x1080. Detected objects: person, vehicle. Face count: 2. Scene type: outdoor/indoor classification applied. Color analysis: #1a1a1a, #4a4a4a. Quality assessment: sharp, well-lit.",
        metadata: {
            width: 1920,
            height: 1080,
            format: "jpg",
            colorSpace: "RGB",
            detectedObjects: [
                { name: "person", confidence: "0.942", boundingBox: { x: 340, y: 120, width: 180, height: 240 } },
                { name: "vehicle", confidence: "0.887", boundingBox: { x: 850, y: 450, width: 320, height: 180 } }
            ],
            faces: 2,
            landmarks: ["building", "street_sign"],
            dominantColors: ["#1a1a1a", "#4a4a4a"],
            isAdultContent: false,
            adultScore: "0.012",
            processedAt: "2026-01-12T14:11:00Z",
            processingTime: 850,
            azureServiceVersion: "2024.01"
        }
    }
];

// ============================================
// STORAGE FUNCTIONS
// ============================================

function initStorage() {
    if (!sessionStorage.getItem(STORAGE_KEY)) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EVIDENCE));
    }
}

function getEvidenceFromStorage() {
    initStorage();
    const stored = sessionStorage.getItem(STORAGE_KEY);
    try {
        return JSON.parse(stored) || [];
    } catch {
        return [];
    }
}

function saveEvidenceToStorage(evidence) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(evidence));
}

// ============================================
// API FUNCTIONS
// ============================================

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
        userTags: evidenceData.userTags || evidenceData.tags || [],
        extractedText: "",
        description: evidenceData.description || "",
        ...evidenceData,
        metadata: azureResults.metadata
    };

    // Combine auto and user tags
    newEvidence.tags = [...new Set([...azureResults.autoTags, ...newEvidence.userTags])];

    evidence.push(newEvidence);
    saveEvidenceToStorage(evidence);

    // Simulate async processing completion (Azure Cognitive Services callback)
    setTimeout(() => {
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

    const currentEvidence = evidence[evidenceIndex];

    // Handle user tags update (preserve auto tags from Azure)
    if (updates.userTags) {
        updates.tags = [...new Set([...currentEvidence.autoTags, ...updates.userTags])];
    }

    evidence[evidenceIndex] = {
        ...currentEvidence,
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
            (e.description && e.description.toLowerCase().includes(q)) ||
            (e.extractedText && e.extractedText.toLowerCase().includes(q)) ||
            (e.tags && e.tags.some(tag => tag.toLowerCase().includes(q)))
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
        userTags: metadata.tags || [],
        description: metadata.description || ""
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