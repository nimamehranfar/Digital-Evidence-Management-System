import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const CaseContext = createContext();

export function useCase() {
    const context = useContext(CaseContext);
    if (!context) {
        throw new Error("useCase must be used within CaseProvider");
    }
    return context;
}

// Mock cases database
const INITIAL_CASES = [
    {
        id: "case1",
        caseNumber: "2026-001-HQ",
        title: "Financial Fraud Investigation",
        description: "Investigation into corporate financial irregularities",
        status: "active",
        priority: "high",
        department: "headquarters",
        createdBy: "u1",
        assignedTo: ["u1", "u2"],
        createdAt: "2026-01-10T08:00:00Z",
        updatedAt: "2026-01-15T14:30:00Z",
        tags: ["fraud", "financial", "corporate"],
        notes: []
    },
    {
        id: "case2",
        caseNumber: "2026-002-DA",
        title: "Theft at Local Store",
        description: "CCTV evidence of theft incident",
        status: "active",
        priority: "medium",
        department: "district_a",
        createdBy: "u2",
        assignedTo: ["u2"],
        createdAt: "2026-01-12T10:15:00Z",
        updatedAt: "2026-01-14T16:20:00Z",
        tags: ["theft", "cctv"],
        notes: []
    },
    {
        id: "case3",
        caseNumber: "2026-003-HQ",
        title: "Cybercrime Analysis",
        description: "Digital forensics and cybercrime investigation",
        status: "pending",
        priority: "high",
        department: "headquarters",
        createdBy: "u1",
        assignedTo: ["u1", "u3"],
        createdAt: "2026-01-13T09:00:00Z",
        updatedAt: "2026-01-13T09:00:00Z",
        tags: ["cybercrime", "digital", "forensics"],
        notes: []
    }
];

// Mock evidence linked to cases
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
        description: "Annual financial invoice",
        extractedText: "Invoice #2025-1234 for financial services...",
        metadata: {
            pages: 3,
            author: "Finance Dept"
        }
    },
    {
        id: "e2",
        caseId: "case2",
        fileName: "cctv_frame.png",
        fileType: "image",
        fileSize: 1850000,
        uploadedAt: "2026-01-12T14:10:00Z",
        uploadedBy: "u2",
        tags: ["camera", "suspect", "cctv"],
        status: "COMPLETED",
        description: "Surveillance footage snapshot",
        extractedText: "",
        metadata: {
            width: 1920,
            height: 1080,
            detectedObjects: ["person", "vehicle"]
        }
    },
    {
        id: "e3",
        caseId: "case1",
        fileName: "interview.wav",
        fileType: "audio",
        fileSize: 5200000,
        uploadedAt: "2026-01-11T18:02:00Z",
        uploadedBy: "u1",
        tags: ["interview", "witness", "testimony"],
        status: "COMPLETED",
        description: "Witness interview recording",
        extractedText: "Transcript: The witness stated that...",
        metadata: {
            duration: 320,
            transcript: "Full transcript available"
        }
    }
];

