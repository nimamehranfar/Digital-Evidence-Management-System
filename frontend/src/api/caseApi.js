import { USE_MOCK } from "./config";
import * as mockCaseApi from "./mock/mockCaseApi";
import * as realCaseApi from "./real/realCaseApi";

const api = USE_MOCK ? mockCaseApi : realCaseApi;

export const getCases = api.getCases;
export const getCase = api.getCase;
export const createCase = api.createCase;
export const updateCase = api.updateCase;
export const deleteCase = api.deleteCase;
export const addCaseNote = api.addCaseNote;
export const deleteCaseNote = api.deleteCaseNote;