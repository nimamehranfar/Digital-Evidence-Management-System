import { USE_MOCK } from "./config";
import * as mockAuthApi from "./mock/mockAuthApi";
import * as realAuthApi from "./real/realAuthApi";

const api = USE_MOCK ? mockAuthApi : realAuthApi;
// const api = mockAuthApi

export const login = api.login;
export const logout = api.logout;
export const getCurrentUser = api.getCurrentUser;
export const updateProfile = api.updateProfile;

// Admin
export const getUsers = api.getUsers;
export const updateUser = api.updateUser;
