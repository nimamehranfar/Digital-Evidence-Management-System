import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import * as caseApi from "../api/caseApi";
import * as evidenceApi from "../api/evidenceApi";

const CaseContext = createContext();

export function useCase() {
    const context = useContext(CaseContext);
    if (!context) {
        throw new Error("useCase must be used within CaseProvider");
    }
    return context;
}

export function CaseProvider({ children }) {
    const { user, canAccessCase } = useAuth();
    const [cases, setCases] = useState([]);
    const [evidence, setEvidence] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [casesData, evidenceData] = await Promise.all([
                caseApi.getCases(),
                evidenceApi.getEvidence()
            ]);
            setCases(Array.isArray(casesData) ? casesData : []);
            setEvidence(Array.isArray(evidenceData) ? evidenceData : []);
        } catch (error) {
            console.error("Failed to load data:", error);
            setCases([]);
            setEvidence([]);
        } finally {
            setLoading(false);
        }
    };

    const getAccessibleCases = () => {
        if (!user) return [];
        if (!Array.isArray(cases)) return [];
        return cases.filter(c => canAccessCase(c));
    };

    const getCaseById = (caseId) => {
        if (!Array.isArray(cases)) return null;
        return cases.find(c => c.id === caseId);
    };

    const getEvidenceByCase = (caseId) => {
        if (!Array.isArray(evidence)) return [];
        return evidence.filter(e => e.caseId === caseId);
    };

    const createCase = async (caseData) => {
        const newCase = await caseApi.createCase(caseData);
        setCases(prevCases => [...(Array.isArray(prevCases) ? prevCases : []), newCase]);
        return newCase;
    };

    const updateCase = async (caseId, updates) => {
        const updatedCase = await caseApi.updateCase(caseId, updates);
        setCases(prevCases =>
            (Array.isArray(prevCases) ? prevCases : []).map(c => c.id === caseId ? updatedCase : c)
        );
        return updatedCase;
    };

    const deleteCase = async (caseId) => {
        await caseApi.deleteCase(caseId);
        setCases(prevCases => (Array.isArray(prevCases) ? prevCases : []).filter(c => c.id !== caseId));
        // Also remove associated evidence
        setEvidence(prevEvidence => (Array.isArray(prevEvidence) ? prevEvidence : []).filter(e => e.caseId !== caseId));
    };

    const addCaseNote = async (caseId, noteText) => {
        const updatedCase = await caseApi.addCaseNote(caseId, noteText);
        setCases(prevCases =>
            (Array.isArray(prevCases) ? prevCases : []).map(c => c.id === caseId ? updatedCase : c)
        );
        return updatedCase;
    };

    const deleteCaseNote = async (caseId, noteId) => {
        const updatedCase = await caseApi.deleteCaseNote(caseId, noteId);
        setCases(prevCases =>
            (Array.isArray(prevCases) ? prevCases : []).map(c => c.id === caseId ? updatedCase : c)
        );
        return updatedCase;
    };

    const addEvidence = async (evidenceData) => {
        const newEvidence = await evidenceApi.createEvidence(evidenceData);
        setEvidence(prevEvidence => [...(Array.isArray(prevEvidence) ? prevEvidence : []), newEvidence]);

        // Refresh case to update timestamp
        if (evidenceData.caseId) {
            try {
                const updatedCase = await caseApi.getCase(evidenceData.caseId);
                setCases(prevCases =>
                    (Array.isArray(prevCases) ? prevCases : []).map(c => c.id === evidenceData.caseId ? updatedCase : c)
                );
            } catch (error) {
                console.error("Failed to refresh case:", error);
            }
        }

        return newEvidence;
    };

    const updateEvidence = async (evidenceId, updates) => {
        const updatedEvidence = await evidenceApi.updateEvidence(evidenceId, updates);
        setEvidence(prevEvidence =>
            (Array.isArray(prevEvidence) ? prevEvidence : []).map(e => e.id === evidenceId ? updatedEvidence : e)
        );
        return updatedEvidence;
    };

    const deleteEvidence = async (evidenceId) => {
        await evidenceApi.deleteEvidence(evidenceId);
        setEvidence(prevEvidence => (Array.isArray(prevEvidence) ? prevEvidence : []).filter(e => e.id !== evidenceId));
    };

    const searchEvidence = async (filters) => {
        const results = await evidenceApi.searchEvidence(filters);
        return Array.isArray(results) ? results : [];
    };

    const value = {
        cases: Array.isArray(cases) ? cases : [],
        evidence: Array.isArray(evidence) ? evidence : [],
        loading,
        getAccessibleCases,
        getCaseById,
        getEvidenceByCase,
        createCase,
        updateCase,
        deleteCase,
        addCaseNote,
        deleteCaseNote,
        addEvidence,
        updateEvidence,
        deleteEvidence,
        searchEvidence,
        refreshData: loadData
    };

    return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}