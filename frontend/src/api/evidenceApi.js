import { USE_MOCK } from "./config";
import * as mockEvidenceApi from "./mock/mockEvidenceApi";
import * as realEvidenceApi from "./real/realEvidenceApi";

const api = USE_MOCK ? mockEvidenceApi : realEvidenceApi;

export const getEvidence = api.getEvidence;
export const getEvidenceById = api.getEvidenceById;
export const createEvidence = api.createEvidence;
export const updateEvidence = api.updateEvidence;
export const deleteEvidence = api.deleteEvidence;
export const searchEvidence = api.searchEvidence;
export const uploadFile = api.uploadFile;