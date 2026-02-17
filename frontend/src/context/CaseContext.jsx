/**
 * CaseContext.jsx
 *
 * CHANGED:
 *   - Added reloadCases() — fetches only cases, not all evidence.
 *     Used by CasesPage on mount to avoid showing stale data.
 *   - Added deleteNote(caseId, noteId) — calls new DELETE note endpoint.
 *   - Added updateEvidenceTags(evidenceId, tags) — calls new PATCH tags endpoint.
 *   - Exposed all three in the context value.
 */
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
  const [cases,    setCases]    = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading,  setLoading]  = useState(true);

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

  // ── full reload (cases + evidence) ─────────────────────────────────────────
  async function loadData() {
    try {
      setLoading(true);
      const [casesData, evidenceData] = await Promise.all([
        caseApi.getCases(),
        evidenceApi.getEvidence(),
      ]);
      setCases(Array.isArray(casesData) ? casesData : []);
      setEvidence(Array.isArray(evidenceData) ? evidenceData : []);
    } finally {
      setLoading(false);
    }
  }

  // ── cases-only reload (used by CasesPage on mount) ─────────────────────────
  // Does NOT touch the evidence state, so evidence data isn't wiped while a
  // CaseDetailPage is open in another tab / during fast navigation.
  async function reloadCases() {
    try {
      setLoading(true);
      const casesData = await caseApi.getCases();
      setCases(Array.isArray(casesData) ? casesData : []);
    } catch (_) {
      // swallow — caller may handle
    } finally {
      setLoading(false);
    }
  }

  // ── derived state ──────────────────────────────────────────────────────────

  const accessibleCases = useMemo(() => {
    if (!user) return [];
    const all = Array.isArray(cases) ? cases : [];
    return all.filter((c) => canAccessDepartment(c.department));
  }, [cases, user, canAccessDepartment]);

  function getAccessibleCases() {
    return accessibleCases;
  }

  // ── mutations ──────────────────────────────────────────────────────────────

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
    const note = await caseApi.addCaseNote(caseId, { text });
    // Patch the local cases cache so the note appears immediately.
    setCases((prev) =>
      (prev || []).map((c) => {
        if (c.id !== caseId) return c;
        return { ...c, notes: [...(c.notes || []), note] };
      })
    );
    return note;
  }

  /**
   * Delete a single note from a case.
   * Optimistically removes from local state then persists via API.
   * On failure, triggers a full reload to restore correct state.
   */
  async function deleteNote(caseId, noteId) {
    // Optimistic local update
    setCases((prev) =>
      (prev || []).map((c) => {
        if (c.id !== caseId) return c;
        return { ...c, notes: (c.notes || []).filter((n) => n.id !== noteId) };
      })
    );
    try {
      await caseApi.deleteNote(caseId, noteId);
    } catch (err) {
      // Rollback: reload the case list so the deleted note reappears.
      await reloadCases();
      throw err;
    }
  }

  async function uploadEvidenceSas({ caseId, file, description, tags }) {
    if (!caseId) throw new Error("caseId is required");
    if (!file)   throw new Error("file is required");

    const init = await evidenceApi.uploadInit({
      caseId,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
    });

    await evidenceApi.uploadToSasUrl(init.sasUrl, file);

    const confirmed = await evidenceApi.uploadConfirm({
      evidenceId: init.evidenceId,
      caseId,
      blobPath:  init.blobPath,
      fileName:  file.name,
      fileType:  file.type || "application/octet-stream",
      description: description || "",
      tags:      tags || [],
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

  /**
   * Update the userTags array on an existing evidence record.
   * Syncs to local state and calls the backend PATCH tags endpoint.
   */
  async function updateEvidenceTags(evidenceId, tags) {
    const updated = await evidenceApi.updateEvidenceTags(evidenceId, tags);
    setEvidence((prev) =>
      (prev || []).map((e) => (e.id === evidenceId ? { ...e, ...updated } : e))
    );
    return updated;
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
    deleteNote,
    uploadEvidenceSas,
    refreshEvidenceStatus,
    deleteEvidence,
    updateEvidenceTags,
    reload:       loadData,
    reloadCases,
  };

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}