export function CaseProvider({ children }) {
    const { user, canAccessCase } = useAuth();
    const [cases, setCases] = useState([]);
    const [evidence, setEvidence] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load initial data
        const storedCases = sessionStorage.getItem("cases");
        const storedEvidence = sessionStorage.getItem("evidence");

        if (storedCases) {
            setCases(JSON.parse(storedCases));
        } else {
            setCases(INITIAL_CASES);
            sessionStorage.setItem("cases", JSON.stringify(INITIAL_CASES));
        }

        if (storedEvidence) {
            setEvidence(JSON.parse(storedEvidence));
        } else {
            setEvidence(INITIAL_EVIDENCE);
            sessionStorage.setItem("evidence", JSON.stringify(INITIAL_EVIDENCE));
        }

        setLoading(false);
    }, []);

    const saveCases = (newCases) => {
        setCases(newCases);
        sessionStorage.setItem("cases", JSON.stringify(newCases));
    };

    const saveEvidence = (newEvidence) => {
        setEvidence(newEvidence);
        sessionStorage.setItem("evidence", JSON.stringify(newEvidence));
    };

    const getAccessibleCases = () => {
        if (!user) return [];
        return cases.filter(c => canAccessCase(c));
    };

    const getCaseById = (caseId) => {
        return cases.find(c => c.id === caseId);
    };

    const getEvidenceByCase = (caseId) => {
        return evidence.filter(e => e.caseId === caseId);
    };

    const createCase = (caseData) => {
        const newCase = {
            id: `case${Date.now()}`,
            caseNumber: `2026-${String(cases.length + 1).padStart(3, '0')}-${caseData.department.toUpperCase().slice(0, 2)}`,
            status: "active",
            createdBy: user.id,
            assignedTo: [user.id],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: [],
            ...caseData
        };

        saveCases([...cases, newCase]);
        return newCase;
    };

    const updateCase = (caseId, updates) => {
        const updatedCases = cases.map(c =>
            c.id === caseId
                ? { ...c, ...updates, updatedAt: new Date().toISOString() }
                : c
        );
        saveCases(updatedCases);
    };

    const deleteCase = (caseId) => {
        saveCases(cases.filter(c => c.id !== caseId));
        // Also delete associated evidence
        saveEvidence(evidence.filter(e => e.caseId !== caseId));
    };

    const addCaseNote = (caseId, noteText) => {
        const note = {
            id: `note${Date.now()}`,
            text: noteText,
            createdBy: user.id,
            createdAt: new Date().toISOString()
        };

        const updatedCases = cases.map(c =>
            c.id === caseId
                ? { ...c, notes: [...(c.notes || []), note], updatedAt: new Date().toISOString() }
                : c
        );
        saveCases(updatedCases);
    };

    const addEvidence = (evidenceData) => {
        const newEvidence = {
            id: `e${Date.now()}`,
            uploadedBy: user.id,
            uploadedAt: new Date().toISOString(),
            status: "RECEIVED",
            tags: [],
            ...evidenceData
        };

        saveEvidence([...evidence, newEvidence]);

        // Update case timestamp
        if (evidenceData.caseId) {
            updateCase(evidenceData.caseId, {});
        }

        return newEvidence;
    };

    const updateEvidence = (evidenceId, updates) => {
        const updatedEvidence = evidence.map(e =>
            e.id === evidenceId ? { ...e, ...updates } : e
        );
        saveEvidence(updatedEvidence);
    };

    const deleteEvidence = (evidenceId) => {
        saveEvidence(evidence.filter(e => e.id !== evidenceId));
    };

    const searchEvidence = ({ query, caseId, fileType, status }) => {
        let results = evidence;

        // Filter by case access
        const accessibleCases = getAccessibleCases();
        const accessibleCaseIds = accessibleCases.map(c => c.id);
        results = results.filter(e => accessibleCaseIds.includes(e.caseId));

        if (caseId) {
            results = results.filter(e => e.caseId === caseId);
        }

        if (fileType) {
            results = results.filter(e => e.fileType === fileType);
        }

        if (status) {
            results = results.filter(e => e.status === status);
        }

        if (query) {
            const q = query.toLowerCase();
            results = results.filter(e =>
                e.fileName.toLowerCase().includes(q) ||
                e.description?.toLowerCase().includes(q) ||
                e.extractedText?.toLowerCase().includes(q) ||
                e.tags.some(tag => tag.toLowerCase().includes(q))
            );
        }

        return results;
    };

    const value = {
        cases,
        evidence,
        loading,
        getAccessibleCases,
        getCaseById,
        getEvidenceByCase,
        createCase,
        updateCase,
        deleteCase,
        addCaseNote,
        addEvidence,
        updateEvidence,
        deleteEvidence,
        searchEvidence
    };

    return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}