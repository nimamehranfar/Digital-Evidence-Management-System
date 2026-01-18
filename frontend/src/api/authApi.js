import { USE_MOCK } from "./config";
import * as mockAuthApi from "./mock/mockAuthApi";
import * as realAuthApi from "./real/realAuthApi";

const api = USE_MOCK ? mockAuthApi : realAuthApi;

export const login = api.login;
export const logout = api.logout;
export const getCurrentUser = api.getCurrentUser;
export const updateProfile = api.updateProfile;
export const getUsers = api.getUsers;

// Admin user management
export const createUser = api.createUser;
export const updateUser = api.updateUser;
export const deleteUser = api.deleteUser;

// Password management
export const changePassword = api.changePassword;