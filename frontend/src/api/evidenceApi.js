import { USE_MOCK } from "./config";
import * as mockEvidenceApi from "./mock/mockEvidenceApi";
import * as realEvidenceApi from "./real/realEvidenceApi";

const api = USE_MOCK ? mockEvidenceApi : realEvidenceApi;

export const uploadInit         = api.uploadInit;
export const uploadToSasUrl     = api.uploadToSasUrl;
export const uploadConfirm      = api.uploadConfirm;

export const getEvidence        = api.getEvidence;
export const getEvidenceById    = api.getEvidenceById;
export const deleteEvidence     = api.deleteEvidence;
export const getEvidenceStatus  = api.getEvidenceStatus;
export const getEvidenceReadUrl = api.getEvidenceReadUrl;
export const searchEvidence     = api.searchEvidence;
export const updateEvidenceTags = api.updateEvidenceTags;
