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
            setCases(casesData);
            setEvidence(evidenceData);
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setLoading(false);
        }
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

    const createCase = async (caseData) => {
        const newCase = await caseApi.createCase(caseData);
        setCases([...cases, newCase]);
        return newCase;
    };

    const updateCase = async (caseId, updates) => {
        const updatedCase = await caseApi.updateCase(caseId, updates);
        setCases(cases.map(c => c.id === caseId ? updatedCase : c));
        return updatedCase;
    };

    const deleteCase = async (caseId) => {
        await caseApi.deleteCase(caseId);
        setCases(cases.filter(c => c.id !== caseId));
        // Also remove associated evidence
        setEvidence(evidence.filter(e => e.caseId !== caseId));
    };

    const addCaseNote = async (caseId, noteText) => {
        const updatedCase = await caseApi.addCaseNote(caseId, noteText);
        setCases(cases.map(c => c.id === caseId ? updatedCase : c));
        return updatedCase;
    };

    const addEvidence = async (evidenceData) => {
        const newEvidence = await evidenceApi.createEvidence(evidenceData);
        setEvidence([...evidence, newEvidence]);

        // Refresh case to update timestamp
        if (evidenceData.caseId) {
            const updatedCase = await caseApi.getCase(evidenceData.caseId);
            setCases(cases.map(c => c.id === evidenceData.caseId ? updatedCase : c));
        }

        return newEvidence;
    };

    const updateEvidence = async (evidenceId, updates) => {
        const updatedEvidence = await evidenceApi.updateEvidence(evidenceId, updates);
        setEvidence(evidence.map(e => e.id === evidenceId ? updatedEvidence : e));
        return updatedEvidence;
    };

    const deleteEvidence = async (evidenceId) => {
        await evidenceApi.deleteEvidence(evidenceId);
        setEvidence(evidence.filter(e => e.id !== evidenceId));
    };

    const searchEvidence = async (filters) => {
        const results = await evidenceApi.searchEvidence(filters);
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
        searchEvidence,
        refreshData: loadData
    };

    return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}