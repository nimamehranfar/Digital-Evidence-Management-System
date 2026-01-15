const USE_MOCK = true; // change to false when backend is live

import * as mock from "./mockApi";
import * as real from "./realApi";

const api = USE_MOCK ? mock : real;

export const uploadEvidence = api.uploadEvidence;
export const searchEvidence = api.searchEvidence;
export const getStats = api.getStats;
