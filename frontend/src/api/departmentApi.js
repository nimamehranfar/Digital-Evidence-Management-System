import { USE_MOCK } from "./config";
import * as mockDepartmentApi from "./mock/mockDepartmentApi";
import * as realDepartmentApi from "./real/realDepartmentApi";

const api = USE_MOCK ? mockDepartmentApi : realDepartmentApi;

export const getDepartments = api.getDepartments;
export const createDepartment = api.createDepartment;
export const updateDepartment = api.updateDepartment;
export const deleteDepartment = api.deleteDepartment;
