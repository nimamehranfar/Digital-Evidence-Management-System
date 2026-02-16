import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import * as caseApi from "../api/caseApi";
import * as evidenceApi from "../api/evidenceApi";

const CaseContext = createContext();

export function useCase() {
  const context = useContext(CaseContext);
  if (!context) throw new Error("useCase must be used within CaseProvider");
  return context;
}

export function CaseProvider({ children }) {
  const { user, canAccessDepartment } = useAuth();
  const [cases, setCases] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCases([]);
      setEvidence([]);
      setLoading(false);
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadData() {
    try {
      setLoading(true);
      const [casesData, evidenceData] = await Promise.all([caseApi.getCases(), evidenceApi.getEvidence()]);
      setCases(Array.isArray(casesData) ? casesData : []);
      setEvidence(Array.isArray(evidenceData) ? evidenceData : []);
    } finally {
      setLoading(false);
    }
  }

  const accessibleCases = useMemo(() => {
    if (!user) return [];
    const all = Array.isArray(cases) ? cases : [];
    return all.filter((c) => canAccessDepartment(c.department));
  }, [cases, user, canAccessDepartment]);

  function getAccessibleCases() {
    return accessibleCases;
  }

  async function createCase(payload) {
    const created = await caseApi.createCase(payload);
    setCases((prev) => [created, ...(prev || [])]);
    return created;
  }

  async function updateCase(caseId, payload) {
    const updated = await caseApi.updateCase(caseId, payload);
    setCases((prev) => (prev || []).map((c) => (c.id === caseId ? updated : c)));
    return updated;
  }

  async function deleteCase(caseId) {
    await caseApi.deleteCase(caseId);
    setCases((prev) => (prev || []).filter((c) => c.id !== caseId));
    setEvidence((prev) => (prev || []).filter((e) => e.caseId !== caseId));
    return true;
  }

  async function addCaseNote(caseId, text) {
    return caseApi.addCaseNote(caseId, { text });
  }

  async function uploadEvidenceSas({ caseId, file, description, tags }) {
    if (!caseId) throw new Error("caseId is required");
    if (!file) throw new Error("file is required");

    // 1) upload-init
    const init = await evidenceApi.uploadInit({
      caseId,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
    });

    // 2) PUT to SAS URL (mock uses a mock scheme and will no-op)
    await evidenceApi.uploadToSasUrl(init.sasUrl, file);

    // 3) upload-confirm
    const confirmed = await evidenceApi.uploadConfirm({
      evidenceId: init.evidenceId,
      caseId,
      blobPath: init.blobPath,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      description: description || "",
      tags: tags || [],
    });

    setEvidence((prev) => [confirmed, ...(prev || [])]);

    return confirmed;
  }

  async function refreshEvidenceStatus(evidenceId) {
    return evidenceApi.getEvidenceStatus(evidenceId);
  }

  async function deleteEvidence(evidenceId) {
    await evidenceApi.deleteEvidence(evidenceId);
    setEvidence((prev) => (prev || []).filter((e) => e.id !== evidenceId));
    return true;
  }

  const value = {
    loading,
    cases,
    evidence,
    getAccessibleCases,
    createCase,
    updateCase,
    deleteCase,
    addCaseNote,
    uploadEvidenceSas,
    refreshEvidenceStatus,
    deleteEvidence,
    reload: loadData,
  };

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}
